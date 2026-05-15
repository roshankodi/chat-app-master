const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    // ===============================
    // MESSAGE TEXT
    // ===============================

    text: {
      type: String,
      required: true,
      trim: true,
    },

    // ===============================
    // USERNAME
    // ===============================

    username: {
      type: String,
      required: true,
      trim: true,
    },

    // ===============================
    // ROOM
    // ===============================

    room: {
      type: String,
      required: true,
      trim: true,
    },

    // ===============================
    // TIMESTAMP
    // ===============================

    timestamp: {
      type: Date,
      default: Date.now,
    },

    // ===============================
    // DELETE SUPPORT
    // ===============================

    deleted: {
      type: Boolean,
      default: false,
    },

    // ===============================
    // REPLY SUPPORT
    // ===============================

    replyTo: {
      text: {
        type: String,
        default: "",
      },

      username: {
        type: String,
        default: "",
      },
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model(
  "Message",
  MessageSchema
);