```jsx
import {
  useEffect,
  useRef,
  useState,
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
  // THEME
  // ===============================

  const theme = darkMode
    ? {
        bg: "bg-[#020817]",
        card: "bg-[#111827]",
        sidebar: "bg-[#0f172a]",
        text: "text-white",
        input: "bg-gray-700",
      }
    : {
        bg: "bg-gray-100",
        card: "bg-white",
        sidebar: "bg-gray-200",
        text: "text-black",
        input: "bg-gray-300",
      };

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
      (msgs) => {
        setMessages(msgs);
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

    return () => {
      socket.off("message");
      socket.off(
        "previous_messages"
      );
      socket.off("room_users");
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, []);

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
  // SEND
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

    socket.emit("typing", {
      room,
      username,
    });
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
              className={`w-full px-4 py-4 rounded-2xl outline-none ${theme.input}`}
            />

            <input
              type="text"
              placeholder="Room Name"
              value={room}
              onChange={(e) =>
                setRoom(e.target.value)
              }
              className={`w-full px-4 py-4 rounded-2xl outline-none ${theme.input}`}
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
  // MAIN UI
  // ===============================

  return (
    <div
      className={`h-screen flex overflow-hidden ${theme.bg} ${theme.text}`}
    >
      {/* SIDEBAR */}

      {showSidebar && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
          <div
            className={`w-[280px] h-full p-5 ${theme.sidebar}`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Room
              </h2>

              <button
                onClick={() =>
                  setShowSidebar(false)
                }
              >
                ✕
              </button>
            </div>

            <h3 className="text-xl font-semibold mb-6">
              #{room}
            </h3>

            <p className="text-sm mb-3">
              Active Users (
              {roomUsers.length})
            </p>

            <div className="space-y-2">
              {roomUsers.map(
                (user, index) => (
                  <div
                    key={index}
                    className="bg-gray-700 rounded-xl px-4 py-3"
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

      <div
        className={`hidden lg:flex w-[300px] flex-col p-5 border-r border-gray-700 ${theme.sidebar}`}
      >
        <h1 className="text-3xl font-bold mb-6">
          SyncTalk
        </h1>

        <h2 className="text-2xl font-semibold mb-6">
          #{room}
        </h2>

        <p className="text-sm mb-3">
          Active Users (
          {roomUsers.length})
        </p>

        <div className="space-y-2">
          {roomUsers.map(
            (user, index) => (
              <div
                key={index}
                className="bg-gray-700 rounded-xl px-4 py-3 text-white"
              >
                {user}
              </div>
            )
          )}
        </div>
      </div>

      {/* CHAT */}

      <div className="flex-1 flex flex-col">
        {/* TOPBAR */}

        <div
          className={`h-[70px] border-b border-gray-700 flex items-center justify-between px-4 ${theme.card}`}
        >
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

              <p className="text-xs opacity-70">
                #{room}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
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
              <div
                className={`absolute top-14 right-0 w-48 rounded-2xl shadow-2xl overflow-hidden z-50 ${theme.card}`}
              >
                <button
                  onClick={() => {
                    socket.emit(
                      "clear_room",
                      room
                    );

                    setShowMenu(false);
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-gray-700"
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
                  className="w-full text-left px-5 py-4 hover:bg-gray-700"
                >
                  Delete Room
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                msg.username === username
                  ? "items-end"
                  : "items-start"
              }`}
            >
              <span className="text-xs mb-1 opacity-70">
                {msg.username}
              </span>

              <div
                className={`px-4 py-3 rounded-2xl max-w-[85%] break-words ${
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
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* TYPING */}

        <div className="px-4 h-7 text-sm italic opacity-70">
          {typingUser &&
            `${typingUser} is typing...`}
        </div>

        {/* INPUT */}

        <div
          className={`border-t border-gray-700 p-3 ${theme.card}`}
        >
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
              className={`flex-1 px-5 py-4 rounded-2xl outline-none ${theme.input}`}
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
