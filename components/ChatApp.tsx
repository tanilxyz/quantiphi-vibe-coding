"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ConversationDetail, ConversationSummary, Tone } from "@/types/chat";

const TONES: Tone[] = ["Professional", "Casual", "Concise"];
const SUGGESTIONS = [
  "Explain a complex topic in simple terms",
  "Help me plan a productive week",
  "Review an idea and suggest improvements",
];

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatApp() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tone, setTone] = useState<Tone>("Professional");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setConversations(data.conversations ?? []);
    } catch (error) {
      console.error("History refresh failed:", error);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const startNewChat = () => {
    abortRef.current?.abort();
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setNotice("");
    setBusy(false);
    textareaRef.current?.focus();
  };

  const openConversation = async (id: string) => {
    if (busy) return;
    setLoadingHistory(true);
    setNotice("");
    try {
      const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open conversation.");
      const conversation = data.conversation as ConversationDetail;
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages ?? []);
      setTone(conversation.tone ?? "Professional");
      setInput("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open conversation.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (rawText: string) => {
    const message = rawText.trim();
    if (!message || busy) return;
    if (message.length > 4000) {
      setNotice("Please keep messages under 4,000 characters.");
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: message, createdAt: new Date().toISOString(), tone };
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "", createdAt: new Date().toISOString(), tone };
    setMessages((previous) => [...previous, userMessage, assistantPlaceholder]);
    setInput("");
    setNotice("");
    setBusy(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, tone, conversationId: activeConversationId }),
        signal: abortController.signal,
      });

      const responseConversationId = response.headers.get("X-Conversation-Id");
      if (responseConversationId) setActiveConversationId(responseConversationId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "The assistant request failed.");
      }
      if (!response.body) throw new Error("This browser did not provide a readable response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleLine = (line: string) => {
        if (!line.trim()) return;
        try {
          const event = JSON.parse(line) as { type: string; text?: string; message?: string };
          if (event.type === "delta" && event.text) {
            setMessages((previous) => {
              const next = [...previous];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
                next[lastIndex] = { ...next[lastIndex], content: next[lastIndex].content + event.text };
              }
              return next;
            });
          } else if (event.type === "error") {
            setNotice(event.message || "The response stream was interrupted.");
          }
        } catch (error) {
          console.error("Could not parse stream event:", error, line);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handleLine);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleLine(buffer);
      await refreshConversations();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const messageText = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setNotice(messageText);
      void refreshConversations();
      setMessages((previous) => {
        const next = [...previous];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex].role === "assistant" && !next[lastIndex].content) {
          next[lastIndex] = { ...next[lastIndex], content: "I couldn't generate a response. Please check the server configuration and try again." };
        }
        return next;
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setNotice("Response copied to clipboard.");
      window.setTimeout(() => setNotice(""), 1800);
    } catch {
      setNotice("Clipboard access was blocked by your browser.");
    }
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="brand-row">
          <div className="brand-mark">v</div>
          {sidebarOpen && <div><strong>vibe</strong><span> AI assistant</span></div>}
          <button className="icon-button sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle history sidebar">☰</button>
        </div>
        {sidebarOpen && <>
          <button className="new-chat-button" onClick={startNewChat}><span>＋</span> New chat</button>
          <div className="sidebar-label">RECENT CHATS</div>
          <nav className="history-list" aria-label="Conversation history">
            {conversations.length === 0 && <p className="empty-history">Your conversations will appear here.</p>}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`history-item ${activeConversationId === conversation.id ? "history-active" : ""}`}
                onClick={() => void openConversation(conversation.id)}
                title={conversation.title}
              >
                <span className="history-dot">◦</span>
                <span className="history-title">{conversation.title || "Untitled conversation"}</span>
                <span className="history-date">{timeLabel(conversation.updatedAt)}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer"><span className="status-dot" /> Your conversations are saved</div>
        </>}
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            <span className="mobile-brand">v</span>
            <div><strong>AI Chat Assistant</strong><span className="topbar-subtitle">A little intelligence, in your own vibe.</span></div>
          </div>
          <label className="tone-control">
            <span>TONE</span>
            <select value={tone} onChange={(event) => setTone(event.target.value as Tone)} disabled={busy} aria-label="Assistant response tone">
              {TONES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </header>

        <div className="conversation-scroll" aria-live="polite">
          {loadingHistory && <div className="loading-line">Loading conversation…</div>}
          {messages.length === 0 ? (
            <div className="welcome-wrap">
              <div className="welcome-orb">✳</div>
              <div className="eyebrow">YOUR AI, YOUR VIBE</div>
              <h1>What’s on your mind<span>?</span></h1>
              <p className="welcome-copy">Ask a question, work through an idea, or get help with your next big thing.</p>
              <div className="suggestion-grid">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button key={suggestion} className="suggestion-card" onClick={() => setInput(suggestion)}>
                    <span className="suggestion-number">0{index + 1}</span>
                    <span>{suggestion}</span>
                    <span className="suggestion-arrow">↗</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message, index) => (
                <article key={`${message.createdAt}-${index}`} className={`message-row message-${message.role}`}>
                  <div className={`avatar avatar-${message.role}`}>{message.role === "user" ? "Y" : "✳"}</div>
                  <div className="message-main">
                    <div className="message-meta"><strong>{message.role === "user" ? "You" : "Vibe"}</strong><span>{message.role === "assistant" && message.tone ? message.tone : ""}</span></div>
                    {message.role === "assistant" ? (
                      <div className="message-content markdown-content">
                        {message.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : busy && index === messages.length - 1 ? <span className="typing-indicator"><i /><i /><i /></span> : <span className="muted">No response generated.</span>}
                      </div>
                    ) : <div className="message-content user-content">{message.content}</div>}
                    {message.role === "assistant" && message.content && <button className="copy-button" onClick={() => void copyMessage(message.content)} title="Copy response">▢ Copy</button>}
                  </div>
                </article>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="composer-area">
          {notice && <div className="notice" role="status">{notice}</div>}
          <form className="composer" onSubmit={onSubmit}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Message Vibe…"
              rows={1}
              maxLength={4000}
              disabled={busy}
              aria-label="Write a message"
            />
            <div className="composer-bottom">
              <span className="composer-hint">Enter to send · Shift + Enter for a new line</span>
              <div className="composer-actions">
                <span className="char-count">{input.length}/4000</span>
                <button className="send-button" type="submit" disabled={!input.trim() || busy} aria-label="Send message">{busy ? <span className="send-spinner" /> : "↑"}</button>
              </div>
            </div>
          </form>
          <p className="disclaimer">AI can make mistakes. Check important information.</p>
        </div>
      </section>
    </main>
  );
}
