const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const Ambulance = require('../models/Ambulance');
const Appointment = require('../models/Appointment');

const router = express.Router();

router.use(authenticateToken);

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const systemPrompt = `You are the College Dispensary AI Assistant. You help students with their medical queries, dispensary information, and emergencies.
Key capabilities:
1. You can answer questions about the college dispensary.
2. You can help users understand if they need an ambulance based on their symptoms.
3. If a user clearly needs an ambulance and provides their location (e.g., "I'm at Hostel 1, I have severe chest pain"), you MUST use the book_ambulance function to book it for them. If they don't provide a location, ask for it first before booking.
4. You can provide previous leave details or prescription info if asked (for now, tell them you are checking their records).

Be concise, empathetic, and professional.`;

const tools = [
  {
    type: "function",
    function: {
      name: "book_ambulance",
      description: "Book an emergency ambulance for the student. Use this ONLY when the student explicitly needs an ambulance and has provided a pickup location.",
      parameters: {
        type: "object",
        properties: {
          symptoms: {
            type: "string",
            description: "The medical symptoms or reason for the ambulance"
          },
          pickupAddress: {
            type: "string",
            description: "The student's current location (e.g., Hostel 1, Block B)"
          },
          isEmergency: {
            type: "boolean",
            description: "True if it is a life-threatening emergency"
          }
        },
        required: ["symptoms", "pickupAddress", "isEmergency"]
      }
    }
  }
];

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    const studentId = req.user._id;

    // Prepend system prompt
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: apiMessages,
      tools: tools,
      tool_choice: 'auto'
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const responseMessage = response.data.choices[0].message;

    // Check if Groq wants to call a tool
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.function.name === 'book_ambulance') {
        const args = JSON.parse(toolCall.function.arguments);
        
        // Execute the booking logic internally
        const nearestAmbulances = await Ambulance.findNearestAvailable(23.4123, 85.4399, 20);
        
        if (nearestAmbulances.length > 0) {
          const ambulance = nearestAmbulances[0];
          await ambulance.assignToStudent(studentId, {
            address: args.pickupAddress,
            latitude: 23.4123,
            longitude: 85.4399
          }, { address: 'College Dispensary', latitude: 23.4140, longitude: 85.4410 });

          const appointment = new Appointment({
            student: studentId,
            appointmentDate: new Date(),
            appointmentTime: new Date().toTimeString().slice(0, 5),
            symptoms: args.symptoms,
            priority: args.isEmergency ? 10 : 5,
            queueNumber: 1,
            isEmergency: args.isEmergency,
            status: 'scheduled'
          });
          await appointment.save();

          // Send tool output back to Groq to get the final response
          apiMessages.push(responseMessage);
          apiMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: "book_ambulance",
            content: JSON.stringify({
              success: true,
              message: `Ambulance ${ambulance.vehicleNumber} has been dispatched. Driver: ${ambulance.driverName} (${ambulance.driverPhone}).`
            })
          });

          const finalResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama3-8b-8192',
            messages: apiMessages
          }, {
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          return res.json({ 
            reply: finalResponse.data.choices[0].message.content,
            actionTriggered: 'ambulance_booked',
            ambulanceDetails: { vehicleNumber: ambulance.vehicleNumber, driverName: ambulance.driverName }
          });
        } else {
          return res.json({ 
            reply: "I'm sorry, but there are no ambulances available right now. Please seek alternative transport immediately or call the emergency hotline directly." 
          });
        }
      }
    }

    res.json({ reply: responseMessage.content });
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    res.status(500).json({ reply: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later." });
  }
});

module.exports = router;
