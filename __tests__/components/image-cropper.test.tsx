import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock react-cropper
vi.mock("react-cropper", () => ({
  __esModule: true,
  default: vi.fn(({ ref, ...props }: any) => {
    const mockElement = {
      cropper: {
        getCroppedCanvas: vi.fn().mockReturnValue({
          width: 1200,
          height: 1200,
          toBlob: vi.fn((cb: (b: Blob) => void, type: string, quality: number) => {
            cb(new Blob(["cropped"], { type }));
          }),
        }),
      },
    };
    if (typeof ref === "function") {
      ref(mockElement);
    } else if (ref && typeof ref === "object") {
      ref.current = mockElement;
    }
    return <div data-testid="mock-cropper" />;
  }),
}));

vi.mock("cropperjs/dist/cropper.css", () => ({}));

vi.mock("@/lib/camera", () => ({
  supportsWebP: vi.fn().mockResolvedValue(true),
}));

import { ImageCropper } from "@/components/ui/image-cropper";

describe("ImageCropper", () => {
  const mockOnCrop = vi.fn();
  const mockOnRetake = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cropper with three action buttons", () => {
    render(
      <ImageCropper
        imageUrl="blob:test-url"
        onCrop={mockOnCrop}
        onRetake={mockOnRetake}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("撮り直す")).toBeInTheDocument();
    expect(screen.getByText("キャンセル")).toBeInTheDocument();
    expect(screen.getByText("決定")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <ImageCropper
        imageUrl="blob:test-url"
        onCrop={mockOnCrop}
        onRetake={mockOnRetake}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText("キャンセル"));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it("calls onRetake when retake button is clicked", () => {
    render(
      <ImageCropper
        imageUrl="blob:test-url"
        onCrop={mockOnCrop}
        onRetake={mockOnRetake}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText("撮り直す"));
    expect(mockOnRetake).toHaveBeenCalledOnce();
  });

  it("calls onCrop with a File when confirm button is clicked", async () => {
    render(
      <ImageCropper
        imageUrl="blob:test-url"
        onCrop={mockOnCrop}
        onRetake={mockOnRetake}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText("決定"));

    await vi.waitFor(() => {
      expect(mockOnCrop).toHaveBeenCalledOnce();
    });

    const file = mockOnCrop.mock.calls[0][0];
    expect(file).toBeInstanceOf(File);
  });
});
