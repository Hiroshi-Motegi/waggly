"use client";

import { useEffect, useState } from "react";
import { isNative } from "@/lib/platform";

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!isNative()) {
      // Web: use browser online/offline events
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      setIsOnline(navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // Native: use Capacitor Network plugin
    let removeListener: (() => void) | undefined;

    (async () => {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      setIsOnline(status.connected);

      const handle = await Network.addListener(
        "networkStatusChange",
        (s) => setIsOnline(s.connected)
      );
      removeListener = () => handle.remove();
    })();

    return () => {
      removeListener?.();
    };
  }, []);

  return { isOnline };
}
