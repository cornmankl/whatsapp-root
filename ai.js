// GLM-4.5 AI Integration
import { ZAI } from 'z-ai-web-dev-sdk';
import { logger } from './utils/logger.js';

// AI configuration
const AI_CONFIG = {
  enabled: process.env.AI_ENABLED === 'true',
  model: process.env.AI_MODEL || 'glm-4.5',
  maxTokens: 150,
  temperature: 0.7,
  systemPrompt: process.env.AI_SYSTEM_PROMPT || 'Anda adalah asisten yang membantu. Respon dengan membantu dan ringkas.',
  responseDelay: parseInt(process.env.AI_RESPONSE_DELAY) || 5000,
  maxHistoryLength: 10
};

// Conversation history storage
const conversationHistory = new Map();

// Initialize ZAI client
let zai = null;

// Initialize AI system
export async function initAI() {
  try {
    if (!AI_CONFIG.enabled) {
      logger.info('Sistem AI dinonaktifkan');
      return true;
    }

    // Initialize ZAI client
    zai = await ZAI.create();

    // Test the connection
    const testResponse = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Anda adalah asisten yang membantu.'
        },
        {
          role: 'user',
          content: 'Halo, apakah Anda berfungsi?'
        }
      ],
      max_tokens: 10
    });

    logger.info('Sistem AI diinisialisasi dengan sukses');
    return true;
  } catch (error) {
    logger.error('Gagal menginisialisasi sistem AI:', error);
    AI_CONFIG.enabled = false;
    return false;
  }
}

// Generate AI response
export async function generateAIResponse(messageData) {
  try {
    if (!AI_CONFIG.enabled || !zai) {
      logger.debug('Sistem AI tidak diaktifkan atau tidak diinisialisasi');
      return null;
    }

    const { message, chatId, senderName, isGroup } = messageData;

    // Get conversation history
    const history = getConversationHistory(chatId);
    
    // Add user message to history
    addToConversationHistory(chatId, {
      role: 'user',
      content: message,
      senderName,
      timestamp: new Date().toISOString()
    });

    // Prepare messages for AI
    const messages = [
      { role: 'system', content: AI_CONFIG.systemPrompt },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Add context about the chat
    const contextMessage = `Ini adalah obrolan ${isGroup ? 'grup' : 'pribadi'}. Pengirim adalah ${senderName}.`;
    messages.splice(1, 0, { role: 'system', content: contextMessage });

    logger.debug('Membuat respons AI', { chatId, messageLength: message.length });

    // Generate response using ZAI
    const completion = await zai.chat.completions.create({
      messages: messages,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      logger.warn('AI mengembalikan respons kosong');
      return null;
    }

    // Add AI response to history
    addToConversationHistory(chatId, {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });

    logger.info('Respons AI dihasilkan dengan sukses', { 
      chatId, 
      responseLength: response.length 
    });

    return {
      content: response,
      confidence: completion.choices[0]?.finish_reason === 'stop' ? 1 : 0.8,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Gagal menghasilkan respons AI:', error);
    
    // Fallback response
    return {
      content: 'Maaf, saya tidak dapat merespons saat ini. Silakan coba lagi nanti.',
      confidence: 0.1,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

// Get conversation history
function getConversationHistory(chatId) {
  return conversationHistory.get(chatId) || [];
}

// Add message to conversation history
function addToConversationHistory(chatId, message) {
  if (!conversationHistory.has(chatId)) {
    conversationHistory.set(chatId, []);
  }

  const history = conversationHistory.get(chatId);
  history.push(message);

  // Limit history length
  if (history.length > AI_CONFIG.maxHistoryLength) {
    history.shift();
  }
}

// Clear conversation history
export function clearConversationHistory(chatId = null) {
  if (chatId) {
    conversationHistory.delete(chatId);
    logger.info(`Riwayat percakapan dibersihkan untuk chat: ${chatId}`);
  } else {
    conversationHistory.clear();
    logger.info('Semua riwayat percakapan dibersihkan');
  }
}

// Get AI statistics
export function getAIStatistics() {
  const stats = {
    enabled: AI_CONFIG.enabled,
    model: AI_CONFIG.model,
    totalConversations: conversationHistory.size,
    totalMessages: Array.from(conversationHistory.values())
      .reduce((total, history) => total + history.length, 0),
    configuration: {
      maxTokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      maxHistoryLength: AI_CONFIG.maxHistoryLength,
      responseDelay: AI_CONFIG.responseDelay
    }
  };

  return stats;
}

// Update AI configuration
export function updateAIConfiguration(newConfig) {
  const allowedKeys = [
    'enabled',
    'model',
    'maxTokens',
    'temperature',
    'systemPrompt',
    'responseDelay',
    'maxHistoryLength'
  ];

  allowedKeys.forEach(key => {
    if (newConfig[key] !== undefined) {
      if (key === 'enabled') {
        AI_CONFIG[key] = Boolean(newConfig[key]);
      } else if (key === 'maxTokens' || key === 'temperature' || key === 'responseDelay' || key === 'maxHistoryLength') {
        AI_CONFIG[key] = Number(newConfig[key]);
      } else {
        AI_CONFIG[key] = newConfig[key];
      }
    }
  });

  logger.info('Konfigurasi AI diperbarui', AI_CONFIG);
  return AI_CONFIG;
}

// Process message with AI (with delay)
export async function processWithAI(messageData) {
  try {
    if (!AI_CONFIG.enabled) {
      return null;
    }

    logger.info('Memproses pesan dengan AI', { chatId: messageData.chatId });

    // Add delay to simulate human response time
    if (AI_CONFIG.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, AI_CONFIG.responseDelay));
    }

    const response = await generateAIResponse(messageData);
    
    if (response && response.content) {
      logger.info('Pemrosesan AI selesai', { 
        chatId: messageData.chatId,
        responseLength: response.content.length 
      });
      
      return response;
    }

    return null;
  } catch (error) {
    logger.error('Gagal memproses pesan dengan AI:', error);
    return null;
  }
}

// Generate AI response for specific prompt
export async function generateAIResponseForPrompt(prompt, options = {}) {
  try {
    if (!AI_CONFIG.enabled || !zai) {
      throw new Error('Sistem AI tidak diaktifkan atau tidak diinisialisasi');
    }

    const messages = [
      { role: 'system', content: AI_CONFIG.systemPrompt },
      { role: 'user', content: prompt }
    ];

    const completion = await zai.chat.completions.create({
      messages: messages,
      max_tokens: options.maxTokens || AI_CONFIG.maxTokens,
      temperature: options.temperature || AI_CONFIG.temperature
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('AI mengembalikan respons kosong');
    }

    return {
      content: response,
      confidence: completion.choices[0]?.finish_reason === 'stop' ? 1 : 0.8,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Gagal menghasilkan respons AI untuk prompt:', error);
    throw error;
  }
}

// Check if AI is available
export function isAIAvailable() {
  return AI_CONFIG.enabled && zai !== null;
}

// Get AI configuration
export function getAIConfiguration() {
  return { ...AI_CONFIG };
}

// Test AI connection
export async function testAIConnection() {
  try {
    if (!AI_CONFIG.enabled || !zai) {
      return {
        success: false,
        message: 'Sistem AI tidak diaktifkan atau tidak diinisialisasi'
      };
    }

    const testResponse = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: AI_CONFIG.systemPrompt
        },
        {
          role: 'user',
          content: 'Halo, apakah Anda berfungsi?'
        }
      ],
      max_tokens: 10
    });

    return {
      success: true,
      message: 'Koneksi AI berhasil',
      response: testResponse.choices[0]?.message?.content
    };

  } catch (error) {
    logger.error('Tes koneksi AI gagal:', error);
    return {
      success: false,
      message: `Tes koneksi AI gagal: ${error.message}`
    };
  }
}

// Export AI functions
export default {
  initAI,
  generateAIResponse,
  processWithAI,
  clearConversationHistory,
  getAIStatistics,
  updateAIConfiguration,
  generateAIResponseForPrompt,
  isAIAvailable,
  getAIConfiguration,
  testAIConnection
};