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

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error("canvas.toBlob returned null"));
      else resolve(b);
    }, "image/jpeg", 0.95);
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
