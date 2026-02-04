# 🧭 Lockwood Library Wayfinder (Proto)

**Vol 1.0 • Spatial Navigation System**

A "Scientific Journal" styled wayfinding kiosk for Lockwood Library, strictly adhering to the University at Buffalo brand identity. This prototype mimics the aesthetic of an academic paper, treating navigation as a "Methodology" and "Figure" analysis.

## 📋 Overview

Users interact with a "Research Paper" interface to find destinations within the library. The application features a modular JavaScript architecture, SVG-based interactive maps ("Figure 1"), and seamless mobile handoff via QR codes.

## ✨ Features

### 🏛️ "Scientific Journal" Aesthetic
- **Visuals**: Serif typography (`Lora`, `Times`), "Paper" on "Desk" layout.
- **Brand**: Strict use of **UB Blue** (`#005bbb`), **Putnam Gray**, and **Solar Strand** accent.
- **Metaphors**: 
    - **Header**: Abstract/Title.
    - **Search**: "Methodology" / "Parameters".
    - **Map**: "Figure 1: Spatial Representation".
    - **Directions**: "Results" / "Analysis".

### 🔍 Search & Navigation
- **Fuzzy Search**: Tolerates typos and partial matches (e.g., "restrm").
- **SVG Map Integration**: Interactive Pan/Zoom map using `Panzoom` library.
- **Route Visualization**: Golden dashed lines (`Solar Strand`) animating across the floor plan.
- **Multi-Floor Support**: Seamless switching between Levels 1 and 2.

### 📱 Mobile Handoff
- **QR Code Generation**: Instantly creates a "Figure 1a" QR code for the current route.
- **Deep Linking**: Supports `?dest={ID}` parameters for immediate route loading on mobile.
- **Auto-Config**: The `launch.sh` script automatically detects the local IP to ensure QR codes work for mobile devices on the same network.

---

## 🚀 Quick Start

### Prerequisites
- Python 3 (presinstalled on most Linux/Mac systems)
- A modern web browser

### One-Step Launch
We provide a helper script to auto-configure the network address (crucial for QR codes).

```bash
cd WayfinderProto
./launch.sh
```

This will:
1. Detect your local IP address.
2. Update `app.js` configuration automatically.
3. Start a local Python HTTP server.
4. Print the Access URL (e.g., `http://10.84.X.X:3000`).

---

## 🏗️ Project Structure

Refactored into a modular ES6 architecture for maintainability.

```
WayfinderProto/
├── index.html          # Main application entry (ES Modules enabled)
├── style.css           # "Scientific Journal" Theme (UB Brand Colors)
├── app.js              # Main Orchestrator (Controller)
├── launch.sh           # Auto-config and server launch script
├── js/                 # Modular Logic
│   ├── map.js          # SVG rendering, Panzoom, & Route highlighting
│   ├── search.js       # Search algorithms & fuzzy matching
│   └── utils.js        # Helper functions (debounce, etc.)
├── assets/
│   ├── floor1.svg      # Level 1 Map Data
│   └── floor2.svg      # Level 2 Map Data
└── data/
    └── library_graph.json # Node & Path database
```

## 🎨 Design Guidelines

See [UI_DESIGN_BRIEF.md](./UI_DESIGN_BRIEF.md) for the complete style guide.

- **Primary Color**: UB Blue (`#005bbb`)
- **Accent**: Solar Strand Gold (`#ffc72c`)
- **Typography**: `Lora` (Serif) & `Open Sans` (Sans-Serif)

## 🔧 Troubleshooting

### Mobile Handoff Not Working?
- Ensure your phone and computer are on the **same Wi-Fi network**.
- Verify the IP address in the URL matches your computer's local IP.
- Use `./launch.sh` to restart and auto-correct the IP.

### Map Not Loading?
- Ensure `assets/floor1.svg` exists.
- Check the console for "Floor map not available" errors.
- **Note**: The map is styled as a "Figure" inside a white box.

---

**University at Buffalo • Department of Computer Science & Engineering**
*Prototype for CSE453*
