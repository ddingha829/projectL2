"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import styles from "./RichTextEditor.module.css";

interface ImageCropModalProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onUseOriginal?: () => void; // 원본 사용 콜백 추가
  onCancel: () => void;
}

export default function ImageCropModal({ image, onCropComplete, onUseOriginal, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [freeAspect, setFreeAspect] = useState<number>(16 / 9); // 자유 비율 기본값
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: any) => setCrop(crop);
  const onZoomChange = (zoom: any) => setZoom(zoom);

  const onCropAreaChange = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async () => {
    try {
      const img = await createImage(image);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
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

  const handleDone = async () => {
    const croppedBlob = await getCroppedImg();
    if (croppedBlob) {
      onCropComplete(croppedBlob);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.aspectControls}>
          <button type="button" className={aspect === undefined ? styles.activeAspect : ""} onClick={() => setAspect(undefined)}>자유 비율</button>
          <button type="button" className={aspect === 1 ? styles.activeAspect : ""} onClick={() => setAspect(1)}>1:1</button>
          <button type="button" className={aspect === 4/5 ? styles.activeAspect : ""} onClick={() => setAspect(4/5)}>4:5</button>
          <button type="button" className={aspect === 16/9 ? styles.activeAspect : ""} onClick={() => setAspect(16/9)}>16:9</button>
        </div>
        <div className={styles.cropperWrapper}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect === undefined ? freeAspect : aspect}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaChange}
            onZoomChange={onZoomChange}
          />
        </div>
        <div className={styles.controls}>
          {aspect === undefined && (
            <div className={styles.zoomControl}>
              <label>비율 조절</label>
              <input
                type="range"
                value={freeAspect}
                min={0.5}
                max={3.0}
                step={0.1}
                onChange={(e) => setFreeAspect(Number(e.target.value))}
              />
              <span style={{ fontSize: '0.8rem', minWidth: '40px', color: '#666' }}>{freeAspect.toFixed(1)}:1</span>
            </div>
          )}
          <div className={styles.zoomControl}>
            <label>확대 슬라이더</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </div>
          <div className={styles.buttonGroup}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>취소</button>
            {onUseOriginal && (
              <button type="button" className={styles.originalBtn} onClick={onUseOriginal}>원본 그대로 사용</button>
            )}
            <button type="button" className={styles.confirmBtn} onClick={handleDone}>크롭 완료</button>
          </div>
        </div>
      </div>
    </div>
  );
}
