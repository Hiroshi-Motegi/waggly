"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";

export function FeatureSection({ icon, title, photo, photoSide, screenshots, description, note, details }: {
  icon: string;
  title: string;
  photo: string;
  photoSide: "left" | "right";
  screenshots: { src: string; alt: string }[];
  description: string;
  note?: string;
  details: { heading: string; src: string; text: string }[];
}) {
  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isRight = photoSide === "right";
  return (
    <div ref={sectionRef} className="w-full mb-10">
      {/* Key visual */}
      <div className={`relative ${isRight ? "ml-5 rounded-l-2xl" : "mr-5 rounded-r-2xl"} overflow-hidden h-[254px]`}>
        <img src={photo} alt={title} className="w-full h-full object-cover" />
        <div className={`absolute top-[30px] ${isRight ? "right-[10px]" : "left-[10px]"}`}>
          <div className="relative flex items-start">
            {screenshots.length === 1 ? (
              <div className="w-[130px] overflow-hidden shadow-xl rounded-md">
                <img src={screenshots[0].src} alt={screenshots[0].alt} className="w-full" />
              </div>
            ) : (
              <>
                <div className="w-[120px] overflow-hidden shadow-xl rounded-md relative z-0">
                  <img src={screenshots[0].src} alt={screenshots[0].alt} className="w-full" />
                </div>
                <div className="w-[140px] overflow-hidden shadow-xl rounded-md relative z-10 -ml-4 mt-3">
                  <img src={screenshots[1].src} alt={screenshots[1].alt} className="w-full" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title badge */}
      <div className={`flex items-center -mt-5 relative z-20 ${isRight ? "justify-end mr-5" : "ml-5"}`}>
        <span className="inline-flex items-center gap-3 bg-[#00441b] px-5 py-2">
          <Image src={icon} alt="" width={24} height={34} />
          <span className="text-lg font-bold text-white">{title}</span>
        </span>
      </div>

      {/* Description */}
      <p className="text-base text-white leading-relaxed mt-4 mx-5">{description}</p>
      {note && <p className="text-xs text-white/60 leading-relaxed mt-2 mx-5">{note}</p>}

      {/* Accordion */}
      {!open && (
        <button onClick={() => setOpen(true)} className="mt-4 flex h-12 w-full max-w-64 mx-auto items-center justify-center gap-2 rounded-full border border-white bg-black/30 text-white text-base font-medium">
          詳しく見る <ChevronDown className="h-4 w-4" />
        </button>
      )}
      {open && (
        <>
          <div className="mt-4 mx-5 space-y-6 animate-fade-in">
            {details.map((d, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-[138px] shrink-0 border border-white overflow-hidden">
                  <img src={d.src} alt={d.heading} className="w-full" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white mb-2 border-b border-white pb-2">{d.heading}</p>
                  <p className="text-base text-white/70 leading-relaxed">{d.text}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { setOpen(false); setTimeout(() => { const el = sectionRef.current; if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 20; window.scrollTo({ top: y, behavior: "smooth" }); } }, 0); }} className="mt-4 flex h-12 w-full max-w-64 mx-auto items-center justify-center gap-2 rounded-full border border-white bg-black/30 text-white text-base font-medium">
            閉じる <ChevronUp className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
