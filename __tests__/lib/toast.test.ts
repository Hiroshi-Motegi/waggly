import { describe, it, expect, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { showError, showSuccess } from "@/lib/toast";
import { toast } from "sonner";

describe("showError", () => {
  it("文字列メッセージをそのまま表示", () => {
    showError("Something went wrong");
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("Errorオブジェクトからmessageを取得", () => {
    showError(new Error("Network timeout"));
    expect(toast.error).toHaveBeenCalledWith("Network timeout");
  });

  it("不明な型にはデフォルトメッセージ", () => {
    showError(null);
    expect(toast.error).toHaveBeenCalledWith("エラーが発生しました");
  });
});

describe("showSuccess", () => {
  it("成功メッセージを表示", () => {
    showSuccess("保存しました");
    expect(toast.success).toHaveBeenCalledWith("保存しました");
  });
});
