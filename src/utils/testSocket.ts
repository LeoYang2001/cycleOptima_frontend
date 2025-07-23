// Utility function to test Socket.io connection and events
import { io } from "socket.io-client";
import { API_CONFIG, getNgrokHeaders } from "../config/api";

export function testSocketConnection() {
  console.log("🧪 Testing Socket.io connection...");

  const socket = io(API_CONFIG.BASE_URL, {
    transports: ["websocket", "polling"],
    extraHeaders: getNgrokHeaders(),
  });

  // Connection events
  socket.on("connect", () => {
    console.log("✅ Socket.io TEST connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket.io TEST disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("🔥 Socket.io TEST connection error:", error);
  });

  // Listen for all cycle events
  socket.on("cycle_updated", (data) => {
    console.log("🔄 TEST: Received cycle_updated event:", data);
  });

  socket.on("cycle_created", (data) => {
    console.log("🆕 TEST: Received cycle_created event:", data);
  });

  socket.on("cycle_deleted", (data) => {
    console.log("🗑️ TEST: Received cycle_deleted event:", data);
  });

  // Return cleanup function
  return () => {
    console.log("🧹 Cleaning up test socket connection");
    socket.disconnect();
  };
}

// Make it available globally for testing in browser console
if (typeof window !== "undefined") {
  (window as any).testSocket = testSocketConnection;
}
