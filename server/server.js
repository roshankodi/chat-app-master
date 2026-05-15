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
// SOCKET.IO
// ===============================

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

// ===============================
// ACTIVE USERS
// ===============================

const activeRooms = {};

// ===============================
// TYPING USERS
// ===============================

const typingUsers = {};

// ===============================
// MONGODB
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
  res.send("✅ SyncTalk backend running");
});

// ===============================
// GET ROOMS
// ===============================

app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find().sort({
      createdAt: -1,
    });

    res.json(rooms);
  } catch (error) {
    console.log("❌ Rooms Error:", error);

    res.status(500).json({
      error: "Failed to fetch rooms",
    });
  }
});

// ===============================
// SOCKET CONNECTION
// ===============================

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  // ===============================
  // JOIN ROOM
  // ===============================

  socket.on(
    "join_room",
    async ({ username, room }) => {
      try {
        socket.username = username;
        socket.room = room;

        socket.join(room);

        console.log(
          `👤 ${username} joined ${room}`
        );

        // ===============================
        // CREATE ROOM IF NOT EXISTS
        // ===============================

        const existingRoom =
          await Room.findOne({
            roomName: room,
          });

        if (!existingRoom) {
          await Room.create({
            roomName: room,
          });
        }

        // ===============================
        // ACTIVE USERS
        // ===============================

        if (!activeRooms[room]) {
          activeRooms[room] = [];
        }

        if (
          !activeRooms[room].includes(
            username
          )
        ) {
          activeRooms[room].push(
            username
          );
        }

        io.to(room).emit(
          "room_users",
          activeRooms[room]
        );

        // ===============================
        // LOAD OLD MESSAGES
        // ===============================

        const previousMessages =
          await Message.find({
            room,
          }).sort({
            timestamp: 1,
          });

        socket.emit(
          "previous_messages",
          previousMessages
        );

        // ===============================
        // JOIN MESSAGE
        // ===============================

        const joinMessage =
          new Message({
            text: `${username} joined the room`,
            username: "System",
            room,
            timestamp: new Date(),
          });

        await joinMessage.save();

        io.to(room).emit(
          "message",
          joinMessage
        );
      } catch (error) {
        console.log(
          "❌ Join Room Error:",
          error
        );
      }
    }
  );

  // ===============================
  // SEND MESSAGE
  // ===============================

  socket.on(
    "message",
    async (messageData) => {
      try {
        if (
          !messageData.text ||
          !messageData.text.trim()
        ) {
          return;
        }

        const newMessage =
          new Message({
            text:
              messageData.text.trim(),

            username:
              messageData.username,

            room: messageData.room,

            timestamp:
              messageData.timestamp ||
              new Date(),

            replyTo:
              messageData.replyTo ||
              null,

            deleted: false,
          });

        await newMessage.save();

        io.to(messageData.room).emit(
          "message",
          newMessage
        );

        // ===============================
        // STOP TYPING
        // ===============================

        if (
          typingUsers[
            messageData.room
          ]
        ) {
          delete typingUsers[
            messageData.room
          ][messageData.username];
        }

        io.to(messageData.room).emit(
          "stop_typing"
        );
      } catch (error) {
        console.log(
          "❌ Message Error:",
          error
        );
      }
    }
  );

  // ===============================
  // TYPING
  // ===============================

  socket.on(
    "typing",
    ({ room, username }) => {
      if (!typingUsers[room]) {
        typingUsers[room] = {};
      }

      // already typing
      if (
        typingUsers[room][username]
      ) {
        return;
      }

      typingUsers[room][username] =
        true;

      socket.to(room).emit(
        "typing",
        username
      );
    }
  );

  // ===============================
  // STOP TYPING
  // ===============================

  socket.on("stop_typing", (room) => {
    if (
      typingUsers[room] &&
      socket.username
    ) {
      delete typingUsers[room][
        socket.username
      ];
    }

    socket.to(room).emit(
      "stop_typing"
    );
  });

  // ===============================
  // DELETE MESSAGE FOR EVERYONE
  // ===============================

  socket.on(
    "delete_message_everyone",
    async ({ messageId, room }) => {
      try {
        const message =
          await Message.findById(
            messageId
          );

        if (!message) {
          return;
        }

        // sender only
        if (
          message.username !==
          socket.username
        ) {
          return;
        }

        message.text =
          "This message was deleted";

        message.deleted = true;

        await message.save();

        io.to(room).emit(
          "message_deleted_everyone",
          {
            messageId,
          }
        );
      } catch (error) {
        console.log(
          "❌ Delete Message Error:",
          error
        );
      }
    }
  );

  // ===============================
  // CLEAR ROOM
  // ===============================

  socket.on(
    "clear_room",
    async (room) => {
      try {
        await Message.deleteMany({
          room,
        });

        io.to(room).emit(
          "room_cleared"
        );

        console.log(
          `🧹 Cleared ${room}`
        );
      } catch (error) {
        console.log(
          "❌ Clear Room Error:",
          error
        );
      }
    }
  );

  // ===============================
  // DELETE ROOM
  // ===============================

  socket.on(
    "delete_room",
    async (room) => {
      try {
        await Message.deleteMany({
          room,
        });

        await Room.deleteOne({
          roomName: room,
        });

        delete activeRooms[room];

        delete typingUsers[room];

        io.to(room).emit(
          "room_deleted"
        );

        const sockets =
          await io.in(room).fetchSockets();

        sockets.forEach((s) => {
          s.leave(room);
        });

        console.log(
          `🗑️ Deleted ${room}`
        );
      } catch (error) {
        console.log(
          "❌ Delete Room Error:",
          error
        );
      }
    }
  );

  // ===============================
  // DISCONNECT
  // ===============================

  socket.on("disconnect", async () => {
    try {
      const username =
        socket.username;

      const room = socket.room;

      if (username && room) {
        console.log(
          `🔴 ${username} left ${room}`
        );

        // ===============================
        // REMOVE USER
        // ===============================

        if (activeRooms[room]) {
          activeRooms[room] =
            activeRooms[room].filter(
              (user) =>
                user !== username
            );

          io.to(room).emit(
            "room_users",
            activeRooms[room]
          );

          // cleanup empty room
          if (
            activeRooms[room]
              .length === 0
          ) {
            delete activeRooms[
              room
            ];
          }
        }

        // ===============================
        // REMOVE TYPING
        // ===============================

        if (
          typingUsers[room]
        ) {
          delete typingUsers[room][
            username
          ];
        }

        socket
          .to(room)
          .emit("stop_typing");

        // ===============================
        // LEAVE MESSAGE
        // ===============================

        const leaveMessage =
          new Message({
            text: `${username} left the room`,
            username: "System",
            room,
            timestamp: new Date(),
          });

        await leaveMessage.save();

        io.to(room).emit(
          "message",
          leaveMessage
        );
      }

      console.log(
        "🔌 Disconnected:",
        socket.id
      );
    } catch (error) {
      console.log(
        "❌ Disconnect Error:",
        error
      );
    }
  });
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on ${PORT}`
  );
});