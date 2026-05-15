import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("https://synctalk-backend-w7lj.onrender.com", {
  transports: ["websocket"],
});

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("synctalk-theme") || "dark";
  });
  const [roomUsers, setRoomUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const usernameRef = useRef("");
  const roomRef = useRef("");

  const notificationSound = useRef(
    new Audio(
      "https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3"
    )
  );

  const isDark = theme === "dark";

  const themeStyles = useMemo(
    () =>
      isDark
        ? {
            app: "bg-slate-950 text-slate-100",
            panel: "bg-slate-900/95",
            panelSoft: "bg-slate-900/80",
            border: "border-slate-800",
            text: "text-slate-100",
            muted: "text-slate-400",
            input:
              "bg-gray-700 border border-gray-600 text-slate-100 placeholder:text-slate-400",
            bubbleMine: "bg-indigo-500 text-white",
            bubbleOther: "bg-slate-800 text-slate-100",
            bubbleSystem: "bg-emerald-600 text-white",
            chip: "bg-slate-800 text-slate-200",
            subtleButton: "bg-slate-800 hover:bg-slate-700 text-slate-100",
            dangerButton: "bg-stone-600 hover:bg-stone-700 text-white",
            pageBg: "bg-slate-950",
            cardShadow: "shadow-2xl shadow-black/30",
          }
        : {
            app: "bg-slate-100 text-slate-900",
            panel: "bg-white/95",
            panelSoft: "bg-white/80",
            border: "border-slate-200",
            text: "text-slate-900",
            muted: "text-slate-500",
            input:
              "bg-gray-700 border border-gray-600 text-slate-100 placeholder:text-slate-400",
            bubbleMine: "bg-indigo-600 text-white",
            bubbleOther: "bg-white text-slate-900",
            bubbleSystem: "bg-emerald-500 text-white",
            chip: "bg-slate-100 text-slate-700",
            subtleButton: "bg-slate-200 hover:bg-slate-300 text-slate-900",
            dangerButton: "bg-stone-600 hover:bg-stone-700 text-white",
            pageBg: "bg-slate-100",
            cardShadow: "shadow-2xl shadow-slate-400/20",
          },
    [isDark]
  );

  const typingText = useMemo(() => {
    const visibleTypingUsers = [...new Set(typingUsers)].filter(
      (user) => user && user !== usernameRef.current
    );

    if (visibleTypingUsers.length === 0) return "";

    if (visibleTypingUsers.length === 1) {
      return `${visibleTypingUsers[0]} is typing...`;
    }

    if (visibleTypingUsers.length === 2) {
      return `${visibleTypingUsers[0]} and ${visibleTypingUsers[1]} are typing...`;
    }

    return `${visibleTypingUsers[0]}, ${visibleTypingUsers[1]} and ${
      visibleTypingUsers.length - 2
    } others are typing...`;
  }, [typingUsers]);

  useEffect(() => {
    localStorage.setItem("synctalk-theme", theme);
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme, isDark]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsNearBottom(distanceFromBottom < 120);
  };

  useEffect(() => {
    const handleMessage = (message) => {
      setMessages((prev) => [...prev, message]);

      if (
        message.username !== usernameRef.current &&
        message.username !== "System"
      ) {
        notificationSound.current.play().catch(() => {});
      }
    };

    const handlePreviousMessages = (previousMessages) => {
      setMessages(previousMessages || []);
    };

    const handleRoomUsers = (payload) => {
      const users = Array.isArray(payload) ? payload : payload?.users || [];
      setRoomUsers(users);
    };

    const handleRoomCleared = () => {
      setMessages([]);
      setTypingUsers([]);
    };

    const handleTypingUsers = (users) => {
      setTypingUsers(Array.isArray(users) ? users : []);
    };

    const handleMessageDeletedForEveryone = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                text: "This message was deleted",
                deleted: true,
              }
            : msg
        )
      );
    };

    const handleRoomDeleted = () => {
      alert("Room deleted");
      setMessages([]);
      setJoined(false);
      setRoom("");
      setRoomUsers([]);
      setTypingUsers([]);
      setMessageInput("");
      setSidebarOpen(false);
    };

    socket.on("message", handleMessage);
    socket.on("previous_messages", handlePreviousMessages);
    socket.on("room_users", handleRoomUsers);
    socket.on("room_cleared", handleRoomCleared);
    socket.on("typing_users", handleTypingUsers);
    socket.on("message_deleted_everyone", handleMessageDeletedForEveryone);
    socket.on("room_deleted", handleRoomDeleted);

    return () => {
      socket.off("message", handleMessage);
      socket.off("previous_messages", handlePreviousMessages);
      socket.off("room_users", handleRoomUsers);
      socket.off("room_cleared", handleRoomCleared);
      socket.off("typing_users", handleTypingUsers);
      socket.off("message_deleted_everyone", handleMessageDeletedForEveryone);
      socket.off("room_deleted", handleRoomDeleted);
    };
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom("smooth");
    }
  }, [messages, typingUsers, isNearBottom]);

  const emitStopTyping = () => {
    const cleanRoom = roomRef.current.trim();
    const cleanUsername = usernameRef.current.trim();

    if (!cleanRoom || !cleanUsername) return;

    socket.emit("stop_typing", {
      room: cleanRoom,
      username: cleanUsername,
    });
  };

  const joinRoom = () => {
    const cleanUsername = username.trim();
    const cleanRoom = room.trim();

    if (!cleanUsername || !cleanRoom) return;

    setUsername(cleanUsername);
    setRoom(cleanRoom);
    setMessages([]);
    setRoomUsers([]);
    setTypingUsers([]);
    setMessageInput("");
    setJoined(true);
    setSidebarOpen(false);

    socket.emit("join_room", {
      username: cleanUsername,
      room: cleanRoom,
    });

    requestAnimationFrame(() => scrollToBottom("auto"));
  };

  const sendMessage = () => {
    const cleanMessage = messageInput.trim();
    const cleanRoom = roomRef.current.trim();
    const cleanUsername = usernameRef.current.trim();

    if (!cleanMessage || !cleanRoom || !cleanUsername) return;

    socket.emit("message", {
      text: cleanMessage,
      username: cleanUsername,
      room: cleanRoom,
      timestamp: new Date(),
    });

    setMessageInput("");
    emitStopTyping();
    setTypingUsers([]);
    setIsNearBottom(true);
    requestAnimationFrame(() => scrollToBottom("smooth"));
  };

  const clearChat = () => {
    const confirmClear = window.confirm("Clear all messages?");
    if (!confirmClear) return;

    socket.emit("clear_room", roomRef.current.trim());
  };

  const deleteRoom = () => {
    const confirmDelete = window.confirm("Delete this room permanently?");
    if (!confirmDelete) return;

    socket.emit("delete_room", roomRef.current.trim());
  };

  const deleteMessage = (messageId, type) => {
    if (type === "me") {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      return;
    }

    socket.emit("delete_message_everyone", {
      messageId,
      room: roomRef.current.trim(),
    });
  };

  const handleMessageInputChange = (e) => {
    const value = e.target.value;
    setMessageInput(value);

    const cleanRoom = roomRef.current.trim();
    const cleanUsername = usernameRef.current.trim();

    if (!cleanRoom || !cleanUsername) return;

    if (value.length > 0) {
      socket.emit("typing", {
        room: cleanRoom,
        username: cleanUsername,
      });
    } else {
      emitStopTyping();
    }
  };

  const handleMessageInputBlur = () => {
    emitStopTyping();
  };

  const themeToggleButton = (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${themeStyles.border} ${themeStyles.subtleButton} transition`}
      aria-label="Toggle theme"
      type="button"
    >
      <span className="text-lg leading-none">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );

  if (!joined) {
    return (
      <div className={`flex min-h-[100dvh] items-center justify-center px-4 ${themeStyles.pageBg}`}>
        <div
          className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 ${themeStyles.panel} ${themeStyles.border} ${themeStyles.cardShadow}`}
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className={`text-4xl font-bold ${themeStyles.text}`}>
                SyncTalk
              </h1>
              <p className={`mt-2 text-sm ${themeStyles.muted}`}>
                Join a realtime chat room
              </p>
            </div>
            {themeToggleButton}
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              joinRoom();
            }}
          >
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-4 outline-none transition ${themeStyles.input}`}
            />

            <input
              type="text"
              placeholder="Room Name"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className={`w-full rounded-2xl border px-4 py-4 outline-none transition ${themeStyles.input}`}
            />

            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-500 px-4 py-4 font-semibold text-white transition hover:bg-indigo-600"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  const visibleRoomUsers = [...new Set(roomUsers)].filter(Boolean);

  return (
    <div className={`relative flex h-[100dvh] w-full overflow-hidden ${themeStyles.app}`}>
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[300px] max-w-[86vw] flex-col border-r ${themeStyles.panel} ${themeStyles.border} ${themeStyles.cardShadow} transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className={`border-b ${themeStyles.border} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-lg font-bold text-indigo-400">
                S
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className={`truncate text-2xl font-bold ${themeStyles.text}`}>
                    SyncTalk
                  </h1>
                  <div className="hidden lg:block">{themeToggleButton}</div>
                </div>
                <p className={`text-xs ${themeStyles.muted}`}>
                  Realtime room controls
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${themeStyles.border} ${themeStyles.subtleButton} transition lg:hidden`}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-indigo-500/10 px-4 py-3">
            <div>
              <p className={`text-xs uppercase tracking-wide ${themeStyles.muted}`}>
                Room
              </p>
              <h2 className={`truncate text-lg font-semibold ${themeStyles.text}`}>
                #{room}
              </h2>
            </div>

            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              {visibleRoomUsers.length} online
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <p className={`mb-2 text-sm font-medium ${themeStyles.muted}`}>
                Actions
              </p>

              <div className="space-y-3">
                <button
                  onClick={clearChat}
                  className={`w-full rounded-2xl px-4 py-3 font-medium transition ${themeStyles.subtleButton}`}
                  type="button"
                >
                  Clear Chat
                </button>

                <button
                  onClick={deleteRoom}
                  className={`w-full rounded-2xl px-4 py-3 font-medium transition ${themeStyles.dangerButton}`}
                  type="button"
                >
                  Delete Room
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className={`text-sm font-medium ${themeStyles.muted}`}>
                  Active Users
                </p>
                <span className={`text-xs ${themeStyles.muted}`}>
                  {visibleRoomUsers.length}
                </span>
              </div>

              <div className="space-y-2">
                {visibleRoomUsers.length === 0 ? (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${themeStyles.border} ${themeStyles.panelSoft} ${themeStyles.muted}`}>
                    No one else is here yet.
                  </div>
                ) : (
                  visibleRoomUsers.map((user, index) => (
                    <div
                      key={`${user}-${index}`}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${themeStyles.border} ${themeStyles.panelSoft}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <span className={`truncate text-sm font-medium ${themeStyles.text}`}>
                        {user}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`border-t p-4 text-xs ${themeStyles.border} ${themeStyles.muted}`}>
          Connected to room controls and message history.
        </div>
      </aside>

      <main className={`flex min-w-0 flex-1 flex-col ${themeStyles.pageBg}`}>
        <header
          className={`sticky top-0 z-10 border-b backdrop-blur-xl ${themeStyles.panel} ${themeStyles.border}`}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${themeStyles.border} ${themeStyles.subtleButton} transition lg:hidden`}
                aria-label="Open sidebar"
              >
                ☰
              </button>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className={`truncate text-lg font-semibold ${themeStyles.text}`}>
                    #{room}
                  </h2>

                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${themeStyles.chip}`}>
                    {visibleRoomUsers.length} online
                  </span>
                </div>

                <p className={`mt-1 text-xs ${themeStyles.muted}`}>
                  {typingText || "Connected"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={`inline-flex rounded-2xl border px-3 py-2 text-sm lg:hidden ${themeStyles.border} ${themeStyles.subtleButton}`}
              >
                Users
              </button>
            </div>
          </div>
        </header>

        <section
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 ${themeStyles.pageBg}`}
        >
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isMine = msg.username === usernameRef.current;
              const isSystem = msg.username === "System";

              return (
                <div
  key={msg._id || `${msg.username}-${msg.timestamp}-${index}`}
  className={`message-animation flex w-full ${
    isSystem ? "justify-center" : isMine ? "justify-end" : "justify-start"
  }`}
>
  <div className={`flex max-w-[92%] flex-col ${isMine ? "items-end" : "items-start"} sm:max-w-[78%]`}>
    {!isSystem && (
      <div
        className={`mb-1 text-xs ${isMine ? "text-right" : "text-left"} ${themeStyles.muted}`}
      >
        {msg.username}
      </div>
    )}

    <div
      className={`inline-block w-fit max-w-full rounded-2xl px-4 py-3 shadow-sm ${
        isSystem
          ? themeStyles.bubbleSystem
          : isMine
          ? themeStyles.bubbleMine
          : themeStyles.bubbleOther
      } ${msg.deleted ? "italic opacity-80" : ""}`}
    >
      <p className="max-w-full break-words whitespace-pre-wrap">
        {msg.text}
      </p>
    </div>

    {!isSystem && (
      <div
        className={`mt-1 text-xs ${isMine ? "text-right" : "text-left"} ${themeStyles.muted}`}
      >
        {msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : ""}
      </div>
    )}

    {isMine && !msg.deleted && !isSystem && (
      <div className={`mt-2 flex gap-3 ${isMine ? "justify-end" : "justify-start"}`}>
        <button
          type="button"
          onClick={() => deleteMessage(msg._id, "me")}
          className="text-xs text-slate-400 transition hover:text-current"
        >
          Delete for me
        </button>
        <button
          type="button"
          onClick={() => deleteMessage(msg._id, "everyone")}
          className="text-xs text-slate-400 transition hover:text-current"
        >
          Delete for everyone
        </button>
      </div>
    )}
  </div>
</div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        </section>

        <div className={`border-t px-3 py-3 sm:px-6 ${themeStyles.panel} ${themeStyles.border}`}>
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={handleMessageInputChange}
              onBlur={handleMessageInputBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className={`min-w-0 flex-1 rounded-2xl px-4 py-4 outline-none transition ${themeStyles.input}`}
            />

            <button
              type="submit"
              disabled={!messageInput.trim()}
              className={`rounded-2xl px-5 py-4 font-semibold transition ${
                messageInput.trim()
                  ? "bg-indigo-500 text-white hover:bg-indigo-600"
                  : "cursor-not-allowed bg-indigo-500/40 text-white/70"
              }`}
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Chat;