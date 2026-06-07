"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  return (
    <div className="space-y-4 p-4">
      {messages.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <p className="text-lg font-semibold">Waggly AIコーチ</p>
          <p className="mt-2 text-sm">クラブや練習のことなんでも聞いてください</p>
          <div className="mt-4 space-y-2 text-xs">
            <p>例: 「最近スライスが多いんだけど」</p>
            <p>例: 「練習メニューを作って」</p>
            <p>例: 「7番アイアンの飛距離を伸ばすには？」</p>
          </div>
        </div>
      )}
      {messages.map((message) => {
        const textContent = message.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("");

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback>
                {message.role === "user" ? "You" : "AI"}
              </AvatarFallback>
            </Avatar>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{textContent}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{textContent}</p>
              )}
            </div>
          </div>
        );
      })}
      {isLoading && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            考え中...
          </div>
        </div>
      )}
    </div>
  );
}
