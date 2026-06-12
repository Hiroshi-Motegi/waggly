import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/platform", () => ({
  isNative: vi.fn(),
}));

vi.mock("@/lib/camera", () => ({
  pickImageNative: vi.fn(),
  preResizeImage: vi.fn().mockResolvedValue("blob:resized-url"),
  isCameraPermissionError: vi.fn().mockReturnValue(false),
  isCameraUserCancel: vi.fn().mockReturnValue(false),
}));

// Mock the lazy-loaded ImageCropper
vi.mock("@/components/ui/image-cropper", () => ({
  ImageCropper: vi.fn(({ onCrop, onCancel, onRetake }: any) => (
    <div data-testid="mock-cropper">
      <button onClick={() => onCrop(new File(["test"], "test.webp", { type: "image/webp" }))}>
        crop-confirm
      </button>
      <button onClick={onCancel}>crop-cancel</button>
      <button onClick={onRetake}>crop-retake</button>
    </div>
  )),
}));

import { ImagePicker } from "@/components/ui/image-picker";
import { isNative } from "@/lib/platform";
import { pickImageNative, preResizeImage } from "@/lib/camera";

describe("ImagePicker", () => {
  const mockOnPick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isNative).mockReturnValue(false);
  });

  it("renders children as the trigger", () => {
    render(
      <ImagePicker onPick={mockOnPick}>
        <button>Add Photo</button>
      </ImagePicker>
    );

    expect(screen.getByText("Add Photo")).toBeInTheDocument();
  });

  it("opens file input on click in web mode", () => {
    vi.mocked(isNative).mockReturnValue(false);

    render(
      <ImagePicker onPick={mockOnPick}>
        <button>Add Photo</button>
      </ImagePicker>
    );

    fireEvent.click(screen.getByText("Add Photo"));
  });

  it("calls pickImageNative on click in native mode", async () => {
    vi.mocked(isNative).mockReturnValue(true);
    const mockFile = new File(["native"], "photo.jpg", { type: "image/jpeg" });
    vi.mocked(pickImageNative).mockResolvedValue(mockFile);

    render(
      <ImagePicker onPick={mockOnPick}>
        <button>Add Photo</button>
      </ImagePicker>
    );

    fireEvent.click(screen.getByText("Add Photo"));

    await vi.waitFor(() => {
      expect(pickImageNative).toHaveBeenCalledOnce();
    });
  });
});
