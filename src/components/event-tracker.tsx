"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/gtm";

export function EventTracker({
  event,
  params,
}: {
  event: string;
  params?: Record<string, unknown>;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      trackEvent(event, params);
    }
  }, [event, params]);

  return null;
}
