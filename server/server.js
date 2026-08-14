const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = require('./app');
const setupInterviewSocket = require('./sockets/interviewSocket');

// 1. Create HTTP server wrapping Express app
const server = http.createServer(app);

// 2. Initialize Socket.io with CORS settings
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 3. Attach Socket Event Handlers
setupInterviewSocket(io);

// 4. Start Server Listener
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Express & Socket.io Server running on http://localhost:${PORT}`);
});