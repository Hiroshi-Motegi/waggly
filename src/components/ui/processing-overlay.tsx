"use client";

import { createPortal } from "react-dom";

interface ProcessingOverlayProps {
  message?: string;
}

export function ProcessingOverlay({ message = "保存中..." }: ProcessingOverlayProps) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-0">
        <div className="loading-bounce">
          <img
            src="/icons/loading-ball-white.svg"
            alt=""
            className="h-10 w-10"
          />
        </div>
        <div className="loading-shadow" />
        <div className="flex">
          {message.split("").map((char, i) => (
            <span
              key={i}
              className="loading-wave text-base font-bold text-white"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {char}
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
