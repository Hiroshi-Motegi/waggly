"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { supportsWebP } from "@/lib/camera";
import { ZoomIn, ZoomOut, Move, RotateCcw } from "lucide-react";

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (file: File) => void;
  onRetake: () => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const MAX_OUTPUT_SIZE = 1200;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

export function ImageCropper({
  imageUrl,
  onCrop,
  onRetake,
  onCancel,
  aspectRatio = 1,
}: ImageCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Sync zoom state when user pinch-zooms or scrolls
  useEffect(() => {
    const el = cropperRef.current;
    if (!el || !el.addEventListener) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.ratio != null) {
        setZoom(detail.ratio);
      }
    };
    el.addEventListener("zoom", handler);
    return () => el.removeEventListener("zoom", handler);
  }, [isReady]);

  const handleReady = useCallback(() => {
    setIsReady(true);
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const imageData = cropper.getImageData();
      // Initial zoom ratio
      setZoom(imageData.width / imageData.naturalWidth);
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    cropperRef.current?.cropper.zoom(ZOOM_STEP);
  }, []);

  const handleZoomOut = useCallback(() => {
    cropperRef.current?.cropper.zoom(-ZOOM_STEP);
  }, []);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const cropper = cropperRef.current?.cropper;
      if (!cropper) return;
      const newZoom = parseFloat(e.target.value);
      cropper.zoomTo(newZoom);
      setZoom(newZoom);
    },
    []
  );

  const handleReset = useCallback(() => {
    cropperRef.current?.cropper.reset();
  }, []);

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
      {/* Cropper area */}
      <div className="flex-1 overflow-hidden relative">
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
          dragMode="move"
          ready={handleReady}
        />
        {/* Hint overlay — shown briefly */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-white text-sm">読み込み中...</div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3 px-4 py-2 bg-black/95">
        <button type="button" onClick={handleZoomOut} className="p-1.5 text-white/70 active:text-white">
          <ZoomOut className="h-5 w-5" />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={handleSliderChange}
          className="flex-1 h-1 appearance-none bg-white/30 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
        />
        <button type="button" onClick={handleZoomIn} className="p-1.5 text-white/70 active:text-white">
          <ZoomIn className="h-5 w-5" />
        </button>
        <button type="button" onClick={handleReset} className="p-1.5 text-white/70 active:text-white ml-1">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/95">
        <button
          type="button"
          onClick={onRetake}
          className="px-3 py-2 text-sm text-white/80 active:text-white"
        >
          撮り直す
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm text-white/80 active:text-white"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="rounded-full bg-white px-6 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          {isProcessing ? "処理中..." : "決定"}
        </button>
      </div>
    </div>
  );
}
