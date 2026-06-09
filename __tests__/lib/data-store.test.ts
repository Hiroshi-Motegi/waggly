import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn() },
}));
vi.mock("@capacitor/network", () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true }),
  },
}));
vi.mock("@/lib/sqlite/database", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { query, execute } from "@/lib/sqlite/database";
import { apiFetch } from "@/lib/api-client";

describe("DataStore", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });

  describe("fetchData (read)", () => {
    it("returns API data and caches to SQLite when online", async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({
        connected: true,
        connectionType: "wifi",
      });
      const mockClubs = [{ id: "1", club_number: "7I" }];
      vi.mocked(apiFetch).mockResolvedValue(
        new Response(JSON.stringify(mockClubs), { status: 200 })
      );

      const { fetchData } = await import("@/lib/data-store");
      const result = await fetchData("/api/clubs", "clubs");

      expect(apiFetch).toHaveBeenCalledWith("/api/clubs");
      expect(result).toEqual(mockClubs);
    });

    it("falls back to SQLite when offline", async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({
        connected: false,
        connectionType: "none",
      });
      const cachedClubs = [{ id: "1", club_number: "7I" }];
      vi.mocked(query).mockResolvedValue(cachedClubs);

      const { fetchData } = await import("@/lib/data-store");
      const result = await fetchData("/api/clubs", "clubs");

      expect(query).toHaveBeenCalledWith("SELECT * FROM clubs");
      expect(result).toEqual(cachedClubs);
    });
  });

  describe("mutateData (write)", () => {
    it("sends to API and writes to SQLite when online", async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({
        connected: true,
        connectionType: "wifi",
      });
      const newClub = { id: "2", club_number: "PW" };
      vi.mocked(apiFetch).mockResolvedValue(
        new Response(JSON.stringify(newClub), { status: 200 })
      );

      const { mutateData } = await import("@/lib/data-store");
      const result = await mutateData("/api/clubs", "POST", newClub);

      expect(apiFetch).toHaveBeenCalled();
      expect(result).toEqual(newClub);
    });

    it("queues in pending_sync when offline", async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({
        connected: false,
        connectionType: "none",
      });

      const { mutateData } = await import("@/lib/data-store");
      await mutateData("/api/clubs", "POST", {
        id: "3",
        club_number: "5W",
      });

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO pending_sync"),
        expect.any(Array)
      );
    });
  });
});
