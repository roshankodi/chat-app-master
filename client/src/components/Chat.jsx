import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io(
  "https://synctalk-backend-w7lj.onrender.com"
);

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] =
    useState("");
  const [username, setUsername] =
    useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [darkMode, setDarkMode] =
    useState(true);

  // Active users
  const [roomUsers, setRoomUsers] =
    useState([]);

  const messagesEndRef = useRef(null);

  // ===============================
  // Socket Listeners
  // ===============================

  useEffect(() => {
    // New Messages
    socket.on("message", (message) => {
      setMessages((prev) => [
        ...prev,
        message,
      ]);
    });

    // Previous Messages
    socket.on(
      "previous_messages",
      (previousMessages) => {
        setMessages(previousMessages);
      }
    );

    // Active Room Users
    socket.on("room_users", (users) => {
      setRoomUsers(users);
    });

    return () => {
      socket.off("message");
      socket.off("previous_messages");
      socket.off("room_users");
    };
  }, []);

  // ===============================
  // Auto Scroll
  // ===============================

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // ===============================
  // Join Room
  // ===============================

  const joinRoom = () => {
    if (
      username.trim() === "" ||
      room.trim() === ""
    )
      return;

    setJoined(true);

    // Join Room Properly
    socket.emit("join_room", {
      username,
      room,
    });
  };

  // ===============================
  // Send Message
  // ===============================

  const sendMessage = () => {
    if (messageInput.trim() === "")
      return;

    const messageData = {
      text: messageInput,
      username,
      room,
      timestamp: new Date(),
    };

    socket.emit("message", messageData);

    setMessageInput("");
  };

  // ===============================
  // JOIN SCREEN
  // ===============================

  if (!joined) {
    return (
      <div
        className={`flex justify-center items-center min-h-screen px-4 ${
          darkMode
            ? "bg-[#020817]"
            : "bg-gradient-to-br from-slate-100 to-slate-200"
        }`}
      >
        <div
          className={`w-full max-w-md rounded-3xl shadow-2xl p-8 ${
            darkMode
              ? "bg-[#111827] text-white"
              : "bg-white"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">
              SyncTalk
            </h1>

            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition ${
                darkMode
                  ? "bg-yellow-400 text-black"
                  : "bg-gray-800 text-white"
              }`}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>

          <p
            className={`text-center mb-8 ${
              darkMode
                ? "text-gray-300"
                : "text-gray-500"
            }`}
          >
            Join a realtime chat room
          </p>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              className={`w-full px-4 py-4 rounded-2xl border outline-none ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "border-gray-300"
              }`}
            />

            <input
              type="text"
              placeholder="Enter room name"
              value={room}
              onChange={(e) =>
                setRoom(e.target.value)
              }
              className={`w-full px-4 py-4 rounded-2xl border outline-none ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "border-gray-300"
              }`}
            />

            <button
              onClick={joinRoom}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-4 rounded-2xl font-semibold transition"
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
    <div
      className={`flex justify-center items-center min-h-screen px-4 ${
        darkMode
          ? "bg-[#020817]"
          : "bg-gradient-to-br from-slate-100 to-slate-200"
      }`}
    >
      <div
        className={`w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden ${
          darkMode
            ? "bg-[#111827] text-white"
            : "bg-white"
        }`}
      >
        <div className="flex h-[750px]">
          {/* ===============================
              SIDEBAR
          =============================== */}

          <div
            className={`w-[280px] border-r p-5 ${
              darkMode
                ? "bg-[#0f172a] border-gray-700"
                : "bg-gray-100 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">
                SyncTalk
              </h1>

              <button
                onClick={() =>
                  setDarkMode(!darkMode)
                }
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition ${
                  darkMode
                    ? "bg-yellow-400 text-black"
                    : "bg-gray-800 text-white"
                }`}
              >
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>

            <div className="mb-6">
              <p
                className={`text-sm ${
                  darkMode
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              >
                Room
              </p>

              <h2 className="text-xl font-semibold mt-1">
                #{room}
              </h2>
            </div>

            {/* Users */}
            <div>
              <p
                className={`text-sm mb-3 ${
                  darkMode
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              >
                Active Users (
                {roomUsers.length})
              </p>

              <div className="space-y-2">
                {roomUsers.map((user, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 rounded-xl ${
                      darkMode
                        ? "bg-gray-800"
                        : "bg-white"
                    }`}
                  >
                    {user}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===============================
              CHAT AREA
          =============================== */}

          <div className="flex flex-col flex-1">
            {/* Messages */}
            <div
              className={`flex-1 overflow-y-auto p-6 space-y-4 ${
                darkMode
                  ? "bg-[#020617]"
                  : "bg-gray-50"
              }`}
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No messages yet. Start chatting 🚀
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${
                      msg.username === username
                        ? "items-end"
                        : "items-start"
                    }`}
                  >
                    <span
                      className={`text-xs mb-1 ${
                        darkMode
                          ? "text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      {msg.username}
                    </span>

                    <div
                      className={`px-5 py-3 rounded-2xl shadow-sm max-w-[75%] break-words ${
                        msg.username === username
                          ? "bg-indigo-500 text-white"
                          : msg.username ===
                            "System"
                          ? "bg-emerald-500 text-white"
                          : darkMode
                          ? "bg-gray-700 text-white"
                          : "bg-gray-200 text-black"
                      }`}
                    >
                      {msg.text}
                    </div>

                    <span
                      className={`text-xs mt-1 ${
                        darkMode
                          ? "text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(
                        msg.timestamp
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className={`p-5 border-t ${
                darkMode
                  ? "border-gray-700 bg-[#111827]"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Message your team..."
                  value={messageInput}
                  onChange={(e) =>
                    setMessageInput(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    sendMessage()
                  }
                  className={`w-full px-6 py-4 rounded-2xl outline-none border text-lg ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "border-gray-300"
                  }`}
                />

                <button
                  onClick={sendMessage}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold transition whitespace-nowrap"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;