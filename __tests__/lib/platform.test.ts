import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

import { isNative } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";

describe("isNative", () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReset();
  });

  it("returns true when running on native platform", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(isNative()).toBe(true);
  });

  it("returns false when running on web", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    expect(isNative()).toBe(false);
  });
});
