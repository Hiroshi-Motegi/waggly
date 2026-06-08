"use client";
import { Loading } from "@/components/loading";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Plus, Clock } from "lucide-react";
import { ChatMessages } from "@/components/coach/chat-messages";
import { ChatInput } from "@/components/coach/chat-input";
import { PageHeader } from "@/components/layout/page-header";
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
    <div className="flex flex-col px-2 py-2 space-y-2" style={{ height: "100dvh" }}>
      <PageHeader title="AIに相談" showBack={false}>
        <div className="flex gap-1">
          <button
            onClick={onShowHistory}
            className="flex items-center gap-1 rounded-full bg-[#006728] px-4 py-1.5 text-xs font-bold text-white"
          >
            <Clock className="h-4 w-4" />
            履歴
          </button>
          <button
            onClick={onNewChat}
            className="flex items-center gap-1 rounded-full bg-[#006728] px-4 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            新しい会話
          </button>
        </div>
      </PageHeader>

      {/* Chat card */}
      <div className="flex flex-col flex-1 min-h-0 rounded-lg bg-white" style={{ marginBottom: "var(--bottom-nav-height)" }}>
        <div className="flex-1 overflow-y-auto">
          <ChatMessages messages={messages} isLoading={isLoading} />
          <div ref={bottomRef} />
        </div>
        <div className="shrink-0">
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
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
    <div className="flex flex-col px-2 py-2 space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-[#006728]">会話履歴</h2>
        <button
          onClick={onClose}
          className="rounded-full border border-[#006728] px-4 py-1 text-xs font-bold text-[#006728]"
        >
          閉じる
        </button>
      </div>
      <div className="flex flex-col rounded-lg bg-white p-3">
        {isLoading ? (
          <Loading />
        ) : conversations.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#8b8b8b]">会話履歴がありません</p>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv, i) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 py-2 ${
                  i < conversations.length - 1 ? "border-b border-[#dfdfdf]" : ""
                } ${conv.id === activeId ? "bg-[#ebf1eb] -mx-3 px-3 rounded" : ""}`}
              >
                <button
                  onClick={() => onSelect(conv.id)}
                  className="flex flex-1 items-center justify-between text-left min-w-0"
                >
                  <span className="text-sm font-medium truncate flex-1 mr-3">{conv.title}</span>
                  <span className="text-xs text-[#8b8b8b] shrink-0">
                    {formatDate(conv.created_at)}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("この会話を削除しますか？")) onDelete(conv.id);
                  }}
                  className="shrink-0 text-xs text-[#8b8b8b] hover:text-red-500"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
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
      setConversations((prev) => prev.filter((c) => c.id !== id));
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

  if (!historyLoaded || !conversationId) {
    return (
      <div className="flex flex-col px-2 py-2 space-y-2" style={{ height: "100dvh" }}>
        <PageHeader title="AIに相談" showBack={false} />
        <Loading />
      </div>
    );
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
