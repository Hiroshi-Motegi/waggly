import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isLineBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Line\//i.test(navigator.userAgent);
}
