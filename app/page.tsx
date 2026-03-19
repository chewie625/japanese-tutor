"use client";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "こんにちは！日本語を練習しましょう！Press the mic and speak — mix Japanese and Cantonese freely, I'll help you fix it! 🎙️",
      translation: null,
      showTranslation: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speakText = async (text) => {
    console.log("speakText called with:", text);
    if (!text || !text.trim()) {
      console.warn("speakText: empty text, skipping");
      return;
    }
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "TTS failed");
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (e) {
      console.error("TTS error:", e);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleTranslation = async (index) => {
    const msg = messages[index];
    if (msg.translation) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === index ? { ...m, showTranslation: !m.showTranslation } : m
        )
      );
      return;
    }
    setMessages((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, showTranslation: "loading" } : m
      )
    );
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Translate this Japanese text to Cantonese (Traditional Chinese). Reply with ONLY the Cantonese translation, no explanation, no Japanese, nothing else: "${msg.content}"`,
            },
          ],
        }),
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m, i) =>
          i === index
            ? { ...m, translation: data.reply, showTranslation: true }
            : m
        )
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === index ? { ...m, showTranslation: false } : m
        )
      );
    }
  };

  const sendMessage = async (text) => {
    if (!text || !text.trim()) return;
    const userMessage = {
      role: "user",
      content: text,
      translation: null,
      showTranslation: false,
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      const replyText = data.reply;
      console.log("AI reply:", replyText);

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: replyText,
          translation: null,
          showTranslation: false,
        },
      ]);

      if (replyText) {
        await speakText(replyText);
      }
    } catch (e) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          translation: null,
          showTranslation: false,
        },
      ]);
    }
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (e) {
      alert("Microphone access denied. Please allow mic access and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      console.log("Transcription result:", data);
      if (data.text && data.text.trim()) {
        await sendMessage(data.text.trim());
      }
    } catch (e) {
      console.error("Transcription failed:", e);
    }
    setTranscribing(false);
  };

  const toggleMic = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const statusText = () => {
    if (recording) return "Recording... tap to stop";
    if (transcribing) return "Transcribing...";
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-medium text-sm">JP</div>
          <div>
            <div className="font-medium text-gray-900 text-sm">Japanese tutor</div>
            <div className="text-xs text-gray-400">Speak or type — mix Japanese and Cantonese freely</div>
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

                  {/* Buttons inside bubble */}
                  <div className={`flex items-center gap-2 mt-2 pt-1 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <button
                      onClick={() => speakText(msg.content)}
                      className={`transition-colors ${
                        msg.role === "user"
                          ? "text-blue-200 hover:text-white"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                      title="Listen"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    </button>

                    {msg.role === "assistant" && (
                      <button
                        onClick={() => toggleTranslation(i)}
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border ${
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

          {(loading || transcribing) && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-medium flex-shrink-0">JP</div>
              <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm text-gray-400 text-sm">
                {transcribing ? "Transcribing..." : "Thinking..."}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          {statusText() && (
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-red-500">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {statusText()}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <button
              onClick={toggleMic}
              disabled={transcribing}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${
                recording
                  ? "bg-red-50 border-red-200 text-red-500"
                  : transcribing
                  ? "bg-gray-50 border-gray-100 text-gray-300"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {transcribing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/>
                  <line x1="12" y1="20" x2="12" y2="23"/>
                  <line x1="9" y1="23" x2="15" y2="23"/>
                </svg>
              )}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Or type in Japanese..."
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