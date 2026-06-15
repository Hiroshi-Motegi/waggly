"use client";

import { useRef, useState, useCallback, useEffect, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
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
  const isPickingRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<PickerState>({ step: "idle" });
  const [permissionToast, setPermissionToast] = useState(false);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleImageFile = useCallback(async (file: File) => {
    setState({ step: "loading" });
    try {
      const objectUrl = await preResizeImage(file);
      setState({ step: "cropping", imageUrl: objectUrl });
    } catch {
      setState({ step: "idle" });
    }
  }, []);

  const pickNativeAndProcess = useCallback(async () => {
    try {
      const file = await pickImageNative();
      await handleImageFile(file);
    } catch (error) {
      if (isCameraPermissionError(error)) {
        setPermissionToast(true);
        toastTimerRef.current = setTimeout(() => setPermissionToast(false), 3000);
      }
      if (!isCameraUserCancel(error)) {
        console.error("Camera error:", error);
      }
      setState({ step: "idle" });
    } finally {
      isPickingRef.current = false;
    }
  }, [handleImageFile]);

  const handleTriggerClick = useCallback(async () => {
    if (state.step !== "idle" || isPickingRef.current) return;

    if (isNative()) {
      isPickingRef.current = true;
      await pickNativeAndProcess();
    } else {
      fileInputRef.current?.click();
    }
  }, [state.step, pickNativeAndProcess]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await handleImageFile(file);
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
    setTimeout(() => {
      if (isNative()) {
        isPickingRef.current = true;
        pickNativeAndProcess();
      } else {
        fileInputRef.current?.click();
      }
    }, 0);
  }, [state, pickNativeAndProcess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleTriggerClick();
      }
    },
    [handleTriggerClick]
  );

  return (
    <>
      <div onClick={handleTriggerClick} onKeyDown={handleKeyDown} role="button" tabIndex={0}>
        {children}
      </div>

      {!isNative() && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {state.step === "cropping" &&
        createPortal(
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
          </Suspense>,
          document.body
        )}

      {permissionToast &&
        createPortal(
          <div className="fixed bottom-[calc(var(--bottom-nav-height)+16px)] left-1/2 -translate-x-1/2 z-50">
            <div className="rounded-full bg-[#333] px-5 py-2.5 text-sm font-medium text-white shadow-lg">
              カメラの使用を許可してください
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
