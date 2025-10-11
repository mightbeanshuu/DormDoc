# 🤖 Free AI API Keys Guide

This guide provides information about free AI API services that can be used with the College Dispensary Management System chatbot.

## 🆓 Free AI Services

### 1. **Hugging Face (Recommended)**
- **Website**: https://huggingface.co/
- **Free Tier**: 30,000 requests/month
- **How to get API key**:
  1. Sign up at https://huggingface.co/join
  2. Go to Settings → Access Tokens
  3. Create a new token
  4. Copy the token (starts with `hf_`)

**Usage in chatbot**: Enter your Hugging Face token in the settings panel.

### 2. **OpenAI (Limited Free Tier)**
- **Website**: https://platform.openai.com/
- **Free Tier**: $5 credit (expires after 3 months)
- **How to get API key**:
  1. Sign up at https://platform.openai.com/signup
  2. Go to API Keys section
  3. Create a new secret key
  4. Copy the key (starts with `sk-`)

**Usage in chatbot**: Enter your OpenAI API key in the settings panel.

### 3. **Cohere (Free Tier)**
- **Website**: https://cohere.ai/
- **Free Tier**: 1,000 requests/month
- **How to get API key**:
  1. Sign up at https://dashboard.cohere.ai/
  2. Go to API Keys
  3. Generate a new key
  4. Copy the key

**Usage in chatbot**: Enter your Cohere API key in the settings panel.

### 4. **Anthropic Claude (Free Tier)**
- **Website**: https://console.anthropic.com/
- **Free Tier**: Limited requests
- **How to get API key**:
  1. Sign up at https://console.anthropic.com/
  2. Go to API Keys
  3. Create a new key
  4. Copy the key

### 5. **Google AI (Gemini)**
- **Website**: https://aistudio.google.com/
- **Free Tier**: 15 requests/minute
- **How to get API key**:
  1. Go to https://aistudio.google.com/
  2. Sign in with Google account
  3. Go to API Keys section
  4. Create a new key

## 🔧 Local Fallback System

The chatbot includes a built-in local response system that works without any API keys. It provides:

- **Medical guidance** for common symptoms
- **Appointment booking** assistance
- **Emergency procedures** guidance
- **Prescription information**
- **General health** advice

## 🚀 How to Use

1. **Without API Key**: The chatbot works immediately with local responses
2. **With API Key**: 
   - Click the settings icon (⚙️) in the chatbot
   - Enter your API key in the "API Key" field
   - The chatbot will use the external AI service for enhanced responses

## 💡 Tips for Better Responses

### For Medical Queries:
- Be specific about symptoms
- Mention duration of symptoms
- Ask about appointment booking
- Use emergency features for urgent cases

### Example Queries:
- "I have a headache for 2 days"
- "How do I book an appointment?"
- "I need emergency help"
- "Tell me about my prescriptions"

## 🔒 Security Notes

- API keys are stored locally in your browser
- Keys are not sent to our servers
- Use HTTPS when possible
- Rotate keys regularly

## 📊 Response Quality Comparison

| Service | Response Quality | Speed | Free Limit |
|---------|------------------|-------|------------|
| Local Fallback | Good | Fast | Unlimited |
| Hugging Face | Very Good | Medium | 30k/month |
| OpenAI | Excellent | Fast | $5 credit |
| Cohere | Good | Fast | 1k/month |

## 🆘 Troubleshooting

### Common Issues:
1. **"API key invalid"**: Check if the key is correct and active
2. **"Rate limit exceeded"**: Wait or use a different service
3. **"No response"**: The system will fallback to local responses

### Support:
- Check the service's documentation
- Verify your API key is active
- Try the local fallback system

## 🔄 Switching Between Services

You can easily switch between different AI services by:
1. Opening the settings panel
2. Changing the API key
3. The system will automatically detect the service type

## 📈 Monitoring Usage

Most services provide usage dashboards where you can:
- Monitor your API usage
- Check remaining credits
- View request history
- Set up alerts

---

**Note**: Always use these services responsibly and in accordance with their terms of service. For medical emergencies, always contact professional medical services.
