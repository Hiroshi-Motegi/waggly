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
    let unmounted = false;

    (async () => {
      const { Network } = await import("@capacitor/network");
      if (unmounted) return;
      const status = await Network.getStatus();
      if (unmounted) return;
      setIsOnline(status.connected);

      const handle = await Network.addListener(
        "networkStatusChange",
        (s) => setIsOnline(s.connected)
      );
      if (unmounted) {
        handle.remove();
        return;
      }
      removeListener = () => handle.remove();
    })();

    return () => {
      unmounted = true;
      removeListener?.();
    };
  }, []);

  return { isOnline };
}
