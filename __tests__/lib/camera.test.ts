import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createImageBitmap globally
const mockCreateImageBitmap = vi.fn();
vi.stubGlobal("createImageBitmap", mockCreateImageBitmap);

// Mock URL.createObjectURL / revokeObjectURL
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
vi.stubGlobal("URL", {
  ...globalThis.URL,
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

import { preResizeImage, supportsWebP } from "@/lib/camera";

describe("preResizeImage", () => {
  let mockCanvas: {
    width: number;
    height: number;
    getContext: ReturnType<typeof vi.fn>;
    toBlob: ReturnType<typeof vi.fn>;
  };
  let mockCtx: { drawImage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = { drawImage: vi.fn() };
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn(),
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockCanvas as any);
    mockCreateObjectURL.mockReturnValue("blob:mock-url");
  });

  it("returns Object URL without resizing when image is smaller than maxSize", async () => {
    const mockBitmap = { width: 800, height: 600, close: vi.fn() } as any;
    mockCreateImageBitmap.mockResolvedValue(mockBitmap);

    const smallBlob = new Blob(["fake"], { type: "image/jpeg" });
    mockCanvas.toBlob.mockImplementation((cb: (b: Blob) => void) => cb(smallBlob));

    const file = new File(["test"], "photo.jpg", { type: "image/jpeg" });
    const result = await preResizeImage(file);

    expect(result).toBe("blob:mock-url");
    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600);
    expect(mockBitmap.close).toHaveBeenCalled();
  });

  it("resizes landscape image to maxSize width", async () => {
    const mockBitmap = { width: 4000, height: 3000, close: vi.fn() } as any;
    mockCreateImageBitmap.mockResolvedValue(mockBitmap);

    const resizedBlob = new Blob(["resized"], { type: "image/jpeg" });
    mockCanvas.toBlob.mockImplementation((cb: (b: Blob) => void) => cb(resizedBlob));

    const file = new File(["test"], "photo.jpg", { type: "image/jpeg" });
    const result = await preResizeImage(file, 2400);

    expect(mockCanvas.width).toBe(2400);
    expect(mockCanvas.height).toBe(1800);
    expect(result).toBe("blob:mock-url");
  });

  it("resizes portrait image to maxSize height", async () => {
    const mockBitmap = { width: 3000, height: 5000, close: vi.fn() } as any;
    mockCreateImageBitmap.mockResolvedValue(mockBitmap);

    const resizedBlob = new Blob(["resized"], { type: "image/jpeg" });
    mockCanvas.toBlob.mockImplementation((cb: (b: Blob) => void) => cb(resizedBlob));

    const file = new File(["test"], "photo.jpg", { type: "image/jpeg" });
    const result = await preResizeImage(file, 2400);

    expect(mockCanvas.width).toBe(1440);
    expect(mockCanvas.height).toBe(2400);
  });
});

describe("supportsWebP", () => {
  it("returns a boolean", async () => {
    const result = await supportsWebP();
    expect(typeof result).toBe("boolean");
  });
});
