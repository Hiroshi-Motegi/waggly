"use client";

export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="loading-bounce">
        <img
          src="/icons/loading-ball.svg"
          alt=""
          className="h-16 w-16"
        />
      </div>
      <div className="loading-shadow" />
    </div>
  );
}
