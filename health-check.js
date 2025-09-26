#!/usr/bin/env node

import fetch from 'node-fetch';

const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health';
const TIMEOUT = 10000; // 10 seconds

async function healthCheck() {
  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      timeout: TIMEOUT
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Health check passed:', data);
      process.exit(0);
    } else {
      console.error('Health check failed:', response.status, response.statusText);
      process.exit(1);
    }
  } catch (error) {
    console.error('Health check error:', error.message);
    process.exit(1);
  }
}

// Run health check
healthCheck();