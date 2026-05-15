require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Message = require("./models/Message");
const Room = require("./models/Room");

const app = express();
const server = http.createServer(app);

// ===============================
// SOCKET.IO CONFIG
// ===============================

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

// ===============================
// ACTIVE DATA STORAGE
// ===============================

const activeRooms = new Map(); // room -> Map(socketId -> username)
const typingRooms = new Map(); // room -> Map(socketId -> username)

const getRoomUsers = (room) => {
  const usersMap = activeRooms.get(room);
  return usersMap ? Array.from(usersMap.values()) : [];
};

const emitRoomUsers = (room) => {
  const users = getRoomUsers(room);
  io.to(room).emit("room_users", {
    users,
    count: users.length,
  });
};

const getTypingUsers = (room) => {
  const typingMap = typingRooms.get(room);
  if (!typingMap) return [];
  return Array.from(new Set(Array.from(typingMap.values())));
};

const emitTypingUsers = (room) => {
  io.to(room).emit("typing_users", getTypingUsers(room));
};

// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((error) => {
    console.log("❌ MongoDB Error:", error);
  });

// ===============================
// ROUTES
// ===============================

app.get("/", (req, res) => {
  res.send("✅ SyncTalk backend is running");
});

// ===============================
// GET ALL ROOMS
// ===============================

app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find().sort({
      createdAt: -1,
    });

    res.json(rooms);
  } catch (error) {
    console.log("❌ Rooms fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch rooms",
    });
  }
});

// ===============================
// SOCKET CONNECTION
// ===============================

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // ===============================
  // JOIN ROOM
  // ===============================

  socket.on("join_room", async ({ username, room }) => {
    try {
      const cleanUsername = (username || "").trim();
      const cleanRoom = (room || "").trim();

      if (!cleanUsername || !cleanRoom) return;

      socket.username = cleanUsername;
      socket.room = cleanRoom;

      socket.join(cleanRoom);

      console.log(`👤 ${cleanUsername} joined room: ${cleanRoom}`);

      // CREATE ROOM IF NOT EXISTS
      const existingRoom = await Room.findOne({
        roomName: cleanRoom,
      });

      if (!existingRoom) {
        await Room.create({
          roomName: cleanRoom,
        });

        console.log(`🏠 Room created: ${cleanRoom}`);
      }

      // ACTIVE USERS
      if (!activeRooms.has(cleanRoom)) {
        activeRooms.set(cleanRoom, new Map());
      }

      activeRooms.get(cleanRoom).set(socket.id, cleanUsername);

      // TYPING TRACKING SETUP
      if (!typingRooms.has(cleanRoom)) {
        typingRooms.set(cleanRoom, new Map());
      }

      typingRooms.get(cleanRoom).delete(socket.id);
      emitTypingUsers(cleanRoom);

      // LOAD PREVIOUS MESSAGES
      const previousMessages = await Message.find({
        room: cleanRoom,
      }).sort({
        timestamp: 1,
      });

      socket.emit("previous_messages", previousMessages);

      // JOIN MESSAGE
      const joinMessage = new Message({
        text: `${cleanUsername} joined the room`,
        username: "System",
        room: cleanRoom,
        timestamp: new Date(),
      });

      await joinMessage.save();
      io.to(cleanRoom).emit("message", joinMessage);

      // UPDATE USERS
      emitRoomUsers(cleanRoom);
    } catch (error) {
      console.log("❌ Join room error:", error);
    }
  });

  // ===============================
  // SEND MESSAGE
  // ===============================

  socket.on("message", async (messageData) => {
    try {
      const room = (messageData?.room || "").trim();
      const text = (messageData?.text || "").trim();
      const username = (messageData?.username || "").trim();

      if (!room || !text || !username) return;

      const newMessage = new Message({
        text,
        username,
        room,
        timestamp: messageData.timestamp || new Date(),
      });

      await newMessage.save();

      if (typingRooms.has(room)) {
        typingRooms.get(room).delete(socket.id);
        emitTypingUsers(room);
      }

      io.to(room).emit("message", newMessage);
    } catch (error) {
      console.log("❌ Message save error:", error);
    }
  });

  // ===============================
  // TYPING
  // ===============================

  socket.on("typing", ({ room, username }) => {
    const cleanRoom = (room || "").trim();
    const cleanUsername = (username || "").trim();

    if (!cleanRoom || !cleanUsername) return;

    if (!typingRooms.has(cleanRoom)) {
      typingRooms.set(cleanRoom, new Map());
    }

    typingRooms.get(cleanRoom).set(socket.id, cleanUsername);
    emitTypingUsers(cleanRoom);
  });

  socket.on("stop_typing", ({ room, username }) => {
    const cleanRoom = (room || socket.room || "").trim();
    if (!cleanRoom || !typingRooms.has(cleanRoom)) return;

    typingRooms.get(cleanRoom).delete(socket.id);
    emitTypingUsers(cleanRoom);
  });

  // ===============================
  // DELETE MESSAGE EVERYONE
  // ===============================

  socket.on("delete_message_everyone", async ({ messageId, room }) => {
    try {
      if (!messageId || !room) return;

      await Message.findByIdAndUpdate(messageId, {
        text: "This message was deleted",
        deleted: true,
      });

      io.to(room).emit("message_deleted_everyone", {
        messageId,
      });
    } catch (error) {
      console.log("❌ Delete message error:", error);
    }
  });

  // ===============================
  // CLEAR CHAT
  // ===============================

  socket.on("clear_room", async (room) => {
    try {
      const cleanRoom = (room || "").trim();
      if (!cleanRoom) return;

      await Message.deleteMany({
        room: cleanRoom,
      });

      typingRooms.delete(cleanRoom);
      emitTypingUsers(cleanRoom);

      io.to(cleanRoom).emit("room_cleared");

      console.log(`🧹 Cleared chat for room: ${cleanRoom}`);
    } catch (error) {
      console.log("❌ Clear room error:", error);
    }
  });

  // ===============================
  // DELETE ROOM
  // ===============================

  socket.on("delete_room", async (room) => {
    try {
      const cleanRoom = (room || "").trim();
      if (!cleanRoom) return;

      await Message.deleteMany({
        room: cleanRoom,
      });

      await Room.deleteOne({
        roomName: cleanRoom,
      });

      activeRooms.delete(cleanRoom);
      typingRooms.delete(cleanRoom);

      io.to(cleanRoom).emit("typing_users", []);
      io.to(cleanRoom).emit("room_deleted");

      const sockets = await io.in(cleanRoom).fetchSockets();
      sockets.forEach((s) => {
        s.leave(cleanRoom);
      });

      console.log(`🗑️ Room deleted: ${cleanRoom}`);
    } catch (error) {
      console.log("❌ Delete room error:", error);
    }
  });

  // ===============================
  // DISCONNECT
  // ===============================

  socket.on("disconnect", async () => {
    try {
      const room = socket.room;
      const username = socket.username;

      if (room && username) {
        console.log(`🔴 ${username} left room: ${room}`);

        if (activeRooms.has(room)) {
          activeRooms.get(room).delete(socket.id);

          if (activeRooms.get(room).size === 0) {
            activeRooms.delete(room);
          }

          emitRoomUsers(room);
        }

        if (typingRooms.has(room)) {
          typingRooms.get(room).delete(socket.id);

          if (typingRooms.get(room).size === 0) {
            typingRooms.delete(room);
          }

          emitTypingUsers(room);
        }

        const leaveMessage = new Message({
          text: `${username} left the room`,
          username: "System",
          room,
          timestamp: new Date(),
        });

        await leaveMessage.save();
        io.to(room).emit("message", leaveMessage);
      }

      console.log("🔌 User disconnected:", socket.id);
    } catch (error) {
      console.log("❌ Disconnect error:", error);
    }
  });
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});