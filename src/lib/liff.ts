import liff from "@line/liff";

let liffInitialized = false;

export async function initLiff(): Promise<void> {
  if (liffInitialized) return;

  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
  liffInitialized = true;

  if (!liff.isLoggedIn()) {
    liff.login();
  }
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
