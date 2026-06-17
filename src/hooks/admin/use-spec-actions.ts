import { apiFetch } from "@/lib/api-client";

export function useSpecActions(specId: string, onSuccess?: () => void) {
  async function patchSpec(action: string, data?: Record<string, any>) {
    const res = await apiFetch("/api/admin/specs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: specId, action, data }),
    });
    if (res.ok && onSuccess) onSuccess();
    return res;
  }

  return {
    updateSpec: (data: Record<string, any>) => patchSpec("update", data),
    refreshSpec: () => patchSpec("refresh_spec"),
    refreshImage: () => patchSpec("refresh_image"),
    lookupRakuten: (url: string) => patchSpec("lookup_rakuten", { url }),
    toggleVerified: (current: boolean) => patchSpec("update", { verified: !current }),
  };
}
