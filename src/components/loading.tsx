"use client";

const text = "読み込み中...";

export function Loading({ variant = "default" }: { variant?: "default" | "light" }) {
  const isLight = variant === "light";
  const textColor = isLight ? "text-white" : "text-[#006728]";

  return (
    <div
      className="flex flex-col items-center justify-center gap-0 py-12"
      style={isLight ? { "--fill-0": "white" } as React.CSSProperties : undefined}
    >
      <div className="loading-bounce">
        <img
          src="/icons/loading-ball.svg"
          alt=""
          className="h-10 w-10"
        />
      </div>
      <div className="loading-shadow" />
      <div className="flex">
        {text.split("").map((char, i) => (
          <span
            key={i}
            className={`loading-wave text-sm font-bold ${textColor}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
