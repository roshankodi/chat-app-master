import { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function Chat() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  useEffect(() => {
    socket.on("message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off("message");
    };
  }, []);

  const sendMessage = () => {
    if (messageInput.trim() === "") return;

    const message = {
      text: messageInput,
      timestamp: new Date(),
    };

    socket.emit("message", message);
    setMessageInput("");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4">
        
        {/* Header */}
        <div className="mb-4 border-b pb-3">
          <h1 className="text-3xl font-bold text-gray-800 text-center">
            SyncTalk
          </h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Realtime Team Communication
          </p>
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto bg-gray-50 rounded-xl p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No messages yet. Start the conversation 🚀
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="flex flex-col items-start">
                <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl shadow-sm max-w-[80%] break-words">
                  {msg.text}
                </div>

                <span className="text-xs text-gray-500 mt-1 ml-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Message your team..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            onClick={sendMessage}
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;