```jsx
import { useEffect, useRef, useState } from "react";
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

  const [roomUsers, setRoomUsers] =
    useState([]);

  const [typingUser, setTypingUser] =
    useState("");

  const [showSidebar, setShowSidebar] =
    useState(false);

  const [showMenu, setShowMenu] =
    useState(false);

  const [darkMode, setDarkMode] =
    useState(true);

  const messagesEndRef = useRef(null);

  // ===============================
  // SOCKET
  // ===============================

  useEffect(() => {
    socket.on("message", (message) => {
      setMessages((prev) => [
        ...prev,
        message,
      ]);
    });

    socket.on(
      "previous_messages",
      (messages) => {
        setMessages(messages);
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

    return () => {
      socket.off("message");
      socket.off(
        "previous_messages"
      );
      socket.off("room_users");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("room_cleared");
    };
  }, []);

  // ===============================
  // AUTO SCROLL
  // ===============================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ===============================
  // JOIN
  // ===============================

  const joinRoom = () => {
    if (
      !username.trim() ||
      !room.trim()
    )
      return;

    socket.emit("join_room", {
      username,
      room,
    });

    setJoined(true);
  };

  // ===============================
  // SEND MESSAGE
  // ===============================

  const sendMessage = () => {
    if (!messageInput.trim())
      return;

    socket.emit("message", {
      text: messageInput,
      username,
      room,
      timestamp: new Date(),
    });

    setMessageInput("");

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
  // THEME
  // ===============================

  const theme = darkMode
    ? {
        bg: "bg-[#020817]",
        secondary: "bg-[#0f172a]",
        card: "bg-[#111827]",
        text: "text-white",
      }
    : {
        bg: "bg-gray-100",
        secondary: "bg-white",
        card: "bg-white",
        text: "text-black",
      };

  // ===============================
  // JOIN SCREEN
  // ===============================

  if (!joined) {
    return (
      <div
        className={`h-screen flex items-center justify-center px-4 ${theme.bg}`}
      >
        <div
          className={`w-full max-w-md rounded-3xl p-8 shadow-2xl ${theme.card} ${theme.text}`}
        >
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">
              SyncTalk
            </h1>

            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              className="w-11 h-11 rounded-full bg-indigo-500 text-white text-lg"
            >
              {darkMode ? "☀️" : "🌙"}
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
              className="w-full px-4 py-4 rounded-2xl bg-gray-700 text-white outline-none"
            />

            <input
              type="text"
              placeholder="Room"
              value={room}
              onChange={(e) =>
                setRoom(e.target.value)
              }
              className="w-full px-4 py-4 rounded-2xl bg-gray-700 text-white outline-none"
            />

            <button
              onClick={joinRoom}
              className="w-full bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-semibold text-white"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // CHAT UI
  // ===============================

  return (
    <div
      className={`h-screen flex overflow-hidden ${theme.bg} ${theme.text}`}
    >
      {/* SIDEBAR */}

      <div
        className={`fixed lg:relative z-50 top-0 left-0 h-full w-[280px] p-5 transition-transform duration-300 ${theme.secondary}
        ${
          showSidebar
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">
            SyncTalk
          </h1>

          <button
            className="lg:hidden text-2xl"
            onClick={() =>
              setShowSidebar(false)
            }
          >
            ✕
          </button>
        </div>

        <p className="text-sm opacity-70">
          Room
        </p>

        <h2 className="text-2xl font-bold mb-6">
          #{room}
        </h2>

        <p className="text-sm opacity-70 mb-3">
          Active Users (
          {roomUsers.length})
        </p>

        <div className="space-y-2">
          {roomUsers.map(
            (user, index) => (
              <div
                key={index}
                className="px-4 py-3 rounded-xl bg-gray-700 text-white"
              >
                {user}
              </div>
            )
          )}
        </div>
      </div>

      {/* MAIN */}

      <div className="flex-1 flex flex-col">
        {/* TOPBAR */}

        <div
          className={`h-[70px] px-4 flex items-center justify-between border-b border-gray-700 ${theme.card}`}
        >
          {/* LEFT */}

          <div className="flex items-center gap-3">
            <button
              className="text-2xl lg:hidden"
              onClick={() =>
                setShowSidebar(true)
              }
            >
              ☰
            </button>

            <div>
              <h1 className="font-bold text-xl">
                SyncTalk
              </h1>

              <p className="text-xs opacity-70">
                #{room}
              </p>
            </div>
          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-3 relative">
            {/* THEME */}

            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              className="w-10 h-10 rounded-full bg-indigo-500 text-white"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {/* MENU */}

            <button
              onClick={() =>
                setShowMenu(!showMenu)
              }
              className="text-3xl leading-none"
            >
              ⋮
            </button>

            {showMenu && (
              <div
                className={`absolute top-14 right-0 w-52 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 z-50 ${theme.card}`}
              >
                <button
                  onClick={() => {
                    socket.emit(
                      "clear_room",
                      room
                    );

                    setShowMenu(false);
                  }}
                  className="w-full px-5 py-4 text-left hover:bg-gray-700"
                >
                  Clear Chat
                </button>

                <button
                  onClick={() => {
                    socket.emit(
                      "delete_room",
                      room
                    );

                    setShowMenu(false);
                  }}
                  className="w-full px-5 py-4 text-left hover:bg-gray-700"
                >
                  Delete Room
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col message-animation ${
                msg.username === username
                  ? "items-end"
                  : "items-start"
              }`}
            >
              <span className="text-xs opacity-70 mb-1">
                {msg.username}
              </span>

              <div
                className={`px-4 py-3 rounded-2xl max-w-[80%] break-words ${
                  msg.username === username
                    ? "bg-indigo-500 text-white"
                    : msg.username ===
                      "System"
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-700 text-white"
                }`}
              >
                {msg.text}
              </div>

              <span className="text-xs opacity-60 mt-1">
                {new Date(
                  msg.timestamp
                ).toLocaleTimeString()}
              </span>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* TYPING */}

        <div className="h-6 px-4 text-sm italic opacity-70">
          {typingUser &&
            `${typingUser} is typing...`}
        </div>

        {/* INPUT */}

        <div
          className={`p-3 border-t border-gray-700 ${theme.card}`}
        >
          <div className="flex items-center gap-3">
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
              className="flex-1 px-5 py-4 rounded-2xl bg-gray-700 text-white outline-none"
            />

            <button
              onClick={sendMessage}
              className="bg-indigo-500 hover:bg-indigo-600 px-6 py-4 rounded-2xl font-semibold text-white"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
```
