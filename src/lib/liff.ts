import liff from "@line/liff";

let liffInitialized = false;

/** Initialize LIFF. Returns the deep link path from liff.state if present. */
export async function initLiff(): Promise<string | null> {
  if (liffInitialized) return null;

  // Capture liff.state before init (init may modify URL)
  const params = new URLSearchParams(window.location.search);
  const liffState = params.get("liff.state");

  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
  liffInitialized = true;

  if (!liff.isLoggedIn()) {
    liff.login();
    return null; // will redirect, never reaches here
  }

  return liffState && liffState !== "/" ? liffState : null;
}

export async function getLiffProfile() {
  const profile = await liff.getProfile();
  const idToken = liff.getIDToken();
  return { profile, idToken };
}

export function liffLogout() {
  if (liff.isLoggedIn()) {
    liff.logout();
    window.location.reload();
  }
}

export { liff };
