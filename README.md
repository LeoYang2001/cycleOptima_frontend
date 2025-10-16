# CycleOptima - Washing Machine Control System

## Overview

CycleOptima is a comprehensive washing machine control system that provides an intuitive interface for creating, managing, and monitoring washing cycles. The system consists of a modern web application frontend that communicates with hardware controllers to manage washing machine operations in real-time.

## Key Features

### 🎯 **Cycle Management**
- Create and edit washing cycles with multiple phases
- Visual timeline editor for cycle configuration
- Component library with pre-built washing machine parts
- Local and server-based cycle storage
- Import/export cycles via JSON files

### 📊 **Real-Time Monitoring**
- Live system monitoring dashboard
- Sensor data visualization (flow, pressure, temperature)
- Component status tracking (valves, pumps, motors)
- Test data logging with CSV export
- Phase progression tracking

### 🔧 **Phase Editor**
- Drag-and-drop component placement
- Visual timeline editing
- Sensor trigger configuration
- Motor pattern customization
- Real-time preview capabilities

### 🤖 **AI Assistant**
- Intelligent cycle optimization suggestions
- Natural language cycle creation
- Performance analysis and recommendations

## Technology Stack & Skills Demonstrated

### **Frontend Development**
- **React 18** with TypeScript for type-safe component development
- **Redux Toolkit** for state management and API integration
- **React Router** for single-page application navigation
- **Custom Components** with modern CSS styling

### **User Interface Design**
- **Responsive Design** that works across desktop and mobile devices
- **Drag & Drop Interface** using React DnD Kit
- **Real-time Data Visualization** with custom charts and graphs
- **Modern UI/UX** with dark theme and intuitive controls

### **Data Management**
- **Local Storage** for offline cycle management
- **RESTful API Integration** for server communication
- **WebSocket Connections** for real-time monitoring
- **CSV Export** functionality for test data analysis

### **System Integration**
- **Hardware Communication** via WebSocket protocols
- **Sensor Data Processing** in real-time
- **Component Control** for washing machine hardware
- **Error Handling & Recovery** for robust operation

### **Development Practices**
- **TypeScript** for enhanced code quality and maintainability
- **Component-Based Architecture** for scalable development
- **State Management Patterns** using Redux
- **Responsive Design Principles** for cross-device compatibility

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Frontend  │◄──►│   Backend API    │◄──►│ Hardware Controller│
│   (React App)   │    │   (Node.js)      │    │  (Raspberry Pi)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Local Storage   │    │    Database      │    │ Washing Machine │
│ (Browser)       │    │   (MongoDB)      │    │   Hardware      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Setup Instructions

### Prerequisites
- Computer with modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for initial setup
- Node.js 18+ (for development setup)

### Quick Start (End Users)

1. **Access the Application**
   ```
   Open your web browser and navigate to:
   https://your-deployed-app-url.com
   ```

2. **Start Using CycleOptima**
   - No installation required - runs directly in your browser
   - Create your first cycle using the "Add New Cycle" button
   - Use the drag-and-drop editor to build washing phases
   - Monitor cycles in real-time from the System Monitor page

### Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/cycleOptima.git
   cd cycleOptima/cycleOptima_frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Access the Application**
   ```
   Open browser to: http://localhost:3000
   ```

### Configuration

#### Backend API Configuration
Edit the API configuration in `src/store/cycleSlice.ts`:
```typescript
const API_BASE = 'http://your-server-ip:3000/api';
```

#### Hardware Controller Setup
Configure WebSocket connection in `src/utils/websocketManager.ts`:
```typescript
const WEBSOCKET_URL = 'ws://your-hardware-ip:8080';
```

## Usage Guide

### Creating Your First Cycle

1. **Navigate to Cycle Manager**
   - Click "Cycle Manager" from the main navigation
   - Click "Add New Cycle" button

2. **Design Your Cycle**
   - Enter a descriptive name for your cycle
   - Add phases using the phase editor
   - Drag components from the library to create washing sequences

3. **Configure Components**
   - Set duration for each component
   - Configure motor patterns for agitation
   - Set sensor triggers for automatic phase advancement

4. **Test Your Cycle**
   - Upload cycle to the system monitor
   - Start the cycle and monitor progress
   - Download test data for analysis

### Monitoring System Performance

1. **Real-Time Dashboard**
   - View live sensor readings
   - Monitor component status
   - Track cycle progress

2. **Data Logging**
   - Automatic CSV logging during cycle runs
   - Export data for external analysis
   - Historical performance tracking

## Project Repository

**GitHub Repository:** [https://github.com/your-username/cycleOptima](https://github.com/your-username/cycleOptima)

### Repository Structure
```
cycleOptima/
├── cycleOptima_frontend/     # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Main application pages
│   │   ├── store/           # Redux state management
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   └── package.json         # Dependencies and scripts
├── backend/                 # Backend API (if applicable)
└── docs/                   # Documentation files
```

## Support & Documentation

### Getting Help
- **User Manual**: Detailed guides available in the `/docs` folder
- **Video Tutorials**: Step-by-step walkthrough videos
- **Community Support**: GitHub Issues for questions and bug reports

### System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen Resolution**: Minimum 1024x768 (optimized for 1920x1080)
- **Internet**: Required for server features (local features work offline)

### Troubleshooting
- **Connection Issues**: Check network connectivity and server status
- **Performance Issues**: Clear browser cache and restart application
- **Data Loss**: Local cycles are automatically saved in browser storage

## Key Benefits

✅ **User-Friendly Interface** - No technical expertise required
✅ **Real-Time Monitoring** - See exactly what's happening during cycles
✅ **Data Export** - Analyze performance with CSV data export
✅ **Offline Capability** - Create and edit cycles without internet
✅ **Scalable Design** - Easily add new components and features
✅ **Modern Technology** - Built with latest web standards for reliability

---

*CycleOptima represents a modern approach to industrial control systems, combining intuitive design with powerful functionality to make washing machine management accessible to everyone.*