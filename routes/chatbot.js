const express = require('express');
const router = express.Router();
const axios = require('axios');

// @route   POST /api/chatbot/ai-response
// @desc    Get AI response for chatbot
// @access  Private
router.post('/ai-response', async (req, res) => {
  try {
    const { message, apiKey } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    let aiResponse;

    if (apiKey && apiKey.trim()) {
      try {
        // Try Hugging Face API first (free)
        if (apiKey.startsWith('hf_')) {
          const response = await axios.post(
            'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
            {
              inputs: message,
              parameters: {
                max_length: 150,
                temperature: 0.7,
                do_sample: true,
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );

          if (response.data && response.data.generated_text) {
            aiResponse = response.data.generated_text;
          } else {
            throw new Error('No response from Hugging Face');
          }
        }
        // Try OpenAI API
        else if (apiKey.startsWith('sk-')) {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful medical assistant for a college dispensary. Provide helpful, accurate medical information and guide users to appropriate services. Always recommend consulting with healthcare professionals for serious concerns.'
                },
                {
                  role: 'user',
                  content: message
                }
              ],
              max_tokens: 200,
              temperature: 0.7,
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            }
          );

          if (response.data && response.data.choices && response.data.choices[0]) {
            aiResponse = response.data.choices[0].message.content;
          } else {
            throw new Error('No response from OpenAI');
          }
        }
        // Try other free AI services
        else {
          // Cohere API (free tier)
          const response = await axios.post(
            'https://api.cohere.ai/v1/generate',
            {
              model: 'command',
              prompt: `You are a medical assistant. Respond to this medical question: ${message}`,
              max_tokens: 200,
              temperature: 0.7,
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );

          if (response.data && response.data.generations && response.data.generations[0]) {
            aiResponse = response.data.generations[0].text;
          } else {
            throw new Error('No response from Cohere');
          }
        }
      } catch (error) {
        console.error('External AI API error:', error.message);
        // Fallback to local response
        aiResponse = getLocalResponse(message);
      }
    } else {
      // Use local response
      aiResponse = getLocalResponse(message);
    }

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ message: 'Server error processing chatbot request' });
  }
});

// Local response function
const getLocalResponse = (userMessage) => {
  const message = userMessage.toLowerCase();
  
  // Medical-related responses
  if (message.includes('symptom') || message.includes('pain') || message.includes('hurt')) {
    return "I understand you're experiencing symptoms. For medical concerns, I recommend:\n1. Contact campus medical services\n2. Visit the dispensary\n3. Use the Emergency SOS feature for urgent cases\n\nWould you like me to help you book an appointment?";
  }
  
  if (message.includes('appointment') || message.includes('book')) {
    return "To book an appointment:\n1. Go to 'Book Appointment' in the menu\n2. Select a doctor\n3. Choose date and time\n4. Describe your symptoms\n\nWould you like me to guide you through this process?";
  }
  
  if (message.includes('emergency') || message.includes('urgent')) {
    return "🚨 For emergencies, please:\n1. Use the Emergency SOS feature immediately\n2. Call campus security at 911\n3. Go to the nearest medical facility\n\nYour safety is our priority!";
  }
  
  if (message.includes('prescription') || message.includes('medicine')) {
    return "For prescription-related queries:\n1. Check 'My Prescriptions' for your medication history\n2. Contact the dispensary for refills\n3. Consult with your doctor for dosage questions\n\nIs there anything specific about your medication?";
  }
  
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! I'm here to help with your medical and health-related questions. How can I assist you today?";
  }
  
  if (message.includes('help')) {
    return "I can help you with:\n• Booking appointments\n• Medical information\n• Emergency guidance\n• Prescription queries\n• General health questions\n\nWhat would you like to know?";
  }
  
  if (message.includes('fever') || message.includes('temperature')) {
    return "For fever concerns:\n1. Monitor your temperature regularly\n2. Stay hydrated and rest\n3. Use fever-reducing medication if needed\n4. Contact medical services if fever persists or is high (>102°F)\n\nWould you like to book an appointment?";
  }
  
  if (message.includes('headache') || message.includes('head pain')) {
    return "For headaches:\n1. Rest in a quiet, dark room\n2. Apply a cold compress\n3. Stay hydrated\n4. Avoid triggers like bright lights or loud noises\n5. Contact medical services if severe or persistent\n\nIs this a recurring issue?";
  }
  
  if (message.includes('stomach') || message.includes('nausea') || message.includes('vomit')) {
    return "For stomach issues:\n1. Stay hydrated with small sips of water\n2. Avoid solid foods initially\n3. Rest and avoid stress\n4. Contact medical services if symptoms worsen\n\nAre you experiencing any other symptoms?";
  }
  
  // Default responses
  const defaultResponses = [
    "I'm here to help with medical and health questions. Could you be more specific about what you need?",
    "For medical advice, I recommend consulting with our campus doctors. Would you like help booking an appointment?",
    "I can assist with appointment booking, medical information, and emergency guidance. What do you need help with?",
    "Your health is important! I can help you navigate our medical services. What's your concern?",
    "I'm a medical assistant designed to help with health-related questions. How can I assist you today?",
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

module.exports = router;
