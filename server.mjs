import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
// VPS-এ চালানোর জন্য hostname ডায়নামিক করা হলো
const hostname = process.env.HOSTNAME || "localhost";
// .env ফাইল থেকে পোর্ট নেবে, না থাকলে ডিফল্ট 3002 তে চলবে
const port = parseInt(process.env.PORT, 10) || 3002;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const onlineUsers = new Map();
const userLastSeen = new Map();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    
    socket.on("register", (userId) => {
      onlineUsers.set(socket.id, userId);
      io.emit("status_update", { userId, status: "Online" });
    });

    socket.on("send_message", (data) => {
      io.emit("receive_message", data); 
    });

    socket.on("mark_seen", ({ senderId, receiverId }) => {
      io.emit("messages_seen_update", { senderId, receiverId });
    });

    // Reaction Toggle Logic
    socket.on("react_message", (data) => {
      io.emit("message_reaction_update", data);
    });

    // Pinned Message Logic
    socket.on("pin_message", (data) => {
      io.emit("message_pinned_update", data);
    });

    // Message Delete Logic
    socket.on("delete_message", ({ messageId, type, userId }) => {
      if (type === "everyone") {
        io.emit("message_deleted_update", { messageId, type: "everyone" });
      } else if (type === "for_me") {
        io.emit("message_deleted_update", { messageId, type: "for_me", userId });
      }
    });

    // Theme Update Sync
    socket.on("change_theme", ({ senderId, receiverId, theme }) => {
      io.emit("theme_update", { senderId, receiverId, theme });
    });

    socket.on("typing", (data) => {
      io.emit("user_typing", data);
    });

    socket.on("stop_typing", (data) => {
      io.emit("user_stop_typing", data);
    });

    socket.on("disconnect", () => {
      const userId = onlineUsers.get(socket.id);
      if (userId) {
        onlineUsers.delete(socket.id);
        const lastSeenTime = new Date().toISOString();
        userLastSeen.set(userId, lastSeenTime);
        io.emit("status_update", { userId, status: "Offline", lastSeen: lastSeenTime });
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Zenex Custom Server running on http://${hostname}:${port}`);
    console.log("⚡ Socket.io Ready with Premium Themes & Features");
  });
});