# 🧭 Lockwood Library Wayfinder

An interactive wayfinding kiosk prototype for library navigation with modern UI, dark mode support, and mobile handoff capabilities.

## 📋 Overview

This prototype demonstrates a comprehensive wayfinding solution designed for library kiosks. Users can search for destinations, view interactive floor maps with highlighted routes, follow turn-by-turn directions, and continue navigation on their mobile devices via QR code.

## ✨ Features

### 🎨 Modern Interface
- **Dark mode support** - Automatically adapts to system preferences
- **Smooth animations** - Entrance effects and micro-interactions throughout
- **Responsive design** - Works on kiosk displays and mobile devices
- **Professional SVG maps** - High-quality floor plans with theme awareness

### 🔍 Smart Search
- **Intelligent autocomplete** - Finds matches anywhere in destination names
- **Pattern recognition** - Handles room codes like "2B", "1A"
- **Fuzzy matching** - Tolerates minor typos
- **Visual highlighting** - Shows matched terms in search results

### 🗺️ Interactive Navigation
- **Route highlighting** - Animated dashed paths on floor maps
- **Multi-floor support** - Seamless navigation between floors
- **Turn-by-turn directions** - Step-by-step guidance with landmarks
- **Pan and zoom** - Interactive map exploration

### 📱 Mobile Integration
- **QR code handoff** - Continue navigation on mobile device
- **Scroll-based floor switching** - Automatic floor changes on mobile
- **Touch-friendly controls** - Optimized for mobile interaction
- **Marketing-focused QR messaging** - "Take with you" call-to-action

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge, etc.)
- Local web server (Python, Node.js, or similar)
- Network access for mobile handoff functionality

### Setup Instructions

1. **Clone or download** the project files to your local machine

2. **⚠️ IMPORTANT: Configure Network Address**
   
   Before running, you **must** update the network address in `app.js`:
   
   ```javascript
   // In app.js, line ~25
   this.config = {
       apiBaseUrl: 'http://10.84.159.205:8080', // ← Change this IP address
       // ...
   };
   ```
   
   **Why you need to change this:**
   - The current IP address (`10.84.159.205`) is specific to the original development environment
   - Each team member's local network has different IP ranges
   - For local development, use `http://localhost:8080` or `http://127.0.0.1:8080`
   - For mobile handoff to work, use your machine's local network IP (find with `ipconfig` on Windows or `ifconfig` on Mac/Linux)

3. **Start a local web server** in the project directory:

   ```bash
   # Python 3
   python -m http.server 8080
   
   # Python 2
   python -m SimpleHTTPServer 8080
   
   # Node.js (if you have http-server installed)
   npx http-server -p 8080
   
   # PHP
   php -S localhost:8080
   ```

4. **Open your browser** and navigate to:
   - `http://localhost:8080` (for local testing)
   - `http://YOUR_IP_ADDRESS:8080` (for mobile handoff functionality)

## 🏗️ Project Structure

```
Wayfinder/
├── index.html          # Main HTML structure
├── style.css           # Styling with dark mode support
├── app.js              # Core application logic
├── assets/
│   ├── floor1.svg      # Floor 1 interactive map
│   ├── floor2.svg      # Floor 2 interactive map
│   └── data.json       # Navigation data and routes
├── libs/
│   └── qrcode.min.js   # QR code generation library
└── README.md           # This file
```

## 🔧 Configuration

### Network Setup for Mobile Handoff

1. **Find your local IP address:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig | grep inet
   ```

2. **Update the IP address** in `app.js`:
   ```javascript
   apiBaseUrl: 'http://YOUR_IP_ADDRESS:8080'
   ```

3. **Enable mobile device access:**
   - Mobile devices can access via `http://YOUR_IP_ADDRESS:8080`
   - Ensure firewall allows connections on port 8080
   - All devices must be on the same local network

### Customization Options

#### Adding New Destinations
Edit `assets/data.json` to add new destinations:
```json
{
  "id": "NEW_DEST",
  "name": "New Destination",
  "type": "destination",
  "floor": 1,
  "search_keywords": ["keyword1", "keyword2"]
}
```

#### Modifying Floor Maps
- Edit `assets/floor1.svg` and `assets/floor2.svg`
- Maintain CSS class structure for dark mode compatibility
- Ensure path IDs match those referenced in route data

## 🎮 Usage Guide

### For End Users (Kiosk Interface)
1. **Search** for a destination using the search bar
2. **Select** from autocomplete suggestions
3. **View** highlighted route on the interactive map
4. **Follow** turn-by-turn directions
5. **Scan QR code** to continue on mobile device

### For Developers
- **Responsive testing**: Resize browser to test mobile behavior
- **Dark mode testing**: Toggle system dark mode to test themes
- **Route debugging**: Check browser console for route generation logs
- **SVG editing**: Use vector graphics editor for map modifications

## 🌐 Browser Support

- **Chrome/Edge**: Full support with all features
- **Firefox**: Full support with all features  
- **Safari**: Full support with all features
- **Mobile browsers**: Optimized experience with touch interactions

## 🎯 Technical Features

### Dark Mode Implementation
- CSS custom properties for theme switching
- Automatic system preference detection
- SVG-embedded CSS for map theming
- Seamless transitions between modes

### Mobile Optimization
- Intersection Observer for scroll-based navigation
- Touch-friendly interface elements
- Responsive SVG scaling
- QR code mobile handoff

### Performance Features
- Debounced search input (150ms)
- Efficient DOM element caching
- Minimal re-renders with state management
- Optimized SVG rendering

## 🔍 Troubleshooting

### Common Issues

**QR Code Not Working**
- Ensure QRCode library is loaded (`libs/qrcode.min.js`)
- Check that the target URL is accessible

**Maps Not Loading**
- Verify SVG files are in `assets/` directory
- Check browser console for loading errors
- Ensure web server has proper MIME types for SVG

**Search Not Working**
- Check that `assets/data.json` is accessible
- Verify JSON syntax is valid
- Check browser console for parsing errors

**Network Access Issues**
- Verify firewall settings allow port 8080
- Ensure all devices are on same local network
- Try different IP address or use localhost for local testing

## 👥 Team Development

### Best Practices
- Test on different screen sizes and devices
- Verify dark mode compatibility for any new features
- Maintain SVG path IDs when editing maps
- Keep route data synchronized with map changes

### Contributing
1. Make changes in a development branch
2. Test across different browsers and devices
3. Verify both light and dark mode functionality
4. Update documentation for any new features

## 📄 License

This is a prototype for internal team use. Please check with your organization's policies before external distribution.

---

**Need Help?** Contact the development team or check the browser console for debugging information.
