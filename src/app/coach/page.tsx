"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ChatMessages } from "@/components/coach/chat-messages";
import { ChatInput } from "@/components/coach/chat-input";
import { useAuth } from "@/hooks/use-auth";

export default function CoachPage() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!user) return;

    async function loadHistory() {
      try {
        const res = await fetch("/api/coach/chat/history");
        if (!res.ok) throw new Error("Failed to load history");
        const data = await res.json();

        if (data.conversationId && data.messages?.length > 0) {
          setConversationId(data.conversationId);
          // Convert DB messages to UIMessage format
          const uiMessages: UIMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: m.message }],
          }));
          setInitialMessages(uiMessages);
        } else {
          setConversationId(crypto.randomUUID());
          setInitialMessages([]);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
        setConversationId(crypto.randomUUID());
        setInitialMessages([]);
      } finally {
        setHistoryLoaded(true);
      }
    }

    loadHistory();
  }, [user]);

  const { messages, sendMessage, status } = useChat({
    transport: historyLoaded && conversationId
      ? new DefaultChatTransport({
          api: "/api/coach/chat",
          body: { conversationId },
        })
      : undefined as any,
    messages: initialMessages,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSend(content: string) {
    sendMessage({ text: content });
  }

  function handleNewChat() {
    setConversationId(crypto.randomUUID());
    setInitialMessages([]);
    setHistoryLoaded(true);
  }

  if (!historyLoaded) {
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <div className="flex justify-end px-4 py-2 border-b">
        <button
          onClick={handleNewChat}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          新しい会話
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
