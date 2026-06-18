"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold">エラーが発生しました</h2>
        <p className="text-gray-600 text-sm">
          予期しないエラーが発生しました
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-green-700 px-4 py-2 text-white text-sm hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
