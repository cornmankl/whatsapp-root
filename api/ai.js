// Vercel-compatible AI module
import ZAI from 'z-ai-web-dev-sdk';
import { logger } from '../utils/logger.js';

let zai = null;

// Initialize AI
export async function initAI() {
  try {
    zai = await ZAI.create();
    logger.info('AI system initialized successfully');
    return zai;
  } catch (error) {
    logger.error('Failed to initialize AI:', error);
    throw error;
  }
}

// Get AI instance
export function getAI() {
  if (!zai) {
    throw new Error('AI not initialized');
  }
  return zai;
}

// Generate chat completion
export async function generateChatCompletion(messages, options = {}) {
  try {
    const ai = getAI();
    
    const completion = await ai.chat.completions.create({
      messages,
      ...options
    });

    return completion;
  } catch (error) {
    logger.error('Failed to generate chat completion:', error);
    throw error;
  }
}

// Generate response for WhatsApp message
export async function generateWhatsAppResponse(message, context = {}) {
  try {
    const systemPrompt = `Anda adalah asisten AI yang membantu mengelola pesan WhatsApp. 
    Berikan respons yang ramah, profesional, dan membantu dalam bahasa Indonesia.
    Jangan memberikan informasi yang berbahaya atau melanggar hukum.
    Jika pesan mengandung permintaan yang tidak pantas, tolak dengan sopan.`;

    const userPrompt = `Pesan: "${message}"
    Konteks: ${JSON.stringify(context)}
    
    Berikan respons yang sesuai untuk pesan WhatsApp ini.`;

    const completion = await generateChatCompletion([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ], {
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;
    return response || 'Maaf, saya tidak dapat merespons pesan tersebut.';
  } catch (error) {
    logger.error('Failed to generate WhatsApp response:', error);
    throw error;
  }
}

// Generate image
export async function generateImage(prompt, size = '1024x1024') {
  try {
    const ai = getAI();
    
    const response = await ai.images.generations.create({
      prompt,
      size
    });

    return response.data[0].base64;
  } catch (error) {
    logger.error('Failed to generate image:', error);
    throw error;
  }
}

// Web search
export async function webSearch(query, num = 10) {
  try {
    const ai = getAI();
    
    const searchResult = await ai.functions.invoke("web_search", {
      query,
      num
    });

    return searchResult;
  } catch (error) {
    logger.error('Failed to perform web search:', error);
    throw error;
  }
}