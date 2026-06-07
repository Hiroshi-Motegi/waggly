"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ChatMessages } from "@/components/coach/chat-messages";
import { ChatInput } from "@/components/coach/chat-input";
import { useAuth } from "@/hooks/use-auth";

type ConversationItem = {
  id: string;
  title: string;
  created_at: string;
};

function ChatView({
  conversationId,
  initialMessages,
  onNewChat,
  onShowHistory,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  onNewChat: () => void;
  onShowHistory: () => void;
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
  const initialScrollDone = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView(initialScrollDone.current ? { behavior: "smooth" } : undefined);
      initialScrollDone.current = true;
    }
  }, [messages]);

  function handleSend(content: string) {
    sendMessage({ text: content });
  }

  return (
    <>
      <div className="flex justify-end gap-3 px-4 py-2 border-b">
        <button
          onClick={onShowHistory}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          履歴
        </button>
        <button
          onClick={onNewChat}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          新しい会話
        </button>
      </div>
      <div className="pb-24">
        <ChatMessages messages={messages} isLoading={isLoading} />
        <div ref={bottomRef} />
      </div>
      <div className="fixed bottom-[4.5rem] left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white dark:bg-zinc-950">
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </>
  );
}

function HistoryPanel({
  conversations,
  activeId,
  isLoading,
  onSelect,
  onDelete,
  onClose,
}: {
  conversations: ConversationItem[];
  activeId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-sm font-medium">会話履歴</span>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          閉じる
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">読み込み中...</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">会話履歴がありません</p>
        ) : (
          <ul>
            {conversations.map((conv) => (
              <li key={conv.id} className={`flex items-center border-b ${conv.id === activeId ? "bg-muted" : ""}`}>
                <button
                  onClick={() => onSelect(conv.id)}
                  className="flex-1 flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm truncate flex-1 mr-3">{conv.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(conv.created_at)}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("この会話を削除しますか？")) onDelete(conv.id);
                  }}
                  className="px-3 py-3 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function CoachPage() {
  const { user } = useAuth();
  const [chatKey, setChatKey] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [historyFetching, setHistoryFetching] = useState(false);

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
    setShowHistory(false);
    setChatKey((k) => k + 1);
  }

  async function handleShowHistory() {
    setShowHistory(true);
    setHistoryFetching(true);
    try {
      const res = await fetch("/api/coach/chat/history?list=true");
      if (!res.ok) throw new Error("Failed to load conversation list");
      const data: ConversationItem[] = await res.json();
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversation list:", error);
      setConversations([]);
    } finally {
      setHistoryFetching(false);
    }
  }

  async function handleDeleteConversation(id: string) {
    try {
      const res = await fetch(`/api/coach/chat/history?conversationId=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete conversation");
      // Remove from list
      setConversations((prev) => prev.filter((c) => c.id !== id));
      // If deleted the active conversation, start a new one
      if (id === conversationId) {
        setConversationId(crypto.randomUUID());
        setInitialMessages([]);
        setChatKey((k) => k + 1);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }

  async function handleSelectConversation(id: string) {
    try {
      const res = await fetch(`/api/coach/chat/history?conversationId=${id}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = await res.json();

      setConversationId(id);
      const uiMessages: UIMessage[] = (data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.message }],
      }));
      setInitialMessages(uiMessages);
      setShowHistory(false);
      setChatKey((k) => k + 1);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  }

  if (!historyLoaded) {
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!conversationId) {
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (showHistory) {
    return (
      <HistoryPanel
        conversations={conversations}
        activeId={conversationId}
        isLoading={historyFetching}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onClose={() => setShowHistory(false)}
      />
    );
  }

  return (
    <ChatView
      key={chatKey}
      conversationId={conversationId}
      initialMessages={initialMessages}
      onNewChat={handleNewChat}
      onShowHistory={handleShowHistory}
    />
  );
}
