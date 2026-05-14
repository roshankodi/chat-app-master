require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Message = require("./models/Message");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((error) => {
    console.log("MongoDB Error:", error);
  });

// Socket Connection
app.get("/", (req, res) => {
  res.send("SyncTalk backend is running");
});
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join Room
  socket.on("join_room", async (room) => {
    socket.join(room);

    console.log(`User joined room: ${room}`);

    try {
      // Load previous messages
      const messages = await Message.find({ room }).sort({
        timestamp: 1,
      });

      socket.emit("previous_messages", messages);
    } catch (error) {
      console.log("Error loading messages:", error);
    }
  });

  // Receive Message
  socket.on("message", async (messageData) => {
    try {
      // Save to MongoDB
      const newMessage = new Message({
        text: messageData.text,
        username: messageData.username,
        room: messageData.room,
        timestamp: messageData.timestamp,
      });

      await newMessage.save();

      // Send only to room
      io.to(messageData.room).emit(
        "message",
        messageData
      );
    } catch (error) {
      console.log("Message save error:", error);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});