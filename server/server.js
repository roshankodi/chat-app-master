```js
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

// typing users tracker
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
    console.log(error);

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
        // CREATE ROOM
        // ===============================

        const existingRoom =
          await Room.findOne({
            room: room,
          });

        if (!existingRoom) {
          await Room.create({
            room: room,
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
        // PREVIOUS MESSAGES
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
        // SYSTEM JOIN MESSAGE
        // ===============================

        const joinMessage =
          new Message({
            text: `${username} joined the room`,
            username: "System",
            room,
          });

        await joinMessage.save();

        io.to(room).emit(
          "message",
          joinMessage
        );
      } catch (error) {
        console.log(
          "❌ Join room error:",
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
          });

        await newMessage.save();

        io.to(messageData.room).emit(
          "message",
          newMessage
        );

        // ===============================
        // STOP TYPING AFTER SEND
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

        socket
          .to(messageData.room)
          .emit("stop_typing");
      } catch (error) {
        console.log(
          "❌ Message error:",
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

      // prevent spam emits
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
  // DELETE MESSAGE
  // ===============================

  socket.on(
    "delete_message_everyone",
    async ({ messageId, room }) => {
      try {
        const message =
          await Message.findById(
            messageId
          );

        if (!message) return;

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
          "❌ Delete message error:",
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
          "❌ Clear room error:",
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
          room: room,
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
          `🗑️ Deleted room ${room}`
        );
      } catch (error) {
        console.log(
          "❌ Delete room error:",
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

        // remove active user
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

          // cleanup empty room memory
          if (
            activeRooms[room]
              .length === 0
          ) {
            delete activeRooms[
              room
            ];
          }
        }

        // typing cleanup
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

        // leave message
        const leaveMessage =
          new Message({
            text: `${username} left the room`,
            username: "System",
            room,
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
        "❌ Disconnect error:",
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
```
