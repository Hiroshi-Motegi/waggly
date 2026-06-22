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
      // Prevent infinite redirect loop: only attempt login once per session
      const alreadyAttempted = sessionStorage.getItem("liff_login_attempted");
      if (!alreadyAttempted) {
        sessionStorage.setItem("liff_login_attempted", "1");
        liff.login();
      } else {
        console.warn("[LIFF] login already attempted but isLoggedIn still false — skipping to prevent loop");
      }
    }
    return null;
  }

  // Login succeeded — clear the guard flag
  sessionStorage.removeItem("liff_login_attempted");
  return liffState && liffState !== "/" ? liffState : null;
}

export async function getLiffProfile() {
  const profile = await liff.getProfile();
  const idToken = liff.getIDToken();
  return { profile, idToken };
}

export async function liffLogout() {
  // ログアウト前にサーバーデータをローカルに同期
  try {
    const { isNative } = await import("@/lib/platform");
    if (isNative()) {
      const { fullSync } = await import("@/lib/sync");
      await fullSync();
    }
  } catch {
    // sync 失敗してもログアウトは続行
  }

  // Clear login method, dev mode, and onboarding flags
  localStorage.removeItem("login_method");
  localStorage.removeItem("onboarding_version");
  localStorage.setItem("dev-logged-in", "false");

  // Clear Supabase session
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  // Clear LIFF session
  try {
    if (!initPromise) {
      initPromise = liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
    }
    await initPromise;
    if (liff.isLoggedIn()) {
      liff.logout();
    }
  } catch {
    // init may fail if no LIFF ID configured
  }

  window.location.href = "/";
}

export { liff };
