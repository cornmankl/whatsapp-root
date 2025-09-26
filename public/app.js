// Global variables
let authToken = localStorage.getItem('jwtToken');
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');
let currentPage = 'dashboard';
let refreshIntervals = {};

// API Base URL
const API_BASE = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize application
function initializeApp() {
    // Check authentication
    if (!authToken) {
        window.location.href = '/login';
        return;
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboardData();
    
    // Start refresh intervals
    startRefreshIntervals();
    
    // Update current time
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            navigateToPage(page);
        });
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Session page buttons
    document.getElementById('refreshQRBtn').addEventListener('click', refreshQRCode);
    document.getElementById('reconnectBtn').addEventListener('click', reconnectSession);
    
    // Send message form
    document.getElementById('sendMessageForm').addEventListener('submit', sendMessage);
    document.getElementById('messageType').addEventListener('change', handleMessageTypeChange);
    
    // Queue management buttons
    document.getElementById('pauseQueueBtn').addEventListener('click', pauseQueue);
    document.getElementById('resumeQueueBtn').addEventListener('click', resumeQueue);
    document.getElementById('cleanQueueBtn').addEventListener('click', cleanQueue);
    
    // Webhook form
    document.getElementById('addWebhookForm').addEventListener('submit', addWebhook);
    
    // AI configuration form
    document.getElementById('aiConfigForm').addEventListener('submit', saveAIConfig);
    document.getElementById('aiTemperature').addEventListener('input', updateTemperatureValue);
    document.getElementById('testAIBtn').addEventListener('click', testAI);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearAIHistory);
    
    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    
    // Search and filter
    document.getElementById('searchMessages').addEventListener('input', debounce(searchMessages, 500));
    document.getElementById('filterMessages').addEventListener('change', filterMessages);
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

// Navigate to page
function navigateToPage(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
        p.classList.add('hidden');
    });
    
    // Show selected page
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.classList.remove('hidden');
    }
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'session': 'Session',
        'messages': 'Messages',
        'send': 'Send Message',
        'queue': 'Queue',
        'webhooks': 'Webhooks',
        'ai': 'AI Settings'
    };
    
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('bg-gray-100');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('bg-gray-100');
        }
    });
    
    currentPage = page;
    
    // Load page-specific data
    loadPageData(page);
}

// Load page-specific data
function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'session':
            loadSessionData();
            break;
        case 'messages':
            loadMessagesData();
            break;
        case 'queue':
            loadQueueData();
            break;
        case 'webhooks':
            loadWebhooksData();
            break;
        case 'ai':
            loadAIData();
            break;
    }
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(API_BASE + endpoint, mergedOptions);
        
        if (response.status === 401) {
            // Token expired, redirect to login
            logout();
            return null;
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API request error:', error);
        showToast('Network error. Please try again.', 'error');
        return null;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load message statistics
        const messagesResponse = await apiRequest('/messages/stats');
        if (messagesResponse && messagesResponse.success) {
            const stats = messagesResponse.data;
            document.getElementById('totalMessages').textContent = stats.total_messages || 0;
        }
        
        // Load queue statistics
        const queueResponse = await apiRequest('/queue/stats');
        if (queueResponse && queueResponse.success) {
            const stats = queueResponse.data;
            document.getElementById('queueCompleted').textContent = stats.completed || 0;
            document.getElementById('queuePending').textContent = stats.waiting || 0;
            document.getElementById('queueFailed').textContent = stats.failed || 0;
        }
        
        // Load recent messages
        const recentMessagesResponse = await apiRequest('/messages?limit=5');
        if (recentMessagesResponse && recentMessagesResponse.success) {
            displayRecentMessages(recentMessagesResponse.data);
        }
        
        // Load session status
        loadSessionStatus();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Display recent messages
function displayRecentMessages(messages) {
    const container = document.getElementById('recentMessages');
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No messages found</p>';
        return;
    }
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        container.appendChild(messageElement);
    });
}

// Create message element
function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'p-4 border rounded-lg hover:bg-gray-50 fade-in';
    
    const isSent = message.is_from_me;
    const messageType = message.message_type || 'text';
    
    div.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center mb-2">
                    <span class="font-medium text-gray-900">${message.sender_name}</span>
                    ${message.is_group ? '<i class="fas fa-users text-gray-400 ml-2"></i>' : ''}
                </div>
                <p class="text-sm text-gray-600 mb-1">${message.content || (messageType === 'media' ? 'Media message' : 'No content')}</p>
                <div class="flex items-center text-xs text-gray-500">
                    <i class="fas fa-${isSent ? 'check' : 'reply'} mr-1"></i>
                    <span>${formatDate(message.timestamp)}</span>
                    ${messageType === 'media' ? `<span class="ml-2"><i class="fas fa-${getMediaIcon(message.media_type)}"></i> ${message.media_type}</span>` : ''}
                </div>
            </div>
            <div class="ml-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isSent ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    ${isSent ? 'Sent' : 'Received'}
                </span>
            </div>
        </div>
    `;
    
    return div;
}

// Get media icon
function getMediaIcon(mediaType) {
    const icons = {
        'image': 'image',
        'video': 'video',
        'audio': 'music',
        'document': 'file',
        'sticker': 'smile',
        'contact': 'address-card'
    };
    return icons[mediaType] || 'file';
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        return Math.floor(diff / 60000) + 'm ago';
    } else if (diff < 86400000) { // Less than 1 day
        return Math.floor(diff / 3600000) + 'h ago';
    } else {
        return date.toLocaleDateString();
    }
}

// Load session data
async function loadSessionData() {
    try {
        const response = await apiRequest('/session');
        if (response && response.success) {
            const session = response.data;
            updateSessionDisplay(session);
        }
        
        // Load QR code
        loadQRCode();
    } catch (error) {
        console.error('Error loading session data:', error);
    }
}

// Update session display
function updateSessionDisplay(session) {
    const statusIndicator = document.getElementById('sessionStatusIndicator');
    const statusText = document.getElementById('sessionStatusText');
    const lastActivity = document.getElementById('lastActivity');
    
    // Update status
    statusIndicator.className = `status-indicator status-${session.status}`;
    statusText.textContent = session.status.replace('_', ' ').toUpperCase();
    
    // Update last activity
    if (session.last_activity) {
        lastActivity.textContent = formatDate(session.last_activity);
    }
}

// Load QR code
async function loadQRCode() {
    try {
        const response = await apiRequest('/qr');
        if (response && response.success) {
            const qrCode = response.data;
            displayQRCode(qrCode);
        }
    } catch (error) {
        console.error('Error loading QR code:', error);
    }
}

// Display QR code
function displayQRCode(qrCode) {
    const container = document.getElementById('qrCodeContainer');
    
    if (qrCode) {
        container.innerHTML = `<img src="${qrCode}" alt="QR Code" class="max-w-full h-auto">`;
    } else {
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-qrcode text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">QR code will appear here</p>
            </div>
        `;
    }
}

// Refresh QR code
async function refreshQRCode() {
    showToast('Refreshing QR code...', 'info');
    await loadQRCode();
}

// Reconnect session
async function reconnectSession() {
    showToast('Reconnecting session...', 'info');
    
    try {
        const response = await apiRequest('/session/reconnect', { method: 'POST' });
        if (response && response.success) {
            showToast('Session reconnected successfully', 'success');
            loadSessionData();
        } else {
            showToast('Failed to reconnect session', 'error');
        }
    } catch (error) {
        console.error('Error reconnecting session:', error);
        showToast('Error reconnecting session', 'error');
    }
}

// Load messages data
async function loadMessagesData() {
    try {
        const response = await apiRequest('/messages?limit=20');
        if (response && response.success) {
            displayMessages(response.data);
        }
    } catch (error) {
        console.error('Error loading messages data:', error);
    }
}

// Display messages
function displayMessages(messages) {
    const container = document.getElementById('messagesList');
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No messages found</p>';
        return;
    }
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        container.appendChild(messageElement);
    });
}

// Handle message type change
function handleMessageTypeChange() {
    const messageType = document.getElementById('messageType').value;
    
    // Hide all sections
    document.getElementById('textMessageSection').classList.add('hidden');
    document.getElementById('mediaMessageSection').classList.add('hidden');
    document.getElementById('templateSection').classList.add('hidden');
    
    // Show selected section
    switch (messageType) {
        case 'text':
            document.getElementById('textMessageSection').classList.remove('hidden');
            break;
        case 'media':
            document.getElementById('mediaMessageSection').classList.remove('hidden');
            break;
        case 'template':
            document.getElementById('templateSection').classList.remove('hidden');
            loadTemplates();
            break;
    }
}

// Load templates
async function loadTemplates() {
    try {
        const response = await apiRequest('/templates');
        if (response && response.success) {
            const select = document.getElementById('templateSelect');
            select.innerHTML = '<option value="">Choose a template...</option>';
            
            response.data.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                select.appendChild(option);
            });
            
            // Add change listener
            select.addEventListener('change', function() {
                const template = response.data.find(t => t.id == this.value);
                if (template) {
                    document.getElementById('templatePreviewText').textContent = template.content;
                    document.getElementById('templatePreview').classList.remove('hidden');
                } else {
                    document.getElementById('templatePreview').classList.add('hidden');
                }
            });
        }
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Send message
async function sendMessage(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const messageType = document.getElementById('messageType').value;
    
    let messageData = {
        recipient: document.getElementById('recipient').value
    };
    
    switch (messageType) {
        case 'text':
            messageData.content = document.getElementById('messageContent').value;
            break;
        case 'media':
            // Handle media upload (simplified)
            const mediaFile = document.getElementById('mediaFile').files[0];
            if (mediaFile) {
                messageData.mediaUrl = URL.createObjectURL(mediaFile);
                messageData.mediaType = mediaFile.type;
                messageData.content = document.getElementById('mediaCaption').value;
            }
            break;
        case 'template':
            const templateId = document.getElementById('templateSelect').value;
            messageData.templateId = templateId;
            break;
    }
    
    try {
        showToast('Sending message...', 'info');
        
        const response = await apiRequest('/send', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
        
        if (response && response.success) {
            showToast('Message sent successfully', 'success');
            e.target.reset();
        } else {
            showToast('Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error sending message', 'error');
    }
}

// Load queue data
async function loadQueueData() {
    try {
        const response = await apiRequest('/queue');
        if (response && response.success) {
            displayQueueJobs(response.data);
        }
    } catch (error) {
        console.error('Error loading queue data:', error);
    }
}

// Display queue jobs
function displayQueueJobs(jobs) {
    const container = document.getElementById('queueList');
    container.innerHTML = '';
    
    if (jobs.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No queue jobs found</p>';
        return;
    }
    
    jobs.forEach(job => {
        const jobElement = createQueueJobElement(job);
        container.appendChild(jobElement);
    });
}

// Create queue job element
function createQueueJobElement(job) {
    const div = document.createElement('div');
    div.className = 'p-4 border rounded-lg hover:bg-gray-50 fade-in';
    
    const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'active': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
        'failed': 'bg-red-100 text-red-800',
        'cancelled': 'bg-gray-100 text-gray-800'
    };
    
    div.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center mb-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-800'}">
                        ${job.status}
                    </span>
                    <span class="ml-2 text-sm text-gray-500">${job.job_type}</span>
                </div>
                <p class="text-sm text-gray-600 mb-1">Recipient: ${job.recipient}</p>
                ${job.content ? `<p class="text-sm text-gray-500 mb-1">${job.content}</p>` : ''}
                <div class="flex items-center text-xs text-gray-500">
                    <span>${formatDate(job.created_at)}</span>
                    ${job.retry_count > 0 ? `<span class="ml-2">Retries: ${job.retry_count}</span>` : ''}
                </div>
            </div>
            <div class="ml-4 flex space-x-2">
                ${job.status === 'failed' ? `
                    <button onclick="retryJob('${job.job_id}')" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-redo"></i>
                    </button>
                ` : ''}
                <button onclick="cancelJob('${job.job_id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// Queue management functions
async function pauseQueue() {
    try {
        const response = await apiRequest('/queue/pause', { method: 'POST' });
        if (response && response.success) {
            showToast('Queue paused successfully', 'success');
            loadQueueData();
        }
    } catch (error) {
        console.error('Error pausing queue:', error);
        showToast('Error pausing queue', 'error');
    }
}

async function resumeQueue() {
    try {
        const response = await apiRequest('/queue/resume', { method: 'POST' });
        if (response && response.success) {
            showToast('Queue resumed successfully', 'success');
            loadQueueData();
        }
    } catch (error) {
        console.error('Error resuming queue:', error);
        showToast('Error resuming queue', 'error');
    }
}

async function cleanQueue() {
    try {
        const response = await apiRequest('/queue/clean/completed', { method: 'POST' });
        if (response && response.success) {
            showToast(`Cleaned ${response.deleted} completed jobs`, 'success');
            loadQueueData();
        }
    } catch (error) {
        console.error('Error cleaning queue:', error);
        showToast('Error cleaning queue', 'error');
    }
}

async function retryJob(jobId) {
    try {
        const response = await apiRequest(`/queue/${jobId}/retry`, { method: 'POST' });
        if (response && response.success) {
            showToast('Job retried successfully', 'success');
            loadQueueData();
        }
    } catch (error) {
        console.error('Error retrying job:', error);
        showToast('Error retrying job', 'error');
    }
}

async function cancelJob(jobId) {
    try {
        const response = await apiRequest(`/queue/${jobId}/cancel`, { method: 'POST' });
        if (response && response.success) {
            showToast('Job cancelled successfully', 'success');
            loadQueueData();
        }
    } catch (error) {
        console.error('Error cancelling job:', error);
        showToast('Error cancelling job', 'error');
    }
}

// Load webhooks data
async function loadWebhooksData() {
    try {
        const response = await apiRequest('/webhook');
        if (response && response.success) {
            displayWebhooks(response.data);
        }
    } catch (error) {
        console.error('Error loading webhooks data:', error);
    }
}

// Display webhooks
function displayWebhooks(webhooks) {
    const container = document.getElementById('webhookList');
    container.innerHTML = '';
    
    if (webhooks.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">No webhooks registered</p>';
        return;
    }
    
    webhooks.forEach(webhook => {
        const webhookElement = createWebhookElement(webhook);
        container.appendChild(webhookElement);
    });
}

// Create webhook element
function createWebhookElement(webhook) {
    const div = document.createElement('div');
    div.className = 'p-4 border rounded-lg hover:bg-gray-50 fade-in';
    
    div.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <h4 class="font-medium text-gray-900 mb-1">${webhook.url}</h4>
                <div class="flex flex-wrap gap-1 mb-2">
                    ${webhook.events.map(event => `
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${event}
                        </span>
                    `).join('')}
                </div>
                <div class="flex items-center text-xs text-gray-500">
                    <span>${formatDate(webhook.created_at)}</span>
                    <span class="mx-2">•</span>
                    <span class="inline-flex items-center">
                        <span class="w-2 h-2 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-red-500'} mr-1"></span>
                        ${webhook.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
            <div class="ml-4">
                <button onclick="deleteWebhook('${webhook.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// Add webhook
async function addWebhook(e) {
    e.preventDefault();
    
    const events = Array.from(document.querySelectorAll('.webhook-event:checked'))
        .map(checkbox => checkbox.value);
    
    const webhookData = {
        url: document.getElementById('webhookUrl').value,
        events: events,
        secret: document.getElementById('webhookSecret').value
    };
    
    try {
        showToast('Adding webhook...', 'info');
        
        const response = await apiRequest('/webhook/register', {
            method: 'POST',
            body: JSON.stringify(webhookData)
        });
        
        if (response && response.success) {
            showToast('Webhook added successfully', 'success');
            e.target.reset();
            loadWebhooksData();
        } else {
            showToast('Failed to add webhook', 'error');
        }
    } catch (error) {
        console.error('Error adding webhook:', error);
        showToast('Error adding webhook', 'error');
    }
}

// Delete webhook
async function deleteWebhook(webhookId) {
    if (!confirm('Are you sure you want to delete this webhook?')) {
        return;
    }
    
    try {
        const response = await apiRequest(`/webhook/unregister/${webhookId}`, { method: 'DELETE' });
        if (response && response.success) {
            showToast('Webhook deleted successfully', 'success');
            loadWebhooksData();
        } else {
            showToast('Failed to delete webhook', 'error');
        }
    } catch (error) {
        console.error('Error deleting webhook:', error);
        showToast('Error deleting webhook', 'error');
    }
}

// Load AI data
async function loadAIData() {
    try {
        const response = await apiRequest('/ai/stats');
        if (response && response.success) {
            updateAIDisplay(response.data);
        }
        
        // Load AI configuration
        const configResponse = await apiRequest('/ai/config');
        if (configResponse && configResponse.success) {
            updateAIConfigForm(configResponse.data);
        }
    } catch (error) {
        console.error('Error loading AI data:', error);
    }
}

// Update AI display
function updateAIDisplay(data) {
    document.getElementById('aiActiveConversations').textContent = data.totalConversations || 0;
    document.getElementById('aiTotalMessages').textContent = data.totalMessages || 0;
    
    const statusIndicator = document.getElementById('aiConnectionStatus');
    const statusText = document.getElementById('aiConnectionText');
    
    if (data.enabled) {
        statusIndicator.className = 'status-indicator status-connected';
        statusText.textContent = 'Connected';
    } else {
        statusIndicator.className = 'status-indicator status-disconnected';
        statusText.textContent = 'Disabled';
    }
}

// Update AI configuration form
function updateAIConfigForm(config) {
    document.getElementById('aiEnabled').checked = config.enabled;
    document.getElementById('aiModel').value = config.model;
    document.getElementById('aiMaxTokens').value = config.maxTokens;
    document.getElementById('aiTemperature').value = config.temperature;
    document.getElementById('aiSystemPrompt').value = config.systemPrompt;
    updateTemperatureValue();
}

// Update temperature value display
function updateTemperatureValue() {
    const temperature = document.getElementById('aiTemperature').value;
    document.getElementById('aiTemperatureValue').textContent = temperature;
}

// Save AI configuration
async function saveAIConfig(e) {
    e.preventDefault();
    
    const config = {
        enabled: document.getElementById('aiEnabled').checked,
        model: document.getElementById('aiModel').value,
        maxTokens: parseInt(document.getElementById('aiMaxTokens').value),
        temperature: parseFloat(document.getElementById('aiTemperature').value),
        systemPrompt: document.getElementById('aiSystemPrompt').value
    };
    
    try {
        showToast('Saving AI configuration...', 'info');
        
        const response = await apiRequest('/ai/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
        
        if (response && response.success) {
            showToast('AI configuration saved successfully', 'success');
            loadAIData();
        } else {
            showToast('Failed to save AI configuration', 'error');
        }
    } catch (error) {
        console.error('Error saving AI configuration:', error);
        showToast('Error saving AI configuration', 'error');
    }
}

// Test AI connection
async function testAI() {
    showToast('Testing AI connection...', 'info');
    
    try {
        const response = await apiRequest('/ai/test', { method: 'POST' });
        if (response && response.success) {
            showToast('AI connection test successful', 'success');
            showModal('AI Test Result', `<p><strong>Status:</strong> ${response.data.status}</p><p><strong>Response:</strong> ${response.data.response}</p>`);
        } else {
            showToast('AI connection test failed', 'error');
        }
    } catch (error) {
        console.error('Error testing AI connection:', error);
        showToast('Error testing AI connection', 'error');
    }
}

// Clear AI history
async function clearAIHistory() {
    if (!confirm('Are you sure you want to clear all conversation history?')) {
        return;
    }
    
    try {
        const response = await apiRequest('/ai/history', { method: 'DELETE' });
        if (response && response.success) {
            showToast('Conversation history cleared successfully', 'success');
            loadAIData();
        } else {
            showToast('Failed to clear conversation history', 'error');
        }
    } catch (error) {
        console.error('Error clearing AI history:', error);
        showToast('Error clearing conversation history', 'error');
    }
}

// Load session status
async function loadSessionStatus() {
    try {
        const response = await apiRequest('/session/status');
        if (response && response.success) {
            updateConnectionStatus(response.data.status);
        }
    } catch (error) {
        console.error('Error loading session status:', error);
    }
}

// Update connection status
function updateConnectionStatus(status) {
    const statusIndicator = document.getElementById('connectionStatus');
    const statusText = document.getElementById('connectionText');
    
    statusIndicator.className = `status-indicator status-${status}`;
    statusText.textContent = status.replace('_', ' ').toUpperCase();
}

// Start refresh intervals
function startRefreshIntervals() {
    // Clear existing intervals
    Object.values(refreshIntervals).forEach(interval => {
        clearInterval(interval);
    });
    
    // Dashboard refresh
    refreshIntervals.dashboard = setInterval(() => {
        if (currentPage === 'dashboard') {
            loadDashboardData();
        }
    }, 30000); // 30 seconds
    
    // Session status refresh
    refreshIntervals.session = setInterval(() => {
        loadSessionStatus();
    }, 10000); // 10 seconds
    
    // Queue refresh
    refreshIntervals.queue = setInterval(() => {
        if (currentPage === 'queue') {
            loadQueueData();
        }
    }, 15000); // 15 seconds
}

// Update current time
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    document.getElementById('currentTime').textContent = `${dateString} ${timeString}`;
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-lg text-white fade-in ${getToastClass(type)}`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${getToastIcon(type)} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Get toast class
function getToastClass(type) {
    const classes = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'warning': 'bg-yellow-500',
        'info': 'bg-blue-500'
    };
    return classes[type] || 'bg-gray-500';
}

// Get toast icon
function getToastIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// Show modal
function showModal(title, content, actions = []) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');
    
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    modalActions.innerHTML = '';
    
    actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `px-4 py-2 rounded-lg ${action.class || 'bg-gray-600 text-white hover:bg-gray-700'}`;
        button.textContent = action.text;
        button.onclick = action.action;
        modalActions.appendChild(button);
    });
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Logout
function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function searchMessages() {
    const searchTerm = document.getElementById('searchMessages').value;
    console.log('Searching messages:', searchTerm);
    // Implement search functionality
}

function filterMessages() {
    const filter = document.getElementById('filterMessages').value;
    console.log('Filtering messages:', filter);
    // Implement filter functionality
}

// Make functions globally available
window.retryJob = retryJob;
window.cancelJob = cancelJob;
window.deleteWebhook = deleteWebhook;