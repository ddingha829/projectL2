"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import styles from "./RichTextEditor.module.css";

interface ImageCropModalProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ image, onCropComplete, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
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
        <div className={styles.cropperWrapper}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={undefined} // Free aspect ratio
            onCropChange={onCropChange}
            onCropComplete={onCropAreaChange}
            onZoomChange={onZoomChange}
          />
        </div>
        <div className={styles.controls}>
          <div className={styles.zoomControl}>
            <label>Zoom</label>
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
            <button type="button" className={styles.confirmBtn} onClick={handleDone}>크롭 완료</button>
          </div>
        </div>
      </div>
    </div>
  );
}
