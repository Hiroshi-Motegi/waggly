import liff from "@line/liff";

let initPromise: Promise<void> | null = null;

/** Initialize LIFF. Returns the deep link path from liff.state if present. */
export async function initLiff(): Promise<string | null> {
  // Capture liff.state before init (init may modify URL)
  const params = new URLSearchParams(window.location.search);
  const liffState = params.get("liff.state");

  // Only call liff.init() once, but allow multiple callers to await the same promise
  if (!initPromise) {
    initPromise = liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
  }

  try {
    await initPromise;
  } catch (e) {
    // If init fails (e.g. already initialized), continue
    console.warn("liff.init warning:", e);
  }

  if (!liff.isLoggedIn()) {
    // Auto-login only inside LINE app; on web, let user click the button
    if (liff.isInClient()) {
      liff.login();
    }
    return null;
  }

  return liffState && liffState !== "/" ? liffState : null;
}

export async function getLiffProfile() {
  const profile = await liff.getProfile();
  const idToken = liff.getIDToken();
  return { profile, idToken };
}

export async function liffLogout() {
  try {
    await initLiff();
    if (liff.isLoggedIn()) {
      liff.logout();
    }
  } catch {
    // init may fail if no LIFF ID configured
  }
  window.location.reload();
}

export { liff };
