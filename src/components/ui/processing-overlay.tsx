"use client";

import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

interface ProcessingOverlayProps {
  message?: string;
}

export function ProcessingOverlay({ message = "保存中..." }: ProcessingOverlayProps) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
        <p className="text-white font-bold">{message}</p>
      </div>
    </div>,
    document.body
  );
}
