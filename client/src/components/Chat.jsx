import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("https://synctalk-backend-w7lj.onrender.com");

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const messagesEndRef = useRef(null);

  // Listen for live messages
  useEffect(() => {
    socket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Load previous room messages
    socket.on("previous_messages", (previousMessages) => {
      setMessages(previousMessages);
    });

    return () => {
      socket.off("message");
      socket.off("previous_messages");
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // Join room
  const joinRoom = () => {
    if (username.trim() === "" || room.trim() === "") return;

    setJoined(true);

    // Join socket room
    socket.emit("join_room", room);

    // Welcome message
    socket.emit("message", {
      text: `${username} joined the room`,
      username: "System",
      room,
      timestamp: new Date(),
    });
  };

  // Send message
  const sendMessage = () => {
    if (messageInput.trim() === "") return;

    const messageData = {
      text: messageInput,
      username,
      room,
      timestamp: new Date(),
    };

    socket.emit("message", messageData);

    setMessageInput("");
  };

  // JOIN SCREEN
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
            darkMode ? "bg-[#111827] text-white" : "bg-white"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">
              SyncTalk
            </h1>

            <button
              onClick={() => setDarkMode(!darkMode)}
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
              darkMode ? "text-gray-300" : "text-gray-500"
            }`}
          >
            Join a realtime chat room
          </p>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setRoom(e.target.value)}
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

  // CHAT SCREEN
  return (
    <div
      className={`flex justify-center items-center min-h-screen px-4 ${
        darkMode
          ? "bg-[#020817]"
          : "bg-gradient-to-br from-slate-100 to-slate-200"
      }`}
    >
      <div
        className={`w-full max-w-5xl rounded-3xl shadow-2xl p-6 ${
          darkMode ? "bg-[#111827] text-white" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`mb-5 border-b pb-4 ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl font-bold">
              SyncTalk
            </h1>

            <button
              onClick={() => setDarkMode(!darkMode)}
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
            className={`text-center text-sm mt-2 ${
              darkMode ? "text-gray-300" : "text-gray-500"
            }`}
          >
            Room: {room}
          </p>
        </div>

        {/* Messages */}
        <div
          className={`h-[550px] overflow-y-auto rounded-3xl p-5 space-y-4 ${
            darkMode ? "bg-[#020617]" : "bg-gray-50"
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
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {msg.username}
                </span>

                <div
                  className={`px-5 py-3 rounded-2xl shadow-sm max-w-[75%] break-words ${
                    msg.username === username
                      ? "bg-indigo-500 text-white"
                      : msg.username === "System"
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
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="mt-5 flex items-center gap-4 w-full">
          <input
            type="text"
            placeholder="Message your team..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
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
  );
}

export default Chat;