#!/bin/bash

# Configuration
PORT=3000

# Detect the primary local IP address
# hostname -I provides all IPs; awk '{print $1}' takes the first one (usually the LAN IP)
IP=$(hostname -I | awk '{print $1}')

if [ -z "$IP" ]; then
    echo "Error: Could not detect local IP address."
    exit 1
fi

echo "✅ Detected Local IP: $IP"

# Update app.js with the detected IP
# We look for the line containing 'apiBaseUrl:' and replace it entirely
APP_JS="app.js"
if [ -f "$APP_JS" ]; then
    echo "🔄 Updating $APP_JS configuration..."
    # Use | as delimiter to avoid conflict with // in URL
    sed -i "s|apiBaseUrl:.*|apiBaseUrl: 'http://$IP:$PORT', // Auto-configured by launch script|" "$APP_JS"
    echo "   Running: sed -i \"s|apiBaseUrl:.*|apiBaseUrl: 'http://$IP:$PORT'...\""
else
    echo "⚠️ Warning: $APP_JS not found in current directory."
fi

echo "🚀 Starting Wayfinder Server..."
echo "👉 Dashboard URL: http://$IP:$PORT"
echo "---------------------------------------------------"

# Start the Python server
# Using unbuffered output (-u) to see logs immediately
python3 -u -m http.server $PORT
