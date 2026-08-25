require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const sessionRoutes = require('./src/routes/sessionRoutes');
const focusRoutes = require('./src/routes/focusRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/focus', focusRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'FocusFlow AI Backend Engine',
    timestamp: new Date().toISOString(),
    version: '2.0.0-phase2'
  });
});

// Real-Time Socket.io Connection & Event Handling
io.on('connection', (socket) => {
  console.log(`[Socket.io] Extension/Client connected: ${socket.id}`);

  // Telemetry signal stream event from Chrome Extension
  socket.on('telemetry_signal', (data) => {
    console.log(`[Telemetry Received] Tab Switches: ${data.tabSwitches}, Idle: ${data.idleTimeSeconds}s`);
    
    // Broadcast live score update to connected dashboard clients
    io.emit('focus_score_update', {
      timestamp: Date.now(),
      score: data.calculatedScore || 85,
      isDistracted: data.tabSwitches >= 5 || data.idleTimeSeconds >= 120,
      alertMessage: data.tabSwitches >= 5 ? 'High tab switching frequency detected' : null
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const PORT = Number(process.env.PORT) || 5005;

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 FocusFlow AI Backend running on port ${PORT}`);
  console.log(`🌐 API Endpoint: http://localhost:${PORT}/api`);
  console.log(`=================================================`);
});

server.on('error', (err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
