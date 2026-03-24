const https = require('https');
const http = require('http');

// MiniMax API configuration
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || process.env.MINIMAX_TOKEN || '';
const MINIMAX_BASE_URL = 'api.minimax.chat';
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || '';

// Text completion using MiniMax API
async function textCompletion(prompt, systemPrompt = 'You are a helpful AI assistant specialized in meeting notes.') {
  if (!MINIMAX_API_KEY) {
    throw new Error('MiniMax API key not configured. Set MINIMAX_API_KEY environment variable.');
  }

  const requestBody = {
    model: 'abab5.5-chat',
    tokens_to_generate: 1024,
    temperature: 0.7,
    messages: [
      { role: 'system', name: 'system', content: systemPrompt },
      { role: 'user', name: 'user', content: prompt }
    ]
  };

  try {
    const response = await makeRequest('/v1/text/chatcompletion_v2', requestBody);
    return response.choices?.[0]?.text || response.choices?.[0]?.messages?.[0]?.text || '';
  } catch (error) {
    console.error('MiniMax API error:', error.message);
    throw error;
  }
}

// Speech to text using MiniMax API
async function speechToText(audioBuffer, filename = 'audio.webm') {
  if (!MINIMAX_API_KEY) {
    throw new Error('MiniMax API key not configured. Set MINIMAX_API_KEY environment variable.');
  }

  // For MiniMax, we'll use a placeholder transcription
  // In production, you'd integrate with their speech recognition API
  // For now, return a mock that indicates the audio was received
  console.log(`[MiniMax] Processing audio file: ${filename} (${audioBuffer.length} bytes)`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return a placeholder - in real implementation, this would call MiniMax's ASR API
  return "Transcription would appear here. Configure MiniMax ASR API for production use.";
}

function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    
    const options = {
      hostname: MINIMAX_BASE_URL,
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const protocol = https;
    
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = {
  textCompletion,
  speechToText,
  MINIMAX_API_KEY: !!MINIMAX_API_KEY
};
