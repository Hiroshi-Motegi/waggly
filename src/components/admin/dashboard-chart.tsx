"use client";

import { useRef, useEffect } from "react";

interface DataPoint {
  week: string;
  count: number;
}

interface DashboardChartProps {
  data: DataPoint[];
  label: string;
  color: string;
}

export function DashboardChart({ data, label, color }: DashboardChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const max = Math.max(...data.map((d) => d.count), 1);
    const padX = 40;
    const padY = 20;
    const plotW = w - padX - 10;
    const plotH = h - padY * 2;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
      ctx.fillStyle = "#aaa";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(max - (max / 4) * i)), padX - 5, y + 3);
    }

    // Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padX + (plotW / (data.length - 1)) * i;
      const y = padY + plotH - (d.count / max) * plotH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    data.forEach((d, i) => {
      const x = padX + (plotW / (data.length - 1)) * i;
      const y = padY + plotH - (d.count / max) * plotH;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // X labels
    ctx.fillStyle = "#aaa";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    data.forEach((d, i) => {
      if (i % 2 === 0) {
        const x = padX + (plotW / (data.length - 1)) * i;
        ctx.fillText(d.week.slice(5), x, h - 5);
      }
    });
  }, [data, color]);

  return (
    <div>
      <p className="text-xs font-bold text-[#555] mb-1">{label}</p>
      <canvas ref={canvasRef} className="w-full h-[160px]" />
    </div>
  );
}
