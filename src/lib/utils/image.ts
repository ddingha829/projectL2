/**
 * 브라우저의 Canvas API를 사용하여 이미지를 리사이징 및 압축합니다.
 * @param file 업로드할 원본 이미지 파일
 * @param maxWidth 최대 허용 가로 너비 (기본 1600px)
 * @param quality 압축 품질 (0~1 사이, 기본 0.8)
 * @returns 압축된 이미지 Blob
 */
export async function compressImage(
  file: File, 
  maxWidth: number = 1600, 
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 리사이징 계산: maxWidth보다 클 경우 비율 유지하며 축소
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        // 이미지 그리기 (리사이징 적용)
        ctx.drawImage(img, 0, 0, width, height);

        // Canvas 내용을 Blob으로 변환 (품질 압축 적용)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          'image/jpeg', // 범용성을 위해 jpeg로 압축 권장
          quality
        );
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}
