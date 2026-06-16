"use client";

import { useEffect, useState } from "react";

/**
 * Floating CTA that appears when both login sections are out of view.
 * Observes elements with id="login-top" and id="login-bottom".
 */
export function FloatingCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const topEl = document.getElementById("login-top");
    const bottomEl = document.getElementById("login-bottom");
    if (!topEl || !bottomEl) return;

    let topVisible = true;
    let bottomVisible = false;
    const update = () => setShow(!topVisible && !bottomVisible);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === topEl) topVisible = entry.isIntersecting;
          if (entry.target === bottomEl) bottomVisible = entry.isIntersecting;
        }
        update();
      },
      { threshold: 0 },
    );
    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      onClick={() => document.getElementById("login-bottom")?.scrollIntoView({ behavior: "smooth" })}
      className={`fixed bottom-6 right-0 z-30 rounded-l-full bg-[#00441b] border-2 border-r-0 border-white pl-6 pr-3 py-3.5 text-white font-bold text-sm shadow-lg transition-all duration-300 ${show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"}`}
    >
      無料でアカウント作成
    </button>
  );
}
