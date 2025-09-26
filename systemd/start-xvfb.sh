#!/bin/bash

# Start Xvfb for headless browser
Xvfb :99 -screen 0 1280x720x24 -ac &
export DISPLAY=:99

# Wait for Xvfb to start
sleep 2

# Start the WhatsApp bot
node index.js