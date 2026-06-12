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
