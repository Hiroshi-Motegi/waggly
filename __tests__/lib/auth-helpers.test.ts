import { describe, it, expect } from "vitest";
import { extractProviderInfo } from "@/lib/auth-helpers";

describe("extractProviderInfo", () => {
  it("extracts Google provider info from raw_user_meta_data", () => {
    const result = extractProviderInfo({
      app_metadata: { provider: "google" },
      user_metadata: { sub: "google-123", email: "test@gmail.com" },
    });
    expect(result).toEqual({
      provider: "google",
      providerSub: "google-123",
      providerEmail: "test@gmail.com",
    });
  });

  it("extracts LINE provider info from raw_user_meta_data", () => {
    const result = extractProviderInfo({
      app_metadata: { provider: "email" },
      user_metadata: { line_user_id: "U1234567890" },
    });
    expect(result).toEqual({
      provider: "line",
      providerSub: "U1234567890",
      providerEmail: null,
    });
  });

  it("extracts Apple provider info", () => {
    const result = extractProviderInfo({
      app_metadata: { provider: "apple" },
      user_metadata: { sub: "apple-001" },
    });
    expect(result).toEqual({
      provider: "apple",
      providerSub: "apple-001",
      providerEmail: null,
    });
  });

  it("returns null for unknown provider without line_user_id", () => {
    const result = extractProviderInfo({
      app_metadata: { provider: "email" },
      user_metadata: {},
    });
    expect(result).toBeNull();
  });
});
