"use client";

import { SWRConfig } from "swr";
import { showError } from "@/lib/toast";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        onError: (error) => {
          // 401はauth redirectで処理するのでtoast不要
          if (error?.message?.includes("401")) return;
          showError(error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
