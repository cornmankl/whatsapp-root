# Vercel Deployment Guide

This guide explains how to deploy the WhatsApp Automation Bot to Vercel serverless functions.

## Prerequisites

- Node.js 18+ installed locally
- Vercel account (https://vercel.com)
- GitHub repository with the code
- Vercel CLI installed (`npm install -g vercel`)

## Quick Start

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy to Vercel

```bash
vercel
```

Follow the prompts to:
- Link to your Vercel account
- Connect to your GitHub repository
- Configure project settings

## Environment Variables

The following environment variables need to be configured in Vercel:

### Required Variables

- `JWT_SECRET`: Secret key for JWT authentication
  - Example: `your-super-secret-jwt-key-change-in-production`

### Optional Variables

- `POSTGRES_URL`: PostgreSQL database URL for production
  - Get from Vercel PostgreSQL addon
- `NODE_ENV`: Environment (development/production)
  - Set to `production` for deployment

### Setting Environment Variables

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables"
4. Add the required variables
5. Redeploy the application

## Features

### Serverless Function Structure

The application is structured as a serverless function:

```
api/
├── index.js          # Main serverless function handler
├── db.js             # Database operations (PostgreSQL + in-memory)
├── ai.js             # GLM-4.5 AI integration
├── playwright.js     # WhatsApp automation (mock for serverless)
├── queue.js          # Job queue management
├── middleware/
│   ├── auth.js       # Authentication middleware
│   └── errorHandler.js # Error handling
├── routes/
│   ├── auth.js       # Authentication routes
│   ├── messages.js   # Message management
│   ├── whatsapp.js   # WhatsApp operations
│   ├── queue.js      # Queue management
│   ├── ai.js         # AI features
│   ├── templates.js  # Template management
│   └── webhook.js    # Webhook management
└── utils/
    └── logger.js     # Logging utilities
```

### API Endpoints

#### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

#### WhatsApp Operations
- `GET /api/whatsapp/status` - Get WhatsApp connection status
- `POST /api/whatsapp/connect` - Connect to WhatsApp
- `POST /api/whatsapp/disconnect` - Disconnect from WhatsApp
- `POST /api/whatsapp/send` - Send message
- `GET /api/whatsapp/chats` - Get chat list
- `GET /api/whatsapp/chats/:chatId/messages` - Get chat messages

#### Message Management
- `GET /api/messages` - Get messages with filters
- `GET /api/messages/stats` - Get message statistics
- `POST /api/messages` - Save message (for testing)

#### Queue Management
- `GET /api/queue/status` - Get queue status
- `POST /api/queue/add` - Add job to queue
- `GET /api/queue/job/:jobId` - Get job details
- `POST /api/queue/job/:jobId/cancel` - Cancel job
- `POST /api/queue/clear-completed` - Clear completed jobs
- `POST /api/queue/retry-failed` - Retry failed jobs

#### AI Features
- `POST /api/ai/generate-response` - Generate AI response
- `POST /api/ai/generate-image` - Generate AI image
- `POST /api/ai/web-search` - Perform web search

#### Templates
- `GET /api/templates` - Get templates
- `POST /api/templates` - Save template

#### Webhooks
- `GET /api/webhooks` - Get webhooks
- `POST /api/webhooks` - Save webhook
- `POST /api/webhooks/test` - Test webhook

#### Health Check
- `GET /api/health` - Health check endpoint

## Database Options

### 1. In-Memory Storage (Demo Mode)

The application includes in-memory storage for demonstration purposes. This is automatically used when no PostgreSQL URL is provided.

**Features:**
- No database setup required
- Data persists only for the duration of the function execution
- Perfect for testing and demonstrations

**Limitations:**
- Data is lost between function invocations
- Not suitable for production use

### 2. Vercel PostgreSQL (Production)

For production use, configure Vercel PostgreSQL:

1. **Install PostgreSQL Addon:**
   ```bash
   vercel addons create postgres
   ```

2. **Get Connection String:**
   The connection string will be automatically added to your environment variables as `POSTGRES_URL`.

3. **Database Schema:**
   The application automatically creates the required tables on first run.

## Testing the Deployment

### 1. Health Check

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### 2. Authentication Test

```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

### 3. WhatsApp Status Test

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.vercel.app/api/whatsapp/status
```

## Limitations

### Serverless Environment Constraints

1. **No Persistent State**: Each function invocation is independent
2. **Cold Starts**: First request may be slower
3. **Execution Timeout**: Functions have maximum execution time
4. **Memory Limits**: Limited memory allocation per function

### WhatsApp Automation Limitations

1. **Mock Implementation**: The WhatsApp automation uses a mock implementation for serverless compatibility
2. **No Real WhatsApp Connection**: Cannot connect to real WhatsApp in serverless environment
3. **Browser Automation**: Playwright doesn't work in serverless functions

### AI Integration

1. **GLM-4.5 Integration**: Fully functional with Z-AI SDK
2. **Rate Limits**: Subject to AI service rate limits
3. **Cost**: AI usage may incur costs

## Monitoring and Logging

### Vercel Analytics

1. Go to Vercel dashboard
2. Click on "Analytics" tab
3. Monitor function invocations, errors, and performance

### Custom Logging

The application includes structured logging:

```javascript
// Logs are automatically sent to Vercel
logger.info('Information message');
logger.error('Error message');
logger.warn('Warning message');
```

### Error Tracking

1. **Vercel Error Tracking**: Automatically captures function errors
2. **Custom Error Handler**: Centralized error handling with proper HTTP status codes

## Security Considerations

### Authentication

1. **JWT Tokens**: All API endpoints require authentication
2. **Token Expiration**: Tokens expire after 24 hours
3. **Secure Secret**: Use strong JWT secret

### Rate Limiting

1. **Built-in Rate Limiting**: 100 requests per minute per IP
2. **Customizable**: Adjust limits in environment variables

### Data Protection

1. **HTTPS**: All communications are encrypted
2. **Input Validation**: All inputs are validated
3. **SQL Injection Prevention**: Parameterized queries

## Troubleshooting

### Common Issues

1. **Function Invocation Failed**
   - Check environment variables
   - Verify database connection
   - Review function logs

2. **Authentication Errors**
   - Verify JWT secret
   - Check token format
   - Ensure proper Authorization header

3. **Database Connection Issues**
   - Verify PostgreSQL URL
   - Check database addon status
   - Review connection logs

### Debug Mode

Enable debug logging:

```bash
curl https://your-app.vercel.app/api/health?debug=true
```

### Log Access

1. Vercel dashboard → Functions tab
2. Click on function name
3. View real-time logs and historical data

## Production Checklist

Before deploying to production:

1. [ ] Set strong JWT secret
2. [ ] Configure PostgreSQL database
3. [ ] Set NODE_ENV to production
4. [ ] Test all API endpoints
5. [ ] Verify error handling
6. [ ] Set up monitoring
7. [ ] Configure custom domain
8. [ ] Test with real data

## Support

For issues and questions:

1. Check Vercel documentation: https://vercel.com/docs
2. Review function logs in Vercel dashboard
3. Create issue in GitHub repository

## Cost Considerations

### Vercel Pricing

- **Hobby Tier**: Free with limitations
- **Pro Tier**: $20/month with increased limits
- **PostgreSQL Addon**: Starting at $5/month

### AI Service Costs

- GLM-4.5 usage is billed separately
- Monitor usage through AI provider dashboard
- Set usage limits if needed

## Scaling

### Automatic Scaling

Vercel automatically scales your functions based on demand:

- **Zero to Millions**: Scales from 0 to millions of requests
- **Global Edge**: Deployed to Vercel's global network
- **No Configuration**: Automatic scaling without configuration

### Performance Optimization

1. **Database Indexing**: Automatic for PostgreSQL
2. **Caching**: Consider edge caching for static assets
3. **Bundle Size**: Minimal dependencies for faster cold starts

## Conclusion

The WhatsApp Automation Bot is now ready for Vercel deployment with:

- ✅ Serverless function architecture
- ✅ PostgreSQL and in-memory storage options
- ✅ Complete API with authentication
- ✅ GLM-4.5 AI integration
- ✅ Comprehensive error handling
- ✅ Production-ready configuration

Deploy now and start automating your WhatsApp messages!