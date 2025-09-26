// Vercel-compatible WhatsApp automation module (mock for serverless environment)
import { logger } from '../utils/logger.js';

// Mock WhatsApp session
let whatsappSession = {
  isConnected: false,
  qrCode: null,
  phoneNumber: null,
  lastActivity: null
};

// Initialize WhatsApp bot
export async function initWhatsAppBot() {
  try {
    logger.info('WhatsApp bot initialized (mock mode for serverless)');
    
    // In a real implementation, this would initialize Playwright
    // But for Vercel serverless, we'll use a mock implementation
    
    whatsappSession = {
      isConnected: false,
      qrCode: null,
      phoneNumber: null,
      lastActivity: new Date().toISOString()
    };
    
    return whatsappSession;
  } catch (error) {
    logger.error('Failed to initialize WhatsApp bot:', error);
    throw error;
  }
}

// Connect to WhatsApp
export async function connectWhatsApp() {
  try {
    logger.info('Connecting to WhatsApp (mock)');
    
    // Simulate connection process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock QR code
    whatsappSession.isConnected = true;
    whatsappSession.qrCode = 'mock-qr-code-for-demo';
    whatsappSession.phoneNumber = '+1234567890';
    whatsappSession.lastActivity = new Date().toISOString();
    
    logger.info('WhatsApp connected (mock)');
    return whatsappSession;
  } catch (error) {
    logger.error('Failed to connect to WhatsApp:', error);
    throw error;
  }
}

// Disconnect from WhatsApp
export async function disconnectWhatsApp() {
  try {
    logger.info('Disconnecting from WhatsApp (mock)');
    
    whatsappSession.isConnected = false;
    whatsappSession.qrCode = null;
    whatsappSession.lastActivity = new Date().toISOString();
    
    logger.info('WhatsApp disconnected (mock)');
    return true;
  } catch (error) {
    logger.error('Failed to disconnect from WhatsApp:', error);
    throw error;
  }
}

// Get WhatsApp status
export async function getWhatsAppStatus() {
  try {
    return {
      isConnected: whatsappSession.isConnected,
      qrCode: whatsappSession.qrCode,
      phoneNumber: whatsappSession.phoneNumber,
      lastActivity: whatsappSession.lastActivity
    };
  } catch (error) {
    logger.error('Failed to get WhatsApp status:', error);
    throw error;
  }
}

// Send message
export async function sendMessage(recipient, message, mediaUrl = null) {
  try {
    if (!whatsappSession.isConnected) {
      throw new Error('WhatsApp not connected');
    }
    
    logger.info(`Sending message to ${recipient} (mock)`);
    
    // Simulate sending message
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const messageData = {
      id: Date.now().toString(),
      recipient,
      message,
      mediaUrl,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
    
    logger.info(`Message sent to ${recipient} (mock)`);
    return messageData;
  } catch (error) {
    logger.error('Failed to send message:', error);
    throw error;
  }
}

// Get chats
export async function getChats() {
  try {
    if (!whatsappSession.isConnected) {
      throw new Error('WhatsApp not connected');
    }
    
    logger.info('Getting chats (mock)');
    
    // Mock chats data
    const chats = [
      {
        id: 'chat1',
        name: 'John Doe',
        isGroup: false,
        lastMessage: 'Hello there!',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0
      },
      {
        id: 'chat2',
        name: 'Work Group',
        isGroup: true,
        lastMessage: 'Meeting at 3 PM',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 5
      },
      {
        id: 'chat3',
        name: 'Jane Smith',
        isGroup: false,
        lastMessage: 'Thanks for the help!',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0
      }
    ];
    
    logger.info(`Retrieved ${chats.length} chats (mock)`);
    return chats;
  } catch (error) {
    logger.error('Failed to get chats:', error);
    throw error;
  }
}

// Get messages from chat
export async function getChatMessages(chatId, limit = 50) {
  try {
    if (!whatsappSession.isConnected) {
      throw new Error('WhatsApp not connected');
    }
    
    logger.info(`Getting messages from chat ${chatId} (mock)`);
    
    // Mock messages data
    const messages = [
      {
        id: 'msg1',
        chatId,
        senderId: 'user1',
        senderName: 'John Doe',
        content: 'Hello there!',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        isFromMe: false,
        isGroup: false,
        messageType: 'text'
      },
      {
        id: 'msg2',
        chatId,
        senderId: 'me',
        senderName: 'Me',
        content: 'Hi! How can I help you?',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        isFromMe: true,
        isGroup: false,
        messageType: 'text'
      },
      {
        id: 'msg3',
        chatId,
        senderId: 'user1',
        senderName: 'John Doe',
        content: 'I need some information about your services.',
        timestamp: new Date(Date.now() - 3400000).toISOString(),
        isFromMe: false,
        isGroup: false,
        messageType: 'text'
      }
    ];
    
    logger.info(`Retrieved ${messages.length} messages from chat ${chatId} (mock)`);
    return messages.slice(0, limit);
  } catch (error) {
    logger.error('Failed to get chat messages:', error);
    throw error;
  }
}

// Get QR code
export async function getQRCode() {
  try {
    return whatsappSession.qrCode;
  } catch (error) {
    logger.error('Failed to get QR code:', error);
    throw error;
  }
}

// Monitor incoming messages
export async function monitorMessages(callback) {
  try {
    logger.info('Starting message monitoring (mock)');
    
    // Simulate incoming messages every 30 seconds
    const interval = setInterval(() => {
      if (whatsappSession.isConnected) {
        const mockMessage = {
          id: Date.now().toString(),
          chatId: 'chat1',
          senderId: 'user1',
          senderName: 'John Doe',
          content: `Mock message at ${new Date().toISOString()}`,
          timestamp: new Date().toISOString(),
          isFromMe: false,
          isGroup: false,
          messageType: 'text'
        };
        
        if (callback) {
          callback(mockMessage);
        }
      }
    }, 30000);
    
    // Return function to stop monitoring
    return () => {
      clearInterval(interval);
      logger.info('Message monitoring stopped (mock)');
    };
  } catch (error) {
    logger.error('Failed to monitor messages:', error);
    throw error;
  }
}