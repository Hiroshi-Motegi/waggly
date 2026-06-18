import { toast } from "sonner";

/** エラートースト表示。string, Error, unknown に対応。 */
export function showError(error: unknown): void {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "エラーが発生しました";
  toast.error(message);
}

/** 成功トースト表示。 */
export function showSuccess(message: string): void {
  toast.success(message);
}
