"use client";
import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  translation: string | null;
  showTranslation: boolean | "loading";
  audioUrl: string | null;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "こんにちは！日本語を練習しましょう！Type in any language — Japanese, Cantonese, English or mixed! 😊",
    translation: null,
    showTranslation: false,
    audioUrl: null,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── TTS: play cached or fetch ────────────────────────
  const speakText = async (text: string, index: number) => {
    const msg = messages[index];
    if (msg.audioUrl) {
      new Audio(msg.audioUrl).play();
      return;
    }
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const url = URL.createObjectURL(await res.blob());
      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, audioUrl: url } : m
      ));
      new Audio(url).play();
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  // ─── Pre-fetch audio in background ───────────────────
  const prefetchAudio = (text: string, index: number) => {
    fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then(res => res.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, audioUrl: url } : m
      ));
    }).catch(e => console.error("Pre-fetch TTS error:", e));
  };

  // ─── Chat: send message to AI ─────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const updated: Message[] = [...messages, {
      role: "user", content: text,
      translation: null, showTranslation: false,
      audioUrl: null,
    }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const { reply } = await res.json();
      if (!reply) throw new Error("No reply");

      const newIndex = updated.length;
      setMessages([...updated, {
        role: "assistant", content: reply,
        translation: null, showTranslation: false,
        audioUrl: null,
      }]);

      // pre-fetch audio in background so speaker button is instant
      prefetchAudio(reply, newIndex);

    } catch {
      setMessages([...updated, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        translation: null, showTranslation: false,
        audioUrl: null,
      }]);
    }
    setLoading(false);
  };

  // ─── Translation: 文A button ──────────────────────────
  const toggleTranslation = async (index: number) => {
    const msg = messages[index];
    if (msg.translation) {
      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, showTranslation: !m.showTranslation } : m
      ));
      return;
    }
    setMessages(prev => prev.map((m, i) =>
      i === index ? { ...m, showTranslation: "loading" } : m
    ));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translate: true,
          messages: [{ role: "user", content: msg.content }],
        }),
      });
      const { reply } = await res.json();
      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, translation: reply, showTranslation: true } : m
      ));
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, showTranslation: false } : m
      ));
    }
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-medium text-sm">JP</div>
          <div>
            <div className="font-medium text-gray-900 text-sm">Japanese tutor</div>
            <div className="text-xs text-gray-400">Type in any language — I'll understand!</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-medium flex-shrink-0 mt-1">JP</div>
              )}
              <div className="max-w-xs">
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}>
                  {msg.content}

                  {msg.showTranslation === "loading" && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-400">
                      Translating...
                    </div>
                  )}
                  {msg.showTranslation === true && msg.translation && (
                    <div className={`mt-2 pt-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "border-t border-blue-400 text-blue-100"
                        : "border-t border-gray-200 text-gray-500"
                    }`}>
                      {msg.translation}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className={`flex items-center gap-2 mt-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <button
                      onClick={() => speakText(msg.content, i)}
                      className={`transition-colors ${msg.role === "user" ? "text-blue-200 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
                      title={msg.audioUrl ? "Play" : "Loading audio..."}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    </button>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => toggleTranslation(i)}
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                          msg.showTranslation === true
                            ? "border-gray-300 text-gray-400"
                            : "border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-500"
                        }`}
                      >
                        <span>文A</span>
                        <span>{msg.showTranslation === true ? "隱藏" : msg.showTranslation === "loading" ? "..." : "翻譯"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-medium flex-shrink-0">JP</div>
              <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm text-gray-400 text-sm">Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(input)}
              placeholder="Type in any language..."
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-full outline-none focus:border-blue-300 bg-gray-50 text-gray-900"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}