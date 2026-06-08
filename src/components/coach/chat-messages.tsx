"use client";

import { useRef } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - msgDate.getTime();
  if (diff === 0) return "今日";
  if (diff === 86400000) return "昨日";
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { user } = useAuth();
  // Cache timestamps for messages without created_at (new messages)
  const timestampCache = useRef<Map<string, string>>(new Map());

  let lastDateLabel = "";

  return (
    <div className="flex flex-col gap-2.5 p-3">
      {messages.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-base font-bold text-[#006728]">AIに相談</p>
          <p className="mt-2 text-sm text-[#8b8b8b]">クラブや練習のことなんでも聞いてください</p>
          <div className="mt-4 space-y-2 text-xs text-[#8b8b8b]">
            <p>例: 「最近スライスが多いんだけど」</p>
            <p>例: 「練習メニューを作って」</p>
            <p>例: 「7番アイアンの飛距離を伸ばすには？」</p>
          </div>
          <div className="mt-6 mx-2 p-3 rounded-lg bg-[#ebf1eb] text-xs text-[#8b8b8b] text-left space-y-1">
            <p>AIコーチはベータ版につき無料公開中です。コーチ内容は誤りがある場合があります。</p>
            <p>会話の利用上限は<a href="/settings" className="underline text-[#006728]">設定画面</a>で確認できます。</p>
          </div>
        </div>
      )}
      {messages.map((message) => {
        const textContent = message.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("");

        const isUser = message.role === "user";
        const meta = message.metadata as { created_at?: string } | undefined;
        let timestamp = meta?.created_at;

        // For new messages without created_at, assign current time (cached per id)
        if (!timestamp) {
          if (!timestampCache.current.has(message.id)) {
            timestampCache.current.set(message.id, new Date().toISOString());
          }
          timestamp = timestampCache.current.get(message.id)!;
        }

        // Date separator
        let dateSeparator = null;
        const dateLabel = formatDateLabel(timestamp);
        if (dateLabel !== lastDateLabel) {
          lastDateLabel = dateLabel;
          dateSeparator = (
            <div className="flex items-center justify-center py-1">
              <span className="text-[10px] text-[#8b8b8b] bg-[#ebf1eb] px-2 py-0.5 rounded-full">{dateLabel}</span>
            </div>
          );
        }

        return (
          <div key={message.id}>
            {dateSeparator}
            <div className={`flex gap-2 items-start ${isUser ? "flex-row-reverse" : ""}`}>
              {isUser ? (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback>{user?.display_name?.[0] ?? "U"}</AvatarFallback>
                </Avatar>
              ) : (
                <img src="/icons/ai-coach.svg" alt="AI" className="h-8 w-8 shrink-0" />
              )}
              <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[80%]`}>
                <div className="rounded-lg border border-[#c5c5c5] px-3 py-2 text-xs font-medium">
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_hr]:my-2 text-xs">
                      <ReactMarkdown>{textContent}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{textContent}</p>
                  )}
                </div>
                <span className="text-[9px] text-[#8b8b8b] mt-0.5 px-1">{formatTime(timestamp)}</span>
              </div>
            </div>
          </div>
        );
      })}
      {isLoading && (
        <div className="flex gap-2 items-start">
          <img src="/icons/ai-coach.svg" alt="AI" className="h-8 w-8 shrink-0" />
          <div className="rounded-lg border border-[#c5c5c5] px-3 py-2 text-xs text-[#8b8b8b]">
            考え中...
          </div>
        </div>
      )}
    </div>
  );
}
