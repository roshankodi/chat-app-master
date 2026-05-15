const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
    },

    room: {
      type: String,
      required: true,
      trim: true,
    },

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
      message: {
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