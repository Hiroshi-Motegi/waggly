# Native Camera + Image Cropper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native camera support and 1:1 image cropping for clubs and accessories across Web, iOS, and Android.

**Architecture:** A shared `ImagePicker` component abstracts platform differences (Capacitor Camera vs file input). All picked images pass through an `ImageCropper` modal (react-cropper, lazy loaded) for 1:1 cropping. Images are pre-resized to 2400px before cropping to prevent OOM, and output as 1200px WebP (JPEG fallback).

**Tech Stack:** `@capacitor/camera` v8, `react-cropper`, `cropperjs`, React.lazy, Capacitor 8

**Spec:** `docs/superpowers/specs/2026-06-13-native-camera-image-cropper-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/camera.ts` | Create | Native camera access (`pickImageNative`), pre-resize utility (`preResizeImage`), WebP support detection |
| `src/components/ui/image-cropper.tsx` | Create | 1:1 cropper modal with react-cropper, retake/cancel/confirm buttons |
| `src/components/ui/image-picker.tsx` | Create | Unified image picking: platform branch, pre-resize, lazy-load cropper |
| `src/components/club/club-form.tsx` | Modify | Replace file input with ImagePicker |
| `src/components/club/club-image-gallery.tsx` | Modify | Replace file input with ImagePicker |
| `src/app/items/new/page.tsx` | Modify | Replace file input with ImagePicker |
| `src/app/items/[id]/page-client.tsx` | Modify | Replace file input with ImagePicker |
| `capacitor.config.ts` | Modify | Add Camera plugin config |
| `ios/App/App/Info.plist` | Modify | Add camera/photo library usage descriptions |
| `android/app/src/main/AndroidManifest.xml` | Modify | Add CAMERA, READ_EXTERNAL_STORAGE, READ_MEDIA_IMAGES permissions |
| `__tests__/lib/camera.test.ts` | Create | Tests for pickImageNative, preResizeImage, WebP detection |
| `__tests__/components/image-cropper.test.tsx` | Create | Tests for cropper output, cancel, retake callbacks |
| `__tests__/components/image-picker.test.tsx` | Create | Tests for platform branching, integration with cropper |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install npm packages**

```bash
npm install @capacitor/camera react-cropper cropperjs
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@capacitor/camera'); console.log('camera ok')"
node -e "require('react-cropper'); console.log('react-cropper ok')"
node -e "require('cropperjs'); console.log('cropperjs ok')"
```

Expected: All three print "ok".

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @capacitor/camera, react-cropper, cropperjs dependencies"
```

---

## Task 2: Native platform config

**Files:**
- Modify: `capacitor.config.ts`
- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Add Camera plugin config to capacitor.config.ts**

Add `Camera` to the `plugins` object in `capacitor.config.ts`:

```ts
Camera: {
  presentationStyle: "fullscreen",
},
```

The full plugins block becomes:

```ts
plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#15803d",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#139847",
      overlaysWebView: false,
    },
    GoogleAuth: {
      scopes: ["email", "profile"],
      clientId: "440549179236-qgufual2ha6galtdnfp0kuqam44hg9kk.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    Camera: {
      presentationStyle: "fullscreen",
    },
  },
```

- [ ] **Step 2: Add iOS permissions to Info.plist**

Add before the closing `</dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>ギアの写真を撮影するためにカメラを使用します</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>ギアの写真を選択するためにフォトライブラリを使用します</string>
```

- [ ] **Step 3: Add Android permissions to AndroidManifest.xml**

Add after the existing `<uses-permission android:name="android.permission.INTERNET" />` line:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<!-- Android 12以下: フォトライブラリ読み取り -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<!-- Android 13+ (API 33): フォトライブラリ読み取り -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

- [ ] **Step 4: Commit**

```bash
git add capacitor.config.ts ios/App/App/Info.plist android/app/src/main/AndroidManifest.xml
git commit -m "chore: add camera permissions for iOS and Android, configure Camera plugin"
```

---

## Task 3: camera.ts — preResizeImage + WebP detection

**Files:**
- Create: `src/lib/camera.ts`
- Create: `__tests__/lib/camera.test.ts`

- [ ] **Step 1: Write failing tests for preResizeImage and WebP detection**

Create `__tests__/lib/camera.test.ts`:

```ts
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
    // In jsdom, canvas.toBlob may not produce real webp
    const result = await supportsWebP();
    expect(typeof result).toBe("boolean");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/camera.test.ts
```

Expected: FAIL — `@/lib/camera` module not found.

- [ ] **Step 3: Implement camera.ts**

Create `src/lib/camera.ts`:

```ts
import { isNative } from "@/lib/platform";

/**
 * Pre-resize an image before passing to the cropper (OOM prevention).
 * Returns an Object URL pointing to the resized Blob.
 * Caller must call URL.revokeObjectURL() when done.
 */
export async function preResizeImage(
  file: File,
  maxSize: number = 2400
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let targetW = width;
  let targetH = height;

  if (width > maxSize || height > maxSize) {
    if (width >= height) {
      targetW = maxSize;
      targetH = Math.round((height / width) * maxSize);
    } else {
      targetH = maxSize;
      targetW = Math.round((width / height) * maxSize);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95);
  });

  return URL.createObjectURL(blob);
}

/** Detect WebP canvas export support. Cached after first call. */
let _webpSupported: boolean | null = null;

export async function supportsWebP(): Promise<boolean> {
  if (_webpSupported !== null) return _webpSupported;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp");
  });

  _webpSupported = blob?.type === "image/webp";
  return _webpSupported;
}

/**
 * Pick an image using the native Capacitor Camera plugin.
 * Prompts user to choose between camera and photo library.
 * Returns a File object.
 *
 * Throws if:
 * - User denies camera permission (error.message contains "permission" or "denied")
 * - Camera plugin not available
 */
export async function pickImageNative(): Promise<File> {
  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );

  const photo = await Camera.getPhoto({
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
    quality: 95,
    saveToGallery: false,
  });

  const dataUrl = photo.dataUrl;
  if (!dataUrl) throw new Error("No image data returned from camera");

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = photo.format || "jpeg";
  return new File([blob], `camera.${ext}`, {
    type: `image/${ext === "jpg" ? "jpeg" : ext}`,
  });
}

/**
 * Check if a Camera error is a permission denial (not a user cancel).
 */
export function isCameraPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("permission") || msg.includes("denied");
}

/**
 * Check if a Camera error is a user cancel (not a permission issue).
 */
export function isCameraUserCancel(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("cancel") || msg.includes("user cancelled");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/camera.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/camera.ts __tests__/lib/camera.test.ts
git commit -m "feat: add camera utilities — preResizeImage, WebP detection, native picker"
```

---

## Task 4: ImageCropper component

**Files:**
- Create: `src/components/ui/image-cropper.tsx`
- Create: `__tests__/components/image-cropper.test.tsx`

- [ ] **Step 1: Write failing tests for ImageCropper**

Create `__tests__/components/image-cropper.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock react-cropper
vi.mock("react-cropper", () => ({
  __esModule: true,
  default: vi.fn(({ ref, ...props }: any) => {
    // Simulate Cropper component that exposes getCroppedCanvas via ref
    if (typeof ref === "function") {
      ref({
        cropper: {
          getCroppedCanvas: vi.fn().mockReturnValue({
            width: 1200,
            height: 1200,
            toBlob: vi.fn((cb: (b: Blob) => void, type: string, quality: number) => {
              cb(new Blob(["cropped"], { type }));
            }),
          }),
        },
      });
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

    // onCrop is called async after toBlob resolves
    await vi.waitFor(() => {
      expect(mockOnCrop).toHaveBeenCalledOnce();
    });

    const file = mockOnCrop.mock.calls[0][0];
    expect(file).toBeInstanceOf(File);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/components/image-cropper.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ImageCropper**

Create `src/components/ui/image-cropper.tsx`:

```tsx
"use client";

import { useRef, useCallback, useState } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { supportsWebP } from "@/lib/camera";

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (file: File) => void;
  onRetake: () => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const MAX_OUTPUT_SIZE = 1200;

export function ImageCropper({
  imageUrl,
  onCrop,
  onRetake,
  onCancel,
  aspectRatio = 1,
}: ImageCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = useCallback(async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || isProcessing) return;

    setIsProcessing(true);

    try {
      const croppedCanvas = cropper.getCroppedCanvas({
        maxWidth: MAX_OUTPUT_SIZE,
        maxHeight: MAX_OUTPUT_SIZE,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
      });

      const useWebP = await supportsWebP();
      const mimeType = useWebP ? "image/webp" : "image/jpeg";
      const ext = useWebP ? "webp" : "jpg";

      croppedCanvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }
          const file = new File([blob], `cropped.${ext}`, { type: mimeType });
          onCrop(file);
        },
        mimeType,
        0.85
      );
    } catch {
      setIsProcessing(false);
    }
  }, [onCrop, isProcessing]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex-1 overflow-hidden">
        <Cropper
          ref={cropperRef}
          src={imageUrl}
          style={{ height: "100%", width: "100%" }}
          aspectRatio={aspectRatio}
          viewMode={1}
          guides={true}
          background={false}
          responsive={true}
          autoCropArea={1}
          checkOrientation={false}
        />
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-black/90">
        <button
          type="button"
          onClick={onRetake}
          className="px-4 py-2 text-sm text-white"
        >
          撮り直す
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-white"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          {isProcessing ? "処理中..." : "決定"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/components/image-cropper.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/image-cropper.tsx __tests__/components/image-cropper.test.tsx
git commit -m "feat: add ImageCropper component with 1:1 crop, retake, and WebP output"
```

---

## Task 5: ImagePicker component

**Files:**
- Create: `src/components/ui/image-picker.tsx`
- Create: `__tests__/components/image-picker.test.tsx`

- [ ] **Step 1: Write failing tests for ImagePicker**

Create `__tests__/components/image-picker.test.tsx`:

```tsx
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

    // Clicking trigger should not crash; file input is hidden
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/components/image-picker.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ImagePicker**

Create `src/components/ui/image-picker.tsx`:

```tsx
"use client";

import { useRef, useState, useCallback, lazy, Suspense } from "react";
import { isNative } from "@/lib/platform";
import {
  pickImageNative,
  preResizeImage,
  isCameraPermissionError,
  isCameraUserCancel,
} from "@/lib/camera";

const ImageCropper = lazy(() =>
  import("@/components/ui/image-cropper").then((m) => ({
    default: m.ImageCropper,
  }))
);

interface ImagePickerProps {
  onPick: (file: File) => void;
  children: React.ReactNode;
}

type PickerState =
  | { step: "idle" }
  | { step: "cropping"; imageUrl: string }
  | { step: "loading" };

export function ImagePicker({ onPick, children }: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<PickerState>({ step: "idle" });
  const [permissionToast, setPermissionToast] = useState(false);

  const handleImageFile = useCallback(async (file: File) => {
    setState({ step: "loading" });
    try {
      const objectUrl = await preResizeImage(file);
      setState({ step: "cropping", imageUrl: objectUrl });
    } catch {
      setState({ step: "idle" });
    }
  }, []);

  const handleTriggerClick = useCallback(async () => {
    if (state.step !== "idle") return;

    if (isNative()) {
      try {
        const file = await pickImageNative();
        await handleImageFile(file);
      } catch (error) {
        if (isCameraPermissionError(error)) {
          setPermissionToast(true);
          setTimeout(() => setPermissionToast(false), 3000);
        }
        // User cancel: do nothing
        if (!isCameraUserCancel(error)) {
          console.error("Camera error:", error);
        }
        setState({ step: "idle" });
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [state.step, handleImageFile]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await handleImageFile(file);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleImageFile]
  );

  const handleCrop = useCallback(
    (file: File) => {
      if (state.step === "cropping") {
        URL.revokeObjectURL(state.imageUrl);
      }
      setState({ step: "idle" });
      onPick(file);
    },
    [state, onPick]
  );

  const handleCancel = useCallback(() => {
    if (state.step === "cropping") {
      URL.revokeObjectURL(state.imageUrl);
    }
    setState({ step: "idle" });
  }, [state]);

  const handleRetake = useCallback(() => {
    if (state.step === "cropping") {
      URL.revokeObjectURL(state.imageUrl);
    }
    setState({ step: "idle" });
    // Trigger pick again after state resets
    setTimeout(() => {
      if (isNative()) {
        handleTriggerClick();
      } else {
        fileInputRef.current?.click();
      }
    }, 0);
  }, [state, handleTriggerClick]);

  return (
    <>
      <div onClick={handleTriggerClick} role="button" tabIndex={0}>
        {children}
      </div>

      {!isNative() && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {state.step === "cropping" && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
              <div className="text-white">読み込み中...</div>
            </div>
          }
        >
          <ImageCropper
            imageUrl={state.imageUrl}
            onCrop={handleCrop}
            onRetake={handleRetake}
            onCancel={handleCancel}
          />
        </Suspense>
      )}

      {permissionToast && (
        <div className="fixed bottom-[calc(var(--bottom-nav-height)+16px)] left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-full bg-[#333] px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            カメラの使用を許可してください
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/components/image-picker.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/image-picker.tsx __tests__/components/image-picker.test.tsx
git commit -m "feat: add ImagePicker component with native/web branching and lazy cropper"
```

---

## Task 6: Integrate into club-form.tsx

**Files:**
- Modify: `src/components/club/club-form.tsx`

- [ ] **Step 1: Replace file input with ImagePicker**

In `src/components/club/club-form.tsx`:

Remove the `useRef` for `fileInputRef` and the `handleFileSelect` function. Replace the image picker section.

Replace the import line:

```ts
import { useRef, useState } from "react";
```

with:

```ts
import { useState } from "react";
```

Add import:

```ts
import { ImagePicker } from "@/components/ui/image-picker";
```

Remove these lines:

```ts
const fileInputRef = useRef<HTMLInputElement>(null);
```

```ts
function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
```

Replace the image picker UI block (the entire `{showImagePicker && (...)}` section at lines 159-193) with:

```tsx
{showImagePicker && (
  <div className="flex flex-col gap-0.5 py-1">
    <span className={labelClass}>写真</span>
    <div className="flex gap-2">
      {previewUrl && (
        <div className="relative h-20 w-20 shrink-0">
          <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {!previewUrl && (
        <ImagePicker onPick={(file) => {
          setPendingFile(file);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(URL.createObjectURL(file));
        }}>
          <button
            type="button"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
          >
            <Plus className="h-6 w-6" />
          </button>
        </ImagePicker>
      )}
    </div>
  </div>
)}
```

Note: This component uses the 2-stage `pendingFile` pattern — the File is stored in state and uploaded after club creation, unlike the other 3 integrations which upload immediately.

- [ ] **Step 2: Verify the app builds**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds (or only unrelated warnings).

- [ ] **Step 3: Commit**

```bash
git add src/components/club/club-form.tsx
git commit -m "feat: integrate ImagePicker into club form (pendingFile pattern)"
```

---

## Task 7: Integrate into club-image-gallery.tsx

**Files:**
- Modify: `src/components/club/club-image-gallery.tsx`

- [ ] **Step 1: Replace file input with ImagePicker**

In `src/components/club/club-image-gallery.tsx`:

Replace the imports:

```ts
import { useRef, useState } from "react";
```

with:

```ts
import { useState } from "react";
```

Add import:

```ts
import { ImagePicker } from "@/components/ui/image-picker";
```

Replace the entire component body with:

```tsx
export function ClubImageGallery({ clubId, images, onUpload }: ClubImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);

  async function handlePick(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`/api/clubs/${clubId}/images`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newImage = await res.json();
        onUpload(newImage);
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((img) => (
          <img
            key={img.id}
            src={img.image_url}
            alt="Club"
            className={`h-20 w-20 shrink-0 rounded-lg object-cover ${
              img.is_primary ? "ring-2 ring-[#006728]" : ""
            }`}
          />
        ))}
        {isUploading ? (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#006728] text-[#006728]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ImagePicker onPick={handlePick}>
            <button
              type="button"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
            >
              <Plus className="h-6 w-6" />
            </button>
          </ImagePicker>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the app builds**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/club/club-image-gallery.tsx
git commit -m "feat: integrate ImagePicker into club image gallery (immediate upload)"
```

---

## Task 8: Integrate into items/new/page.tsx

**Files:**
- Modify: `src/app/items/new/page.tsx`

- [ ] **Step 1: Replace file input with ImagePicker**

In `src/app/items/new/page.tsx`:

Replace the import:

```ts
import { useRef, useState } from "react";
```

with:

```ts
import { useState } from "react";
```

Add import:

```ts
import { ImagePicker } from "@/components/ui/image-picker";
```

Remove these lines:

```ts
const fileInputRef = useRef<HTMLInputElement>(null);
```

```ts
function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
```

Replace the image picker UI section (lines 125-157, the `{/* 画像 */}` block inside the form) with:

```tsx
{/* 画像 */}
<div className="flex flex-col gap-0.5 py-1">
  <span className={labelClass}>写真</span>
  <div className="flex gap-2">
    {previewUrl && (
      <div className="relative h-20 w-20 shrink-0">
        <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
        <button
          type="button"
          onClick={removeImage}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )}
    {!previewUrl && (
      <ImagePicker onPick={(file) => {
        setPendingFile(file);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
      }}>
        <button
          type="button"
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[#c4c4c4] text-[#8b8b8b]"
        >
          <Plus className="h-6 w-6" />
        </button>
      </ImagePicker>
    )}
  </div>
</div>
```

Also remove the hidden file input at the bottom of the old image block:

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={handleFileSelect}
/>
```

- [ ] **Step 2: Verify the app builds**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/items/new/page.tsx
git commit -m "feat: integrate ImagePicker into new accessory page"
```

---

## Task 9: Integrate into items/[id]/page-client.tsx

**Files:**
- Modify: `src/app/items/[id]/page-client.tsx`

- [ ] **Step 1: Replace file input with ImagePicker**

In `src/app/items/[id]/page-client.tsx`:

Add import:

```ts
import { ImagePicker } from "@/components/ui/image-picker";
```

Remove `fileInputRef`:

```ts
const fileInputRef = useRef<HTMLInputElement>(null);
```

Remove `handleImageSelect`:

```ts
function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDeleteImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
```

Remove `useRef` from the import if no longer used (check if any other ref remains — `useRef` is no longer needed here).

Replace the edit mode image section. The current block (lines 211-242) showing the image with "写真を追加" / "変更する" / "削除する" buttons and hidden file input becomes:

```tsx
{/* 画像 */}
<div className="flex flex-col gap-0.5 py-1">
  <span className="text-sm">画像</span>
  {(() => {
    const displayUrl = deleteImage ? null : (previewUrl ?? item?.image_url);
    return (
      <div className="flex flex-col items-center gap-1">
        {displayUrl ? (
          <img src={displayUrl} alt="" className="max-h-[229px] rounded object-contain" />
        ) : (
          <ImagePicker onPick={(file) => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPendingFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setDeleteImage(false);
          }}>
            <button
              type="button"
              className="h-32 w-full rounded border-2 border-dashed border-[#c4c4c4] flex items-center justify-center text-base text-[#8b8b8b]"
            >
              写真を追加
            </button>
          </ImagePicker>
        )}
        {displayUrl && (
          <div className="flex gap-2.5">
            <ImagePicker onPick={(file) => {
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPendingFile(file);
              setPreviewUrl(URL.createObjectURL(file));
              setDeleteImage(false);
            }}>
              <button type="button" className="rounded-full border border-[#006728] px-5 py-1 text-sm font-bold text-[#006728]">
                変更する
              </button>
            </ImagePicker>
            <button type="button" onClick={handleImageDelete} className="rounded-full border border-[#006728] px-5 py-1 text-sm font-bold text-[#006728]">
              削除する
            </button>
          </div>
        )}
      </div>
    );
  })()}
</div>
```

Remove the hidden file input:

```tsx
<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
```

- [ ] **Step 2: Verify the app builds**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/items/[id]/page-client.tsx
git commit -m "feat: integrate ImagePicker into accessory detail edit page"
```

---

## Task 10: Run all tests + Capacitor sync

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass, including the new camera, image-cropper, and image-picker tests.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Sync Capacitor**

```bash
npx cap sync
```

Expected: Syncs successfully, Camera plugin registered for both iOS and Android.

- [ ] **Step 4: Commit any fixes if needed**

If tests or lint revealed issues, fix and commit:

```bash
git add -A
git commit -m "fix: address test/lint issues from camera integration"
```

---

## Task 11: Manual testing on devices

This task is manual verification — no code changes expected.

- [ ] **Step 1: Test on Web browser**

1. Start dev server: `npm run dev`
2. Navigate to club edit page → click + to add image
3. Select an image file → verify cropper modal appears with 1:1 ratio
4. Test "撮り直す" → should re-open file picker
5. Test "キャンセル" → should close modal
6. Test "決定" → should upload cropped 1:1 image
7. Repeat for accessory new/edit pages

- [ ] **Step 2: Build for native**

```bash
npm run build:app && npx cap sync
```

- [ ] **Step 3: Test on Android**

1. Build and deploy: `cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`
2. Test camera permission prompt appears on first use
3. Test CameraSource.Prompt shows camera/library choice
4. Test camera capture → cropper → upload flow
5. Test photo library selection → cropper → upload flow
6. Test permission denial → toast message appears

- [ ] **Step 4: Test on iOS**

1. Open in Xcode: `npx cap open ios`
2. Run on simulator or device
3. Test same flows as Android
4. Verify permission descriptions appear in system dialogs
