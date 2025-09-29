# WhatsApp Automation Bot

⚠️ **IMPORTANT WARNING**: This system automates WhatsApp Web, which violates WhatsApp's Terms of Service and may lead to account bans. Use only for personal/educational purposes, not commercial. Implement with caution and inform users of risks in documentation.

A production-ready WhatsApp automation bot system with API-like features powered by Playwright automation of WhatsApp Web.

## 🚀 Features

### Core Functionality
- **WhatsApp Web Automation**: Powered by Playwright for reliable browser automation
- **API-like Interface**: Send, receive, parse messages with RESTful endpoints
- **Message Handling**: Supports personal chats, group chats, reactions, and polls
- **Media Support**: Handle images, documents, voice messages, videos with thumbnails
- **Reply Queue**: Built-in queue system with throttling to prevent spam/bans
- **Authentication**: API key + JWT authentication for all endpoints
- **Web Dashboard**: Modern web interface for monitoring and management

### Advanced Features
- **AI Integration**: GLM-4.5 or local LLM support for context-aware auto-replies
- **Webhook Support**: Real-time notifications for incoming messages
- **Reliability**: Auto-reconnect logic with exponential backoff
- **Logging**: Comprehensive logging with Winston
- **Database**: SQLite persistence with optional MongoDB support
- **Docker Support**: Containerized deployment with Docker Compose

## 🛠 Technology Stack

- **Backend**: Node.js 18+ with ES modules
- **Framework**: Express.js
- **Automation**: Playwright with Chromium
- **Database**: SQLite (primary), MongoDB (optional)
- **Queue**: BullMQ with Redis
- **AI**: Z-AI SDK (GLM-4.5) or custom LLM integration
- **Frontend**: Vanilla JS with Tailwind CSS
- **Authentication**: JWT with bcrypt
- **Testing**: Jest with comprehensive test coverage

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- Redis server (for queue system)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/cornmankl/whatsapp-root.git
   cd whatsapp-root
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Create required directories**
   ```bash
   npm run prepare
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the dashboard**
   Open `http://localhost:3000/dashboard` in your browser

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Application Settings
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database Configuration
DB_PATH=./storage/database.sqlite

# Redis Configuration (for queue system)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# AI Configuration
AI_ENABLED=true
AI_API_KEY=your-ai-api-key-here
AI_MAX_TOKENS=150
AI_TEMPERATURE=0.7

# Webhook Configuration
WEBHOOK_ENABLED=false
WEBHOOK_SECRET=your-webhook-secret
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Security

```bash
# Audit dependencies
npm run security:audit

# Fix security vulnerabilities
npm run security:fix
```

## 🏗 Architecture

### Project Structure
```
whatsapp-root/
├── api/                    # Vercel serverless functions
├── middleware/             # Express middleware
├── routes/                 # API route handlers
├── utils/                  # Utility functions
├── public/                 # Web dashboard files
├── storage/                # Database and file storage
├── logs/                   # Application logs
├── __tests__/              # Test files
├── playwright.js           # WhatsApp automation logic
├── queue.js               # Message queue system
├── db.js                  # Database operations
├── ai.js                  # AI integration
└── index.js               # Main application entry
```

### Key Modules

1. **WhatsApp Automation** (`playwright.js`)
   - Browser automation with Playwright
   - Message monitoring and parsing
   - Session management
   - Auto-reconnection logic

2. **Queue System** (`queue.js`)
   - BullMQ-based message queue
   - Rate limiting and throttling
   - Retry mechanisms
   - Job processing

3. **Database Layer** (`db.js`)
   - SQLite operations
   - Message persistence
   - Session management
   - Template storage

4. **AI Integration** (`ai.js`)
   - GLM-4.5 API integration
   - Context-aware responses
   - Configurable AI behavior

## 📊 API Documentation

### Authentication
All API endpoints require authentication via JWT token:

```bash
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Send Message
```http
POST /api/whatsapp/send
Content-Type: application/json

{
  "recipient": "+1234567890",
  "content": "Hello, World!",
  "mediaUrl": "optional-media-url",
  "mediaType": "image|video|document"
}
```

#### Get Messages
```http
GET /api/messages?page=1&limit=50
```

#### Webhook Management
```http
POST /api/webhook
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["message.new", "message.sent"],
  "secret": "webhook-secret"
}
```

## 🔒 Security Features

### Input Validation
- Comprehensive input sanitization
- Phone number validation
- File type and size restrictions
- XSS protection

### Authentication & Authorization
- JWT-based authentication
- API key validation
- Rate limiting per IP
- CORS configuration

### Error Handling
- Structured error responses
- Security-focused error messages
- Comprehensive logging
- Stack trace filtering

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Vercel Deployment
The project includes Vercel-specific configurations in the `api/` directory for serverless deployment.

### Production Checklist
- [ ] Set secure JWT secret
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure Redis for production
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts

## 🔍 Monitoring & Logging

### Logging Levels
- `error`: Critical errors requiring immediate attention
- `warn`: Warning conditions
- `info`: General informational messages
- `debug`: Detailed debugging information

### Log Files
- `logs/app.log`: General application logs
- `logs/error.log`: Error-specific logs
- Console output with colored formatting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Follow security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is provided for educational purposes only. Using this software to automate WhatsApp may violate WhatsApp's Terms of Service and could result in account restrictions or bans. Use at your own risk and responsibility.

## 🆘 Support

For support, please:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information
4. Follow the issue template

## 🏆 Recent Improvements

### Security & Code Quality
- ✅ Fixed critical syntax errors in `playwright.js`
- ✅ Resolved security vulnerabilities (updated @vercel/postgres)
- ✅ Consolidated duplicate error handlers
- ✅ Added comprehensive input validation utilities
- ✅ Enhanced error handling with structured responses

### Testing & Development
- ✅ Added Jest testing framework with ES module support
- ✅ Created comprehensive test suite for utilities
- ✅ Added code coverage reporting
- ✅ Improved development scripts and workflows

### Documentation & Setup
- ✅ Created detailed environment configuration template
- ✅ Enhanced README with comprehensive setup instructions
- ✅ Added proper `.gitignore` for security and cleanup
- ✅ Created webhook utility functions

### Architecture Improvements
- ✅ Standardized import/export patterns
- ✅ Enhanced logging with structured metadata
- ✅ Improved package.json scripts for better DX
- ✅ Added proper TypeScript configuration
- **Queue**: BullMQ with Redis
- **Database**: SQLite (default) / MongoDB (optional)
- **AI**: GLM-4.5 / Ollama (local LLM)
- **Frontend**: Vanilla JavaScript + TailwindCSS
- **Container**: Docker + Docker Compose
- **Process Management**: systemd scripts included

## Quick Start

### Prerequisites
- Node.js 18+ 
- Redis (for queue system)
- Chrome/Chromium browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-automation-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Redis** (if using Docker Compose, skip this)
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or install locally
   # sudo apt-get install redis-server
   # sudo systemctl start redis
   ```

5. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

6. **Access the dashboard**
   - Open http://localhost:3000 in your browser
   - Login with your API key from .env

### Docker Deployment

1. **Using Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Dashboard: http://localhost:3000
   - API: http://localhost:3000/api

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3000
NODE_ENV=production
API_KEY=your-secret-api-key-here
JWT_SECRET=your-jwt-secret-here

# Database Configuration
DB_TYPE=sqlite
DB_PATH=./storage/database.sqlite

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI Configuration
AI_ENABLED=false
AI_MODEL=glm-4.5
AI_SYSTEM_PROMPT=Anda adalah asisten yang membantu.

# WhatsApp Bot Configuration
BROWSER_HEADLESS=true
BROWSER_STORAGE_PATH=./storage/browser
UPLOAD_PATH=./storage/uploads
MAX_FILE_SIZE=52428800
SEND_DELAY_MIN=1000
SEND_DELAY_MAX=3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## API Documentation

### Authentication

All API endpoints require authentication using either:
- **API Key**: `Authorization: ApiKey YOUR_API_KEY`
- **JWT Token**: `Authorization: Bearer YOUR_JWT_TOKEN`

### Endpoints

#### Messages
- `GET /api/messages` - Get messages with pagination and filtering
- `GET /api/messages/:id` - Get specific message
- `GET /api/messages/chat/:chatId` - Get messages by chat
- `GET /api/messages/sender/:senderId` - Get messages by sender
- `GET /api/messages/search` - Search messages
- `GET /api/messages/stats` - Get message statistics

#### WhatsApp Operations
- `POST /api/whatsapp/send` - Send message (text/media)
- `POST /api/whatsapp/send/text` - Send text message
- `POST /api/whatsapp/send/media` - Send media message
- `POST /api/whatsapp/send/template` - Send template message
- `GET /api/whatsapp/qr` - Get QR code for login
- `GET /api/whatsapp/session/status` - Get session status
- `POST /api/whatsapp/session/reconnect` - Reconnect session

#### Queue Management
- `GET /api/queue` - Get queue jobs
- `GET /api/queue/:id` - Get specific job
- `POST /api/queue/:id/retry` - Retry failed job
- `POST /api/queue/:id/cancel` - Cancel job
- `GET /api/queue/stats` - Get queue statistics
- `POST /api/queue/pause` - Pause queue processing
- `POST /api/queue/resume` - Resume queue processing
- `POST /api/queue/clean/completed` - Clean completed jobs

#### Webhooks
- `GET /api/webhook` - Get registered webhooks
- `POST /api/webhook/register` - Register new webhook
- `DELETE /api/webhook/unregister/:id` - Unregister webhook
- `POST /api/webhook/test` - Test webhook

#### Templates
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

#### AI Integration
- `GET /api/ai/stats` - Get AI statistics
- `GET /api/ai/config` - Get AI configuration
- `PUT /api/ai/config` - Update AI configuration
- `POST /api/ai/test` - Test AI connection
- `DELETE /api/ai/history` - Clear conversation history
- `POST /api/ai/generate` - Generate AI response
- `POST /api/ai/process` - Process message with AI

### Example API Usage

#### Send a Message
```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "1234567890",
    "content": "Hello from WhatsApp Bot!",
    "priority": "normal"
  }'
```

#### Get Messages
```bash
curl -X GET http://localhost:3000/api/messages?limit=10 \
  -H "Authorization: ApiKey YOUR_API_KEY"
```

#### Register Webhook
```bash
curl -X POST http://localhost:3000/api/webhook/register \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-webhook-url.com/whatsapp",
    "events": ["message.new", "message.sent"],
    "secret": "your-webhook-secret"
  }'
```

## Web Dashboard

### Features
- **Session Management**: View QR code, connection status, reconnect
- **Message Monitoring**: Real-time message display with search/filter
- **Send Messages**: Compose and send text/media/template messages
- **Queue Management**: Monitor and manage message queue
- **Webhook Management**: Register and test webhooks
- **AI Settings**: Configure AI integration and test connection
- **Statistics**: View system and message statistics

### Access
1. Navigate to `http://localhost:3000`
2. Login with your API key
3. Use the sidebar to navigate between sections

## AI Integration

### Setup
1. Enable AI in configuration:
   ```env
   AI_ENABLED=true
   AI_MODEL=glm-4.5
   ```

2. Configure AI settings:
   - Model: glm-4.5, glm-4, glm-3-turbo
   - Temperature: 0.1 - 1.0
   - Max tokens: 1 - 500
   - System prompt: Custom instructions

### Features
- **Auto-replies**: AI automatically responds to incoming messages
- **Context Awareness**: Maintains conversation history
- **Rate Limiting**: Respects response delays to appear human
- **Fallback**: Graceful handling of AI failures

## Deployment

### Production Deployment

#### Vercel Serverless Deployment (Recommended)

The application can be deployed to Vercel as a serverless function:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Configure Environment Variables**
   - `JWT_SECRET`: Your JWT secret key
   - `POSTGRES_URL`: Vercel PostgreSQL URL (optional)
   - `NODE_ENV`: `production`

4. **Access the Application**
   - API: `https://your-app.vercel.app/api`
   - Health Check: `https://your-app.vercel.app/api/health`

**Features:**
- ✅ Serverless architecture with automatic scaling
- ✅ In-memory storage for demo mode
- ✅ PostgreSQL support for production
- ✅ Complete API with authentication
- ✅ GLM-4.5 AI integration
- ✅ Mock WhatsApp automation for serverless compatibility

**Limitations:**
- ❌ Real WhatsApp connection not available in serverless
- ❌ Browser automation (Playwright) not supported
- ❌ Persistent state only with external database

For detailed Vercel deployment instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

#### Using Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

#### Manual Deployment
```bash
# Install dependencies
npm ci --only=production

# Create systemd service
sudo cp systemd/wa-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wa-bot
sudo systemctl start wa-bot

# Setup log rotation
sudo cp systemd/logrotate.conf /etc/logrotate.d/whatsapp-bot
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Considerations

⚠️ **Important Security Notes**:

1. **WhatsApp Terms of Service**: This automation violates WhatsApp's ToS
2. **Account Risk**: Use at your own risk - account bans are possible
3. **API Security**: Always use HTTPS in production
4. **Rate Limiting**: Configure appropriate rate limits
5. **Input Validation**: All inputs are validated and sanitized
6. **Authentication**: Never expose API keys in client-side code

### Monitoring

#### Health Checks
```bash
curl http://localhost:3000/health
```

#### Logs
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- System logs: `journalctl -u wa-bot`

#### Metrics
- Message count
- Queue statistics
- AI usage
- Connection status

## Development

### Project Structure
```
whatsapp-automation-bot/
├── index.js              # Main server
├── package.json          # Dependencies
├── .env.example          # Environment template
├── playwright.js         # WhatsApp automation
├── queue.js             # Queue management
├── ai.js                # AI integration
├── db.js                # Database wrapper
├── middleware/          # Express middleware
├── routes/              # API routes
├── utils/               # Utility functions
├── public/              # Web dashboard
├── storage/             # Data storage
├── systemd/             # System service files
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose
└── README.md           # This file
```

### Development Setup
```bash
# Install development dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- messageRoutes.test.js

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

#### QR Code Not Appearing
- Check browser is running in headless mode
- Verify storage directory permissions
- Check logs for errors

#### Messages Not Sending
- Verify WhatsApp connection status
- Check queue processing
- Review rate limiting settings

#### AI Not Responding
- Verify OpenAI API key
- Check AI is enabled in configuration
- Review conversation history

#### High Memory Usage
- Restart browser session
- Clear conversation history
- Check for memory leaks

### Log Analysis
```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View system logs
journalctl -u wa-bot -f
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

⚠️ **This tool is for educational and personal use only.** 

- It violates WhatsApp's Terms of Service
- Commercial use is strictly prohibited
- Users are responsible for any account bans
- Developers are not liable for misuse

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the logs for error details

---

**Remember: With great power comes great responsibility. Use this tool ethically and responsibly.**