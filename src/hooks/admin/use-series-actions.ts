import { apiFetch } from "@/lib/api-client";

export function useSeriesActions(seriesId: string, onSuccess?: () => void) {
  async function patchSeries(action: string, data?: Record<string, any>) {
    const res = await apiFetch("/api/admin/series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: seriesId, action, data }),
    });
    if (res.ok && onSuccess) onSuccess();
    return res;
  }

  return {
    updateSeries: (data: Record<string, any>) => patchSeries("update", data),
    lookupRakuten: (url: string) => patchSeries("lookup_rakuten", { url }),
    toggleVerified: (current: boolean) => patchSeries("update", { verified: !current }),
    assignSpecs: () => patchSeries("assign_specs"),
  };
}
