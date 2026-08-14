const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = require('./app');
const setupInterviewSocket = require('./sockets/interviewSocket');

const server = http.createServer(app);

// Initialize Socket.io with CORS enabled
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach our interview socket handler
setupInterviewSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Express & Socket.io Server running on http://localhost:${PORT}`);
});