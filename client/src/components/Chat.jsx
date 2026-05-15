# Updated `Chat.jsx`

```jsx
import {
  useState,
  useEffect,
  useRef,
} from "react";

import io from "socket.io-client";

const socket = io(
  "https://synctalk-backend-w7lj.onrender.com"
);

function Chat() {
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

  const [darkMode, setDarkMode] =
    useState(true);

  const [roomUsers, setRoomUsers] =
    useState([]);

  const [typingUser, setTypingUser] =
    useState("");

  const [showSidebar, setShowSidebar] =
    useState(false);

  const [showMenu, setShowMenu] =
    useState(false);

  const [selectedMessages, setSelectedMessages] =
    useState([]);

  const [replyMessage, setReplyMessage] =
    useState(null);

  const [messageMenu, setMessageMenu] =
    useState({
      visible: false,
      message: null,
    });

  const messagesEndRef = useRef(null);

  const inputRef = useRef(null);

  const notificationSound = useRef(
    new Audio(
      "https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3"
    )
  );

  // ===============================
  // SOCKET LISTENERS
  // ===============================

  useEffect(() => {
    socket.on("message", (message) => {
      setMessages((prev) => [
        ...prev,
        message,
      ]);

      if (
        message.username !== username &&
        message.username !== "System"
      ) {
        notificationSound.current.play();
      }
    });

    socket.on(
      "previous_messages",
      (previousMessages) => {
        setMessages(previousMessages);
      }
    );

    socket.on("room_users", (users) => {
      setRoomUsers(users);
    });

    socket.on("typing", (user) => {
      setTypingUser(user);
    });

    socket.on("stop_typing", () => {
      setTypingUser("");
    });

    socket.on("room_cleared", () => {
      setMessages([]);
    });

    socket.on(
      "message_deleted_everyone",
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
      }
    );

    socket.on("room_deleted", () => {
      alert("Room deleted");

      setMessages([]);
      setJoined(false);
      setRoom("");
      setRoomUsers([]);
    });

    return () => {
      socket.off("message");
      socket.off(
        "previous_messages"
      );
      socket.off("room_users");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("room_cleared");
      socket.off(
        "message_deleted_everyone"
      );
      socket.off("room_deleted");
    };
  }, [username]);

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
  // JOIN ROOM
  // ===============================

  const joinRoom = () => {
    if (
      !username.trim() ||
      !room.trim()
    )
      return;

    setJoined(true);

    socket.emit("join_room", {
      username,
      room,
    });
  };

  // ===============================
  // SEND MESSAGE
  // ===============================

  const sendMessage = () => {
    if (!messageInput.trim())
      return;

    const messageData = {
      text: messageInput,
      username,
      room,
      timestamp: new Date(),
      replyTo: replyMessage
        ? {
            text: replyMessage.text,
            username:
              replyMessage.username,
          }
        : null,
    };

    socket.emit("message", messageData);

    setMessageInput("");

    setReplyMessage(null);

    socket.emit(
      "stop_typing",
      room
    );

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // ===============================
  // TYPING
  // ===============================

  const handleTyping = (value) => {
    setMessageInput(value);

    if (value.trim()) {
      socket.emit("typing", {
        room,
        username,
      });
    } else {
      socket.emit(
        "stop_typing",
        room
      );
    }
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

    socket.emit("clear_room", room);

    setShowMenu(false);
  };

  // ===============================
  // DELETE ROOM
  // ===============================

  const deleteRoom = () => {
    const confirmDelete =
      window.confirm(
        "Delete this room permanently?"
      );

    if (!confirmDelete) return;

    socket.emit("delete_room", room);

    setShowMenu(false);
  };

  // ===============================
  // MESSAGE DELETE
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
  // LONG PRESS
  // ===============================

  const handleLongPress = (msg) => {
    if (msg.username === "System")
      return;

    setMessageMenu({
      visible: true,
      message: msg,
    });
  };

  // ===============================
  // SELECT MESSAGE
  // ===============================

  const toggleSelectMessage = (
    messageId
  ) => {
    if (
      selectedMessages.includes(
        messageId
      )
    ) {
      setSelectedMessages((prev) =>
        prev.filter(
          (id) => id !== messageId
        )
      );
    } else {
      setSelectedMessages((prev) => [
        ...prev,
        messageId,
      ]);
    }
  };

  // ===============================
  // JOIN SCREEN
  // ===============================

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020817] px-4">
        <div className="w-full max-w-md bg-[#111827] rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">
              SyncTalk
            </h1>

            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              className="w-10 h-10 rounded-full bg-yellow-400 text-black"
            >
              ☀️
            </button>
          </div>

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
              className="w-full px-4 py-4 rounded-2xl bg-gray-700 outline-none"
            />

            <input
              type="text"
              placeholder="Room Name"
              value={room}
              onChange={(e) =>
                setRoom(e.target.value)
              }
              className="w-full px-4 py-4 rounded-2xl bg-gray-700 outline-none"
            />

            <button
              onClick={joinRoom}
              className="w-full bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-semibold"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // CHAT SCREEN
  // ===============================

  return (
    <div className="h-screen bg-[#020817] text-white overflow-hidden flex">
      {/* MOBILE SIDEBAR OVERLAY */}

      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden">
          <div className="w-[280px] h-full bg-[#0f172a] p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Room Info
              </h2>

              <button
                onClick={() =>
                  setShowSidebar(false)
                }
              >
                ✕
              </button>
            </div>

            <p className="text-gray-400 text-sm">
              Room
            </p>

            <h3 className="text-xl font-semibold mb-6">
              #{room}
            </h3>

            <p className="text-gray-400 mb-3 text-sm">
              Active Users (
              {roomUsers.length})
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
        </div>
      )}

      {/* DESKTOP SIDEBAR */}

      <div className="hidden lg:flex w-[320px] bg-[#0f172a] border-r border-gray-700 flex-col p-5 overflow-y-auto">
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
          className="w-full bg-slate-600 hover:bg-slate-700 py-3 rounded-2xl mb-3"
        >
          Clear Chat
        </button>

        <button
          onClick={deleteRoom}
          className="w-full bg-stone-600 hover:bg-stone-700 py-3 rounded-2xl mb-6"
        >
          Delete Room
        </button>

        <p className="text-gray-400 text-sm mb-3">
          Active Users (
          {roomUsers.length})
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

      {/* CHAT AREA */}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOPBAR */}

        <div className="h-[70px] bg-[#111827] border-b border-gray-700 px-4 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-2xl"
              onClick={() =>
                setShowSidebar(true)
              }
            >
              ☰
            </button>

            <div>
              <h1 className="text-xl font-bold">
                SyncTalk
              </h1>

              <p className="text-xs text-gray-400">
                #{room}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              className="w-10 h-10 rounded-full bg-yellow-400 text-black"
            >
              ☀️
            </button>

            <button
              onClick={() =>
                setShowMenu(!showMenu)
              }
              className="text-2xl"
            >
              ⋮
            </button>

            {showMenu && (
              <div className="absolute top-16 right-4 bg-[#1e293b] rounded-2xl shadow-2xl w-56 overflow-hidden z-50 border border-gray-700">
                <button
                  onClick={clearChat}
                  className="w-full text-left px-5 py-4 hover:bg-gray-700"
                >
                  Clear Chat
                </button>

                <button
                  onClick={deleteRoom}
                  className="w-full text-left px-5 py-4 hover:bg-gray-700"
                >
                  Delete Room
                </button>

                <button
                  onClick={() =>
                    setSelectedMessages([])
                  }
                  className="w-full text-left px-5 py-4 hover:bg-gray-700"
                >
                  Select Messages
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto px-3 py-4 lg:px-6 space-y-4 bg-[#020617]">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                msg.username === username
                  ? "items-end"
                  : "items-start"
              }`}
              onContextMenu={(e) => {
                e.preventDefault();
                handleLongPress(msg);
              }}
              onTouchStart={() =>
                handleLongPress(msg)
              }
            >
              <span className="text-xs mb-1 text-gray-400">
                {msg.username}
              </span>

              <div
                className={`px-4 py-3 rounded-2xl max-w-[88%] break-words relative ${
                  selectedMessages.includes(
                    msg._id
                  )
                    ? "ring-2 ring-indigo-400"
                    : ""
                } ${
                  msg.username === username
                    ? "bg-indigo-500"
                    : msg.username ===
                      "System"
                    ? "bg-emerald-500"
                    : "bg-gray-700"
                }`}
              >
                {msg.replyTo && (
                  <div className="mb-2 bg-black/20 rounded-xl p-2 text-sm border-l-4 border-white">
                    <p className="font-semibold">
                      {
                        msg.replyTo.username
                      }
                    </p>

                    <p className="truncate">
                      {msg.replyTo.text}
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

        <div className="min-h-[28px] px-4 text-sm italic text-gray-400 bg-[#020617]">
          {typingUser &&
            `${typingUser} is typing...`}
        </div>

        {/* REPLY PREVIEW */}

        {replyMessage && (
          <div className="bg-[#111827] border-t border-gray-700 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-400">
                Replying to {
                  replyMessage.username
                }
              </p>

              <p className="text-sm text-gray-300 truncate max-w-[250px]">
                {replyMessage.text}
              </p>
            </div>

            <button
              onClick={() =>
                setReplyMessage(null)
              }
            >
              ✕
            </button>
          </div>
        )}

        {/* INPUT */}

        <div className="bg-[#111827] border-t border-gray-700 p-3 shrink-0">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
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
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 px-5 py-4 rounded-2xl bg-gray-700 outline-none"
            />

            <button
              onClick={sendMessage}
              className="bg-indigo-500 hover:bg-indigo-600 px-6 py-4 rounded-2xl font-semibold"
            >
              Send
            </button>
          </div>
        </div>

        {/* MESSAGE MENU */}

        {messageMenu.visible &&
          messageMenu.message && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-end lg:items-center justify-center px-4">
              <div className="w-full max-w-sm bg-[#111827] rounded-t-3xl lg:rounded-3xl overflow-hidden border border-gray-700 mb-0 lg:mb-0">
                <button
                  onClick={() => {
                    toggleSelectMessage(
                      messageMenu.message
                        ._id
                    );

                    setMessageMenu({
                      visible: false,
                      message: null,
                    });
                  }}
                  className="w-full text-left px-6 py-5 hover:bg-gray-700"
                >
                  Select Message
                </button>

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
                          messageMenu.message
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
                          messageMenu.message
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
```
