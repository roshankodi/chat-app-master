import {
  useEffect,
  useRef,
  useState,
} from "react";

import io from "socket.io-client";

// ===============================
// SOCKET
// ===============================

const socket = io(
  "https://synctalk-backend-w7lj.onrender.com",
  {
    transports: ["websocket"],
    autoConnect: true,
  }
);

function Chat() {
  // ===============================
  // STATES
  // ===============================

  const [messages, setMessages] =
    useState([]);

  const [messageInput, setMessageInput] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [room, setRoom] =
    useState("");

  const [joined, setJoined] =
    useState(false);

  const [roomUsers, setRoomUsers] =
    useState([]);

  const [typingUser, setTypingUser] =
    useState("");

  const [showSidebar, setShowSidebar] =
    useState(false);

  const [showMenu, setShowMenu] =
    useState(false);

  const [replyMessage, setReplyMessage] =
    useState(null);

  const [messageMenu, setMessageMenu] =
    useState({
      visible: false,
      message: null,
    });

  // ===============================
  // REFS
  // ===============================

  const messagesEndRef = useRef(null);

  const typingTimeoutRef = useRef(null);

  const notificationSound = useRef(
    typeof Audio !== "undefined"
      ? new Audio(
          "https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3"
        )
      : null
  );

  // ===============================
  // AUTO SCROLL
  // ===============================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  // ===============================
  // SOCKET LISTENERS
  // ===============================

  useEffect(() => {
    // MESSAGE

    const handleMessage = (
      message
    ) => {
      setMessages((prev) => {
        const exists = prev.find(
          (m) => m._id === message._id
        );

        if (exists) return prev;

        return [...prev, message];
      });

      // notification

      if (
        message.username !== username &&
        message.username !== "System"
      ) {
        notificationSound.current
          ?.play()
          .catch(() => {});
      }
    };

    // PREVIOUS MESSAGES

    const handlePreviousMessages = (
      previousMessages
    ) => {
      setMessages(previousMessages);
    };

    // USERS

    const handleRoomUsers = (
      users
    ) => {
      setRoomUsers(users);
    };

    // TYPING

    const handleTyping = (
      user
    ) => {
      setTypingUser(user);
    };

    const handleStopTyping =
      () => {
        setTypingUser("");
      };

    // ROOM CLEARED

    const handleRoomCleared =
      () => {
        setMessages([]);
      };

    // MESSAGE DELETED

    const handleMessageDeleted =
      ({ messageId }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  text:
                    "This message was deleted",
                  deleted: true,
                }
              : msg
          )
        );
      };

    // ROOM DELETED

    const handleRoomDeleted =
      () => {
        alert("Room deleted");

        setMessages([]);
        setJoined(false);
        setRoom("");
        setRoomUsers([]);
      };

    // REGISTER

    socket.on(
      "message",
      handleMessage
    );

    socket.on(
      "previous_messages",
      handlePreviousMessages
    );

    socket.on(
      "room_users",
      handleRoomUsers
    );

    socket.on(
      "typing",
      handleTyping
    );

    socket.on(
      "stop_typing",
      handleStopTyping
    );

    socket.on(
      "room_cleared",
      handleRoomCleared
    );

    socket.on(
      "message_deleted_everyone",
      handleMessageDeleted
    );

    socket.on(
      "room_deleted",
      handleRoomDeleted
    );

    // CLEANUP

    return () => {
      socket.off(
        "message",
        handleMessage
      );

      socket.off(
        "previous_messages",
        handlePreviousMessages
      );

      socket.off(
        "room_users",
        handleRoomUsers
      );

      socket.off(
        "typing",
        handleTyping
      );

      socket.off(
        "stop_typing",
        handleStopTyping
      );

      socket.off(
        "room_cleared",
        handleRoomCleared
      );

      socket.off(
        "message_deleted_everyone",
        handleMessageDeleted
      );

      socket.off(
        "room_deleted",
        handleRoomDeleted
      );
    };
  }, [username]);

  // ===============================
  // JOIN ROOM
  // ===============================

  const joinRoom = () => {
    if (
      !username.trim() ||
      !room.trim()
    ) {
      return;
    }

    socket.emit("join_room", {
      username:
        username.trim(),
      room: room.trim(),
    });

    setJoined(true);
  };

  // ===============================
  // SEND MESSAGE
  // ===============================

  const sendMessage = () => {
    if (!messageInput.trim()) {
      return;
    }

    const messageData = {
      text: messageInput.trim(),
      username,
      room,
      timestamp: new Date(),

      replyTo: replyMessage
        ? {
            message:
              replyMessage.text,
            username:
              replyMessage.username,
          }
        : null,
    };

    socket.emit(
      "message",
      messageData
    );

    setMessageInput("");

    setReplyMessage(null);

    socket.emit(
      "stop_typing",
      room
    );
  };

  // ===============================
  // TYPING
  // ===============================

  const handleTyping = (value) => {
    setMessageInput(value);

    socket.emit("typing", {
      room,
      username,
    });

    clearTimeout(
      typingTimeoutRef.current
    );

    typingTimeoutRef.current =
      setTimeout(() => {
        socket.emit(
          "stop_typing",
          room
        );
      }, 1000);
  };

  // ===============================
  // CLEAR CHAT
  // ===============================

  const clearChat = () => {
    const confirmClear =
      window.confirm(
        "Clear all messages?"
      );

    if (!confirmClear) return;

    socket.emit(
      "clear_room",
      room
    );

    setShowMenu(false);
  };

  // ===============================
  // DELETE ROOM
  // ===============================

  const deleteRoom = () => {
    const confirmDelete =
      window.confirm(
        "Delete room permanently?"
      );

    if (!confirmDelete) return;

    socket.emit(
      "delete_room",
      room
    );

    setShowMenu(false);
  };

  // ===============================
  // DELETE MESSAGE
  // ===============================

  const deleteMessage = (
    messageId,
    type
  ) => {
    if (type === "me") {
      setMessages((prev) =>
        prev.filter(
          (msg) =>
            msg._id !== messageId
        )
      );
    } else {
      socket.emit(
        "delete_message_everyone",
        {
          messageId,
          room,
        }
      );
    }

    setMessageMenu({
      visible: false,
      message: null,
    });
  };

  // ===============================
  // MESSAGE MENU
  // ===============================

  const openMessageMenu = (
    msg
  ) => {
    if (msg.username === "System")
      return;

    setMessageMenu({
      visible: true,
      message: msg,
    });
  };

  // ===============================
  // JOIN SCREEN
  // ===============================

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#111827] rounded-3xl p-8 text-white shadow-2xl">
          <h1 className="text-4xl font-bold mb-8 text-center">
            SyncTalk
          </h1>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                )
              }
              className="w-full bg-gray-700 rounded-2xl px-4 py-4 outline-none"
            />

            <input
              type="text"
              placeholder="Room Name"
              value={room}
              onChange={(e) =>
                setRoom(
                  e.target.value
                )
              }
              className="w-full bg-gray-700 rounded-2xl px-4 py-4 outline-none"
            />

            <button
              onClick={joinRoom}
              className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-2xl py-4 font-semibold"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // MAIN UI
  // ===============================

  return (
    <div className="h-screen bg-[#020817] text-white flex overflow-hidden">
      {/* SIDEBAR */}

      <div className="hidden lg:flex w-[300px] bg-[#0f172a] border-r border-gray-700 flex-col p-5">
        <h1 className="text-3xl font-bold mb-6">
          SyncTalk
        </h1>

        <p className="text-sm text-gray-400">
          Room
        </p>

        <h2 className="text-2xl font-semibold mb-6">
          #{room}
        </h2>

        <button
          onClick={clearChat}
          className="bg-slate-700 hover:bg-slate-800 rounded-2xl py-3 mb-3"
        >
          Clear Chat
        </button>

        <button
          onClick={deleteRoom}
          className="bg-red-600 hover:bg-red-700 rounded-2xl py-3 mb-6"
        >
          Delete Room
        </button>

        <p className="text-sm text-gray-400 mb-3">
          Users ({roomUsers.length})
        </p>

        <div className="space-y-2">
          {roomUsers.map(
            (user, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-xl px-4 py-3"
              >
                {user}
              </div>
            )
          )}
        </div>
      </div>

      {/* CHAT */}

      <div className="flex-1 flex flex-col">
        {/* HEADER */}

        <div className="h-[70px] bg-[#111827] border-b border-gray-700 flex items-center justify-between px-4">
          <div>
            <h1 className="text-xl font-bold">
              SyncTalk
            </h1>

            <p className="text-xs text-gray-400">
              #{room}
            </p>
          </div>
        </div>

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#020617]">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex flex-col ${
                msg.username === username
                  ? "items-end"
                  : "items-start"
              }`}
              onContextMenu={(e) => {
                e.preventDefault();

                openMessageMenu(msg);
              }}
            >
              <span className="text-xs mb-1 text-gray-400">
                {msg.username}
              </span>

              <div
                className={`px-4 py-3 rounded-2xl max-w-[85%] break-words ${
                  msg.username === username
                    ? "bg-indigo-500"
                    : msg.username ===
                      "System"
                    ? "bg-emerald-500"
                    : "bg-gray-700"
                }`}
              >
                {msg.replyTo &&
                  msg.replyTo
                    .message && (
                    <div className="bg-black/20 rounded-xl p-2 mb-2 border-l-4 border-white">
                      <p className="font-semibold text-sm">
                        {
                          msg.replyTo
                            .username
                        }
                      </p>

                      <p className="text-sm truncate">
                        {
                          msg.replyTo
                            .message
                        }
                      </p>
                    </div>
                  )}

                <p>
                  {msg.deleted
                    ? "This message was deleted"
                    : msg.text}
                </p>
              </div>

              <span className="text-xs mt-1 text-gray-400">
                {new Date(
                  msg.timestamp
                ).toLocaleTimeString()}
              </span>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* TYPING */}

        <div className="h-7 px-4 text-sm italic text-gray-400 bg-[#020617]">
          {typingUser &&
            `${typingUser} is typing...`}
        </div>

        {/* REPLY */}

        {replyMessage && (
          <div className="bg-[#111827] border-t border-gray-700 px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-sm text-indigo-400 font-semibold">
                Replying to{" "}
                {
                  replyMessage.username
                }
              </p>

              <p className="text-sm text-gray-300 truncate">
                {replyMessage.text}
              </p>
            </div>

            <button
              onClick={() =>
                setReplyMessage(
                  null
                )
              }
            >
              ✕
            </button>
          </div>
        )}

        {/* INPUT */}

        <div className="bg-[#111827] border-t border-gray-700 p-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Message"
              value={messageInput}
              onChange={(e) =>
                handleTyping(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  sendMessage();
                }
              }}
              className="flex-1 bg-gray-700 rounded-2xl px-5 py-4 outline-none"
            />

            <button
              onClick={sendMessage}
              className="bg-indigo-500 hover:bg-indigo-600 rounded-2xl px-6 py-4 font-semibold"
            >
              Send
            </button>
          </div>
        </div>

        {/* MESSAGE MENU */}

        {messageMenu.visible &&
          messageMenu.message && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-end lg:items-center justify-center px-4">
              <div className="w-full max-w-sm bg-[#111827] rounded-3xl overflow-hidden border border-gray-700">
                <button
                  onClick={() => {
                    setReplyMessage(
                      messageMenu.message
                    );

                    setMessageMenu({
                      visible: false,
                      message: null,
                    });
                  }}
                  className="w-full text-left px-6 py-5 hover:bg-gray-700"
                >
                  Reply
                </button>

                {messageMenu.message
                  .username ===
                  username && (
                  <>
                    <button
                      onClick={() =>
                        deleteMessage(
                          messageMenu
                            .message
                            ._id,
                          "me"
                        )
                      }
                      className="w-full text-left px-6 py-5 hover:bg-gray-700"
                    >
                      Delete For Me
                    </button>

                    <button
                      onClick={() =>
                        deleteMessage(
                          messageMenu
                            .message
                            ._id,
                          "everyone"
                        )
                      }
                      className="w-full text-left px-6 py-5 text-red-400 hover:bg-gray-700"
                    >
                      Delete For Everyone
                    </button>
                  </>
                )}

                <button
                  onClick={() =>
                    setMessageMenu({
                      visible: false,
                      message: null,
                    })
                  }
                  className="w-full text-left px-6 py-5 hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

export default Chat;