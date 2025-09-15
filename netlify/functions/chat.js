import OpenAI from "openai";

const endpoint = "https://models.github.ai/inference";
const modelName = "openai/gpt-4o";

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'GITHUB_TOKEN environment variable is required' }),
      };
    }

    const client = new OpenAI({ baseURL: endpoint, apiKey: token });
    
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
    
    const { message, conversationHistory = [] } = requestData;
    
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Build messages array for the conversation
    const messages = [
      { role: "system", content: "You are a helpful assistant." }
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.isUser ? "user" : "assistant", 
        content: msg.content
      });
    });

    // Add current message
    messages.push({ role: "user", content: message });

    const response = await client.chat.completions.create({
      messages,
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 1000,
      model: modelName
    });

    const aiResponse = response.choices[0].message.content;
    
    if (!aiResponse) {
      throw new Error("No response from GitHub AI");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        response: aiResponse,
        conversationId: Date.now().toString(), // Simple ID for demo
        messageId: Date.now().toString()
      }),
    };
  } catch (error) {
    console.error("GitHub AI API error:", error);
    
    // Determine specific error type for better user feedback
    let statusCode = 500;
    let errorMessage = 'Failed to get response from AI';
    
    if (error.status === 401 || error.message?.includes('unauthorized')) {
      statusCode = 401;
      errorMessage = 'GitHub token is invalid or expired';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded. Please try again later';
    } else if (error.status === 503 || error.message?.includes('unavailable')) {
      statusCode = 503;
      errorMessage = 'GitHub AI service is temporarily unavailable';
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
}