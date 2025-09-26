# WhatsApp Automation Bot - Implementation Documentation

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Express API   │    │   Playwright    │    │   BullMQ Queue  │
│   Server        │◄──►│   WhatsApp Bot  │◄──►│   System        │
│                 │    │                 │    │                 │
│ - Routes        │    │ - Browser       │    │ - Redis         │
│ - Middleware    │    │ - Automation    │    │ - Jobs          │
│ - Auth          │    │ - Monitoring    │    │ - Processing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SQLite DB     │    │   AI Module     │    │   Web Dashboard │
│                 │    │                 │    │                 │
│ - Messages      │    │ - OpenAI        │    │ - Vue.js        │
│ - Sessions     │    │ - Ollama        │    │ - TailwindCSS   │
│ - Templates    │    │ - Processing    │    │ - Management    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Message Reception**
   ```
   WhatsApp Web → Playwright → Parser → Database → Webhooks → AI
   ```

2. **Message Sending**
   ```
   API → Queue → Playwright → WhatsApp Web → Confirmation
   ```

3. **AI Processing**
   ```
   Message → AI Module → Response → Queue → Send
   ```

## Core Modules

### 1. Express Server (`index.js`)

**Purpose**: Main application entry point and API server

**Key Responsibilities**:
- Initialize all system components
- Setup Express middleware and routes
- Handle graceful shutdown
- Error handling and logging

**Configuration**:
- Environment variables
- Database initialization
- Queue system setup
- AI system initialization

**Error Handling**:
- Global error middleware
- Unhandled promise rejection
- Uncaught exception handling

### 2. WhatsApp Automation (`playwright.js`)

**Purpose**: WhatsApp Web automation using Playwright

**Key Components**:
- **Browser Management**: Chromium instance with persistent context
- **Session Handling**: QR code generation, login status monitoring
- **Message Monitoring**: DOM observation, WebSocket interception
- **Message Parsing**: Extract message data from WhatsApp interface
- **Message Sending**: Text and media message composition

**Architecture**:
```javascript
class WhatsAppBot {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.session = null;
    this.isInitialized = false;
  }
  
  async init() {
    // Initialize browser and context
    // Setup message monitoring
    // Handle authentication
  }
  
  async sendMessage(recipient, content, mediaUrl, mediaType) {
    // Send text or media messages
  }
  
  async monitorMessages() {
    // Monitor for new messages
    // Parse and emit events
  }
}
```

**Message Monitoring Strategies**:
1. **DOM Observation**: MutationObserver for chat container changes
2. **WebSocket Interception**: Override WebSocket.send to capture messages
3. **Periodic Polling**: Regular checks for new messages (fallback)

**Reconnection Logic**:
- Exponential backoff: `1000 * 2^attempt` ms (max 30s)
- Maximum retry attempts: Configurable
- Session state preservation: Browser context storage

### 3. Queue System (`queue.js`)

**Purpose**: Message queue management with BullMQ

**Architecture**:
```javascript
class QueueManager {
  constructor() {
    this.queue = new Queue('whatsapp-message-queue');
    this.worker = new Worker('whatsapp-message-queue', processJob);
  }
  
  async addMessage(messageData) {
    // Add message to queue with job options
  }
  
  async processJob(job) {
    // Process individual jobs
    // Handle retries and failures
  }
}
```

**Job Types**:
- `send_message`: Text messages
- `send_media`: Media messages (images, videos, documents)
- `send_template`: Template-based messages

**Rate Limiting**:
- Concurrency: 1 job at a time
- Delay: 1-3 seconds between sends (randomized)
- Retry logic: Exponential backoff

**Failure Handling**:
- Maximum attempts: 3
- Backoff strategy: Exponential
- Error logging and notification

### 4. AI Integration (`ai.js`)

**Purpose**: AI-powered message processing and auto-replies using GLM-4.5

**Architecture**:
```javascript
class AIProcessor {
  constructor() {
    this.zai = null;
    this.conversationHistory = new Map();
    this.config = AI_CONFIG;
  }
  
  async generateResponse(messageData) {
    // Generate AI response using GLM-4.5
    // Maintain conversation history
  }
  
  async processWithAI(messageData) {
    // Process message with AI
    // Add response to queue
  }
}
```

**Features**:
- **Conversation History**: Last 10 messages per chat
- **Context Awareness**: Chat type, sender information
- **Rate Limiting**: Configurable response delays
- **Fallback Handling**: Graceful degradation on AI failure
- **GLM-4.5 Integration**: Uses Zhipu AI's GLM-4.5 model for intelligent responses

**Configuration Options**:
- Model selection (GLM-4.5, GLM-4, GLM-3 Turbo)
- Temperature control (0.1 - 1.0)
- Max tokens (1 - 500)
- System prompts (Indonesian language support)
- Response delays

### 5. Database Layer (`db.js`)

**Purpose**: SQLite database operations with proper schema

**Schema Design**:
```sql
-- Messages table
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  message_id TEXT UNIQUE,
  chat_id TEXT,
  sender_id TEXT,
  message_type TEXT,
  content TEXT,
  timestamp DATETIME,
  is_from_me BOOLEAN,
  is_group BOOLEAN,
  media_url TEXT,
  media_type TEXT,
  media_size INTEGER,
  thumbnail_url TEXT
);

-- Sessions table
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  session_id TEXT UNIQUE,
  status TEXT,
  qr_code TEXT,
  phone_number TEXT,
  last_activity DATETIME
);

-- Queue jobs table
CREATE TABLE queue_jobs (
  id INTEGER PRIMARY KEY,
  job_id TEXT UNIQUE,
  job_type TEXT,
  status TEXT,
  recipient TEXT,
  content TEXT,
  retry_count INTEGER,
  error_message TEXT
);
```

**Database Operations**:
- **Message Operations**: Save, retrieve, search messages
- **Session Operations**: Track WhatsApp session state
- **Queue Operations**: Log job processing
- **Template Operations**: Manage message templates
- **Webhook Operations**: Store webhook configurations

**Optimizations**:
- Indexes on frequently queried columns
- Connection pooling
- Transaction support
- Data validation

### 6. Authentication (`middleware/auth.js`)

**Purpose**: API authentication and authorization

**Authentication Methods**:
- **API Key**: Simple key-based authentication
- **JWT**: Token-based authentication with expiration

**Security Features**:
- Token validation and expiration
- Role-based access control
- Request rate limiting
- Input sanitization

**Implementation**:
```javascript
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader.startsWith('Bearer ')) {
    // JWT validation
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } else if (authHeader.startsWith('ApiKey ')) {
    // API key validation
    const apiKey = authHeader.substring(7);
    if (apiKey === process.env.API_KEY) {
      req.apiKey = true;
    }
  }
  
  next();
}
```

### 7. Web Dashboard (`public/`)

**Purpose**: Browser-based management interface

**Technology Stack**:
- **Vanilla JavaScript**: No framework dependencies
- **TailwindCSS**: Utility-first CSS framework
- **Font Awesome**: Icon library
- **Fetch API**: Modern HTTP requests

**Architecture**:
```javascript
class Dashboard {
  constructor() {
    this.currentPage = 'dashboard';
    this.authToken = localStorage.getItem('jwtToken');
    this.refreshIntervals = {};
  }
  
  async initialize() {
    // Setup event listeners
    // Load initial data
    // Start refresh intervals
  }
  
  async loadPageData(page) {
    // Load page-specific data
    // Update UI components
  }
}
```

**Key Features**:
- **Session Management**: QR code display, connection status
- **Message Monitoring**: Real-time message list with search
- **Queue Management**: Job monitoring and control
- **Webhook Management**: Registration and testing
- **AI Settings**: Configuration and testing
- **Statistics**: System and message metrics

**UI Components**:
- Sidebar navigation
- Real-time status indicators
- Modal dialogs for confirmations
- Toast notifications
- Responsive design

## API Design

### RESTful Principles

The API follows RESTful conventions:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages` | Get messages |
| POST | `/api/whatsapp/send` | Send message |
| PUT | `/api/ai/config` | Update AI config |
| DELETE | `/api/webhook/:id` | Delete webhook |

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ]
}
```

### Pagination

All list endpoints support pagination:
```javascript
GET /api/messages?page=1&limit=50

Response:
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

## Security Considerations

### Authentication Security

1. **JWT Security**:
   - Strong secret keys
   - Token expiration (24 hours)
   - Secure token storage

2. **API Key Security**:
   - Environment variable storage
   - Key rotation capability
   - Usage monitoring

### Input Validation

1. **Express-validator**:
   - Schema validation
   - Type checking
   - Length limits

2. **Sanitization**:
   - HTML escaping
   - SQL injection prevention
   - XSS protection

### Rate Limiting

1. **Request Rate Limiting**:
   - 100 requests per minute
   - Sliding window algorithm
   - IP-based tracking

2. **Message Rate Limiting**:
   - 1 message per second
   - Queue-based throttling
   - Exponential backoff

### Data Protection

1. **Encryption**:
   - HTTPS in production
   - Sensitive data protection
   - Secure file storage

2. **Privacy**:
   - Anonymization options
   - Data retention policies
   - User consent mechanisms

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**:
   ```sql
   CREATE INDEX idx_messages_chat_id ON messages(chat_id);
   CREATE INDEX idx_messages_timestamp ON messages(timestamp);
   CREATE INDEX idx_queue_jobs_status ON queue_jobs(status);
   ```

2. **Connection Management**:
   - Connection pooling
   - Proper connection cleanup
   - Transaction management

### Memory Management

1. **Browser Memory**:
   - Regular browser restarts
   - Memory leak detection
   - Garbage collection

2. **Node.js Memory**:
   - Memory monitoring
   - Stream processing
   - Buffer management

### Queue Optimization

1. **Job Processing**:
   - Concurrency control
   - Retry logic optimization
   - Failed job cleanup

2. **Redis Optimization**:
   - Memory usage monitoring
   - Persistence configuration
   - Cluster setup

## Monitoring and Logging

### Logging Strategy

1. **Log Levels**:
   - ERROR: Critical errors
   - WARN: Warning conditions
   - INFO: General information
   - DEBUG: Detailed debugging

2. **Log Destinations**:
   - Console output
   - File rotation
   - Error tracking

### Monitoring Metrics

1. **System Metrics**:
   - Memory usage
   - CPU usage
   - Disk space

2. **Application Metrics**:
   - Message count
   - Queue statistics
   - AI usage
   - Error rates

### Health Checks

1. **Application Health**:
   ```javascript
   app.get('/health', (req, res) => {
     res.json({
       status: 'ok',
       timestamp: new Date().toISOString(),
       uptime: process.uptime(),
       environment: process.env.NODE_ENV
     });
   });
   ```

2. **Database Health**:
   - Connection testing
   - Query performance
   - Storage capacity

## Extension Points

### Custom Message Handlers

```javascript
// Add custom message handler
import { addMessageHandler } from './playwright.js';

function customHandler(message) {
  // Process message
  // Add custom logic
}

addMessageHandler(customHandler);
```

### Custom AI Providers

```javascript
// Extend AI module
class CustomAIProvider {
  async generateResponse(messageData) {
    // Custom AI logic
    return { content: 'Response' };
  }
}
```

### Custom Webhook Events

```javascript
// Add custom webhook events
const customEvents = [
  'message.custom',
  'session.custom',
  'ai.custom'
];
```

### Custom Database Adapters

```javascript
// Implement database interface
class CustomDatabase {
  async saveMessage(message) {
    // Custom database logic
  }
  
  async getMessages(filters) {
    // Custom retrieval logic
  }
}
```

## Testing Strategy

### Unit Testing

1. **Test Framework**: Jest
2. **Coverage**: 80% minimum
3. **Test Categories**:
   - Unit tests for individual functions
   - Integration tests for modules
   - API tests for endpoints

### Integration Testing

1. **Database Testing**:
   - In-memory SQLite
   - Test data seeding
   - Transaction testing

2. **API Testing**:
   - Supertest for HTTP requests
   - Authentication testing
   - Error handling testing

### End-to-End Testing

1. **Playwright Testing**:
   - Browser automation
   - Real WhatsApp scenarios
   - Performance testing

2. **Load Testing**:
   - High message volume
   - Concurrent users
   - Stress testing

## Deployment Strategies

### Container Deployment

1. **Docker Image**:
   - Multi-stage build
   - Alpine Linux base
   - Security scanning

2. **Docker Compose**:
   - Service orchestration
   - Network configuration
   - Volume management

### Systemd Deployment

1. **Service Configuration**:
   - Process management
   - Auto-restart policies
   - Log management

2. **System Integration**:
   - Log rotation
   - Monitoring integration
   - Backup procedures

### Cloud Deployment

1. **Platform Options**:
   - AWS ECS/EKS
   - Google Cloud Run
   - Azure Container Instances

2. **Infrastructure as Code**:
   - Terraform templates
   - CI/CD pipelines
   - Environment management

## Troubleshooting Guide

### Common Issues

1. **QR Code Issues**:
   - Check browser headless mode
   - Verify storage permissions
   - Clear browser cache

2. **Message Sending Failures**:
   - Verify WhatsApp connection
   - Check queue processing
   - Review rate limiting

3. **AI Processing Issues**:
   - Verify API key
   - Check model availability
   - Review conversation history

### Debugging Tools

1. **Browser DevTools**:
   - Console logging
   - Network monitoring
   - Memory profiling

2. **Node.js Debugging**:
   - Chrome DevTools Protocol
   - VS Code debugging
   - Core dump analysis

### Performance Analysis

1. **Memory Profiling**:
   - Heap snapshots
   - Memory leak detection
   - Garbage collection analysis

2. **Performance Monitoring**:
   - Response time tracking
   - Queue processing time
   - Database query performance

## Future Enhancements

### Planned Features

1. **Multi-Session Support**:
   - Multiple WhatsApp accounts
   - Session isolation
   - Load balancing

2. **Advanced AI Features**:
   - Multi-language support
   - Sentiment analysis
   - Intent recognition

3. **Enhanced Media Support**:
   - Video processing
   - Audio transcription
   - Image analysis

### Scalability Improvements

1. **Horizontal Scaling**:
   - Multiple instances
   - Load balancing
   - Session affinity

2. **Database Scaling**:
   - Read replicas
   - Sharding strategy
   - Connection pooling

### Integration Options

1. **Third-Party Integrations**:
   - CRM systems
   - Help desk software
   - Analytics platforms

2. **API Extensions**:
   - GraphQL support
   - Real-time updates
   - Webhook enhancements

---

This implementation documentation provides a comprehensive overview of the WhatsApp Automation Bot system architecture, components, and extension points. Use this as a reference for understanding the codebase and implementing custom features.