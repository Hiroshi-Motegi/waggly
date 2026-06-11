import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn().mockReturnValue(true) },
}));
vi.mock("@/lib/sqlite/database", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { query, execute } from "@/lib/sqlite/database";
import { apiFetch } from "@/lib/api-client";

describe("SyncEngine", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(query).mockReset();
    vi.mocked(execute).mockReset();
    vi.mocked(apiFetch).mockReset();
  });

  describe("flushPendingSync", () => {
    it("sends queued operations and clears them on success", async () => {
      vi.mocked(query).mockResolvedValue([
        {
          id: 1,
          table_name: "clubs",
          record_id: "abc",
          action: "POST",
          payload: JSON.stringify({
            apiPath: "/api/clubs",
            method: "POST",
            payload: { id: "abc", club_number: "7I" },
          }),
        },
      ]);
      vi.mocked(apiFetch).mockResolvedValue(
        new Response("{}", { status: 200 })
      );

      const { flushPendingSync } = await import("@/lib/sync");
      await flushPendingSync();

      expect(apiFetch).toHaveBeenCalledWith("/api/clubs", expect.objectContaining({ method: "POST" }));
      expect(execute).toHaveBeenCalledWith(
        "DELETE FROM pending_sync WHERE id = ?",
        [1]
      );
    });

    it("does nothing when queue is empty", async () => {
      vi.mocked(query).mockResolvedValue([]);

      const { flushPendingSync } = await import("@/lib/sync");
      await flushPendingSync();

      expect(apiFetch).not.toHaveBeenCalled();
    });
  });

  describe("fullSync", () => {
    it("fetches all user data from server and caches in SQLite", async () => {
      vi.mocked(query).mockResolvedValue([]); // empty pending queue
      vi.mocked(apiFetch).mockResolvedValue(
        new Response(JSON.stringify([]), { status: 200 })
      );

      const { fullSync } = await import("@/lib/sync");
      await fullSync();

      // Should fetch each mirrored table
      expect(apiFetch).toHaveBeenCalledWith("/api/clubs");
      expect(apiFetch).toHaveBeenCalledWith("/api/practice");
      expect(apiFetch).toHaveBeenCalledWith("/api/accessories");
    });
  });

  describe("getLocalDataSummary", () => {
    it("returns counts and lastUpdated for local data", async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ count: 14 }])   // clubs
        .mockResolvedValueOnce([{ count: 8 }])     // practice_sessions
        .mockResolvedValueOnce([{ count: 3 }])     // accessories
        .mockResolvedValueOnce([{ value: "2026-12-12T13:11:00.000Z" }]); // sync_meta

      const { getLocalDataSummary } = await import("@/lib/sync");
      const summary = await getLocalDataSummary();

      expect(summary).toEqual({
        lastUpdated: "2026-12-12T13:11:00.000Z",
        counts: { clubs: 14, practices: 8, accessories: 3 },
      });
    });

    it("returns null lastUpdated when no sync_meta entry exists", async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]); // no sync_meta row

      const { getLocalDataSummary } = await import("@/lib/sync");
      const summary = await getLocalDataSummary();

      expect(summary).toEqual({
        lastUpdated: null,
        counts: { clubs: 0, practices: 0, accessories: 0 },
      });
    });
  });
});
