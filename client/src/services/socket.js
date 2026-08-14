import { io } from "socket.io-client";

// Backend Express Server WebSocket URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Initialize Socket.io client instance
const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ["websocket", "polling"], // Try WebSocket first, fallback to polling
});

// --- Lifecycle Event Logging for Console Debugging ---
socket.on("connect", () => {
  console.log("⚡ Connected to WebSocket Server! Socket ID:", socket.id);
});

socket.on("connect_error", (error) => {
  console.warn("⚠️ WebSocket Connection Error:", error.message);
});

socket.on("reconnect", (attemptNumber) => {
  console.log(`🔄 Reconnected to WebSocket Server after ${attemptNumber} attempts`);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Disconnected from WebSocket Server. Reason:", reason);
});

export default socket;