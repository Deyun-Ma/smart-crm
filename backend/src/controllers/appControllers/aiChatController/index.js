const OpenAI = require('openai');

// Lazy-initialize OpenAI client so missing key doesn't crash startup
let openaiClient = null;
function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your open_ai api key') {
      return null;
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * POST /api/ai-chat/message
 * Send a message to the AI customer service assistant.
 * Requires: authenticated user (any role)
 * Body: { message: string, history?: [{role, content}] }
 */
const sendMessage = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Message is required',
      });
    }

    const client = getOpenAIClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        result: null,
        message: 'AI service is not configured. Please set OPENAI_API_KEY in settings.',
      });
    }

    // Build conversation messages
    const systemPrompt = {
      role: 'system',
      content: `You are a helpful customer service assistant for IDURAR ERP CRM system. 
You help users with questions about invoices, quotes, payments, and customer management.
Be concise, professional, and friendly. Answer in the same language the user writes in.
If you don't know something specific about their data, suggest they check the relevant section in the app.`,
    };

    const conversationHistory = history.slice(-10).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const messages = [
      systemPrompt,
      ...conversationHistory,
      { role: 'user', content: message.trim() },
    ];

    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return res.status(200).json({
      success: true,
      result: {
        message: reply,
        role: 'assistant',
      },
      message: 'AI response generated successfully',
    });
  } catch (error) {
    console.error('AI Chat error:', error.message);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Failed to get AI response. Please try again.',
    });
  }
};

/**
 * GET /api/ai-chat/status
 * Get AI chat configuration status.
 * Requires: owner role only
 */
const getStatus = async (req, res) => {
  try {
    // Only owner can view status
    if (req.admin?.role !== 'owner') {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'Access denied. Owner role required.',
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const isConfigured = !!(apiKey && apiKey !== 'your open_ai api key');

    return res.status(200).json({
      success: true,
      result: {
        isConfigured,
        model: 'gpt-3.5-turbo',
        // Never expose the actual key
        keyPreview: isConfigured ? `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}` : null,
      },
      message: 'AI chat status retrieved',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Failed to get AI status',
    });
  }
};

module.exports = {
  sendMessage,
  getStatus,
};
