"use client";

import { useEffect, useRef } from "react";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AdminModal({ open, onClose, title, children }: AdminModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-xl border border-[#e0e0e0] bg-white p-0 shadow-xl backdrop:bg-black/40 max-w-lg w-full"
    >
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
        <h3 className="text-sm font-bold text-[#006728]">{title}</h3>
        <button onClick={onClose} className="text-[#999] hover:text-[#333] text-lg leading-none">&times;</button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
