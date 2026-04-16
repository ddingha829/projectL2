"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import styles from "./RichTextEditor.module.css";

interface ImageCropModalProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onUseOriginal?: () => void;
  onCancel: () => void;
}

type AspectPreset = "free" | "1:1" | "4:3" | "5:4" | "16:9";

const ASPECT_VALUES: Record<Exclude<AspectPreset, "free">, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "5:4": 5 / 4,
  "16:9": 16 / 9,
};

export default function ImageCropModal({ image, onCropComplete, onUseOriginal, onCancel }: ImageCropModalProps) {
  // --- Common State ---
  const [selectedPreset, setSelectedPreset] = useState<AspectPreset>("free");
  const [isPortrait, setIsPortrait] = useState(false); // false = 가로, true = 세로

  // --- react-easy-crop State (for preset ratios) ---
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // --- react-image-crop State (for free-form) ---
  const [freeCrop, setFreeCrop] = useState<Crop>({ unit: "%", x: 10, y: 10, width: 80, height: 80 });
  const freeImgRef = useRef<HTMLImageElement | null>(null);

  const isFreeMode = selectedPreset === "free";

  // Get current aspect ratio (accounting for portrait toggle)
  const getCurrentAspect = (): number => {
    if (isFreeMode) return 0; // not used
    const base = ASPECT_VALUES[selectedPreset as Exclude<AspectPreset, "free">];
    return isPortrait ? 1 / base : base;
  };

  // Get display label for current ratio
  const getOrientationLabel = (): string => {
    if (selectedPreset === "free" || selectedPreset === "1:1") return "";
    const [a, b] = selectedPreset.split(":");
    return isPortrait ? `${b}:${a}` : `${a}:${b}`;
  };

  // Reset crop/zoom when switching presets
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setFreeCrop({ unit: "%", x: 10, y: 10, width: 80, height: 80 });
  }, [selectedPreset, isPortrait]);

  // --- react-easy-crop callbacks ---
  const onCropAreaChange = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // --- Image helpers ---
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // [중요] 외부 URL 이미지를 캔버스에서 다루기 위해 필수
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", (error) => reject(error));
      img.src = url;
    });

  // Crop with react-easy-crop data
  const getCroppedImgFromEasyCrop = async (): Promise<Blob | null> => {
    try {
      const img = await createImage(image);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx || !croppedAreaPixels) return null;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas to Blob failed"));
        }, "image/jpeg", 0.9);
      });
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // Crop with react-image-crop data
  const getCroppedImgFromFreeCrop = async (): Promise<Blob | null> => {
    try {
      const imgEl = freeImgRef.current;
      if (!imgEl) return null;

      const scaleX = imgEl.naturalWidth / imgEl.width;
      const scaleY = imgEl.naturalHeight / imgEl.height;

      const pixelX = freeCrop.x * scaleX;
      const pixelY = freeCrop.y * scaleY;
      const pixelW = freeCrop.width * scaleX;
      const pixelH = freeCrop.height * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = pixelW;
      canvas.height = pixelH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const srcImg = await createImage(image);
      ctx.drawImage(srcImg, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas to Blob failed"));
        }, "image/jpeg", 0.9);
      });
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleDone = async () => {
    const croppedBlob = isFreeMode
      ? await getCroppedImgFromFreeCrop()
      : await getCroppedImgFromEasyCrop();
    if (croppedBlob) {
      onCropComplete(croppedBlob);
    }
  };

  // Convert freeCrop from % to px when image loads for react-image-crop
  const onFreeImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    freeImgRef.current = e.currentTarget;
    // Initialize with a centered 80% crop
    const { width, height } = e.currentTarget;
    setFreeCrop({
      unit: "px",
      x: width * 0.1,
      y: height * 0.1,
      width: width * 0.8,
      height: height * 0.8,
    });
  };

  return (
    <div 
      className={styles.modalOverlay} 
      style={{ zIndex: 999999 }} 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Preset Buttons */}
        <div className={styles.aspectControls}>
          {(["free", "1:1", "4:3", "5:4", "16:9"] as AspectPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              className={selectedPreset === preset ? styles.activeAspect : ""}
              onClick={() => { setSelectedPreset(preset); setIsPortrait(false); }}
            >
              {preset === "free" ? "자유" : preset}
            </button>
          ))}

          {/* Orientation toggle (hide for free & 1:1) */}
          {selectedPreset !== "free" && selectedPreset !== "1:1" && (
            <button
              type="button"
              className={styles.orientationToggle}
              onClick={() => setIsPortrait(!isPortrait)}
              title="가로/세로 전환"
            >
              🔄 {getOrientationLabel()}
            </button>
          )}
        </div>

        {/* Cropper Area */}
        <div className={styles.cropperWrapper}>
          {isFreeMode ? (
            /* Free-form: react-image-crop with draggable borders */
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
              <ReactCrop
                crop={freeCrop}
                onChange={(c) => setFreeCrop(c)}
                keepSelection={true}
                style={{ maxHeight: "100%", maxWidth: "100%" }}
              >
                <img
                  src={image}
                  alt="crop"
                  onLoad={onFreeImageLoad}
                  crossOrigin="anonymous"
                  style={{ maxHeight: "100%", maxWidth: "100%", display: "block" }}
                />
              </ReactCrop>
            </div>
          ) : (
            /* Preset ratios: react-easy-crop */
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={getCurrentAspect()}
              onCropChange={setCrop}
              onCropComplete={onCropAreaChange}
              onZoomChange={setZoom}
            />
          )}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          {!isFreeMode && (
            <div className={styles.zoomControl}>
              <label>확대</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </div>
          )}

          <div className={styles.buttonGroup}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>취소</button>
            {onUseOriginal && (
              <button type="button" className={styles.originalBtn} onClick={onUseOriginal}>원본 그대로 사용</button>
            )}
            <button type="button" className={styles.confirmBtn} onClick={handleDone}>크롭 완료</button>
          </div>
        </div>
      </div>

      {/* Mobile touch handle improvements */}
      <style jsx global>{`
        /* Enlarge ALL drag handles (edges + corners) for mobile touch */
        @media (max-width: 768px) {
          .ReactCrop__drag-handle {
            width: 24px !important;
            height: 24px !important;
          }
          /* Edge handles: make them wider touch targets */
          .ReactCrop__drag-handle.ord-n,
          .ReactCrop__drag-handle.ord-s {
            width: 48px !important;
            height: 20px !important;
            margin-left: -24px !important;
          }
          .ReactCrop__drag-handle.ord-e,
          .ReactCrop__drag-handle.ord-w {
            width: 20px !important;
            height: 48px !important;
            margin-top: -24px !important;
          }
          /* Corner handles: bigger for easier touch */
          .ReactCrop__drag-handle.ord-nw,
          .ReactCrop__drag-handle.ord-ne,
          .ReactCrop__drag-handle.ord-sw,
          .ReactCrop__drag-handle.ord-se {
            width: 28px !important;
            height: 28px !important;
          }
        }
        /* Prevent browser pull-to-refresh / scroll gestures interfering */
        .ReactCrop {
          touch-action: none;
        }
      `}</style>
    </div>
  );
}
