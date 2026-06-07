"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ChatMessages } from "@/components/coach/chat-messages";
import { ChatInput } from "@/components/coach/chat-input";
import { useAuth } from "@/hooks/use-auth";

function ChatView({
  conversationId,
  initialMessages,
  onNewChat,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  onNewChat: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/coach/chat",
      body: { conversationId },
    }),
    messages: initialMessages,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSend(content: string) {
    sendMessage({ text: content });
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <div className="flex justify-end px-4 py-2 border-b">
        <button
          onClick={onNewChat}
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

export default function CoachPage() {
  const { user } = useAuth();
  const [chatKey, setChatKey] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadHistory() {
      try {
        const res = await fetch("/api/coach/chat/history");
        if (!res.ok) throw new Error("Failed to load history");
        const data = await res.json();

        if (data.conversationId && data.messages?.length > 0) {
          setConversationId(data.conversationId);
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

  function handleNewChat() {
    setConversationId(crypto.randomUUID());
    setInitialMessages([]);
    setChatKey((k) => k + 1); // Force remount ChatView
  }

  if (!historyLoaded) {
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!conversationId) {
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  return (
    <ChatView
      key={chatKey}
      conversationId={conversationId}
      initialMessages={initialMessages}
      onNewChat={handleNewChat}
    />
  );
}
