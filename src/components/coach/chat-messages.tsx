"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-2.5 p-3">
      {messages.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-base font-bold text-[#006728]">Waggly AIコーチ</p>
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

        return (
          <div
            key={message.id}
            className={`flex gap-2 items-start ${isUser ? "flex-row-reverse" : ""}`}
          >
            {isUser ? (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user?.avatar_url ?? undefined} />
                <AvatarFallback>{user?.display_name?.[0] ?? "U"}</AvatarFallback>
              </Avatar>
            ) : (
              <img src="/icons/ai-coach.svg" alt="AI" className="h-8 w-8 shrink-0" />
            )}
            <div className="max-w-[80%] rounded-lg border border-[#c5c5c5] px-3 py-2 text-xs font-medium">
              {message.role === "assistant" ? (
                <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_hr]:my-2 text-xs">
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
