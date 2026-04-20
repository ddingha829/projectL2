"use client"

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePost } from '@/app/actions/postManage'
import { saveDraft } from '@/app/write/actions'
import styles from '@/app/write/page.module.css'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/utils/image'

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  ssr: false,
  loading: () => <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>티끌러 로딩중...</div>
})
import ImageCropModal from '@/components/editor/ImageCropModal'

interface EditPostFormProps {
  postId: string
  initialTitle: string
  initialContent: string
  initialCategory: string
  initialImageUrl: string
  initialIsEditorsPick: boolean
  isAdmin: boolean
  initialIsPublic: boolean
  initialShowMainImage: boolean
  initialReviewSubject: string
  initialReviewRating: number
  initialReviewComment: string
}

export default function EditPostForm({
  postId, initialTitle, initialContent, initialCategory,
  initialImageUrl, initialIsEditorsPick,
  isAdmin, initialIsPublic, initialShowMainImage,
  initialReviewSubject, initialReviewRating, initialReviewComment
}: EditPostFormProps) {
  const [content, setContent] = useState(initialContent)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [showMainImage, setShowMainImage] = useState(initialShowMainImage)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isSubmittingRef = useRef(false)
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittingRef.current || isSubmitting) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitting, postId]);

  // [추가] 브라우저 비정상 종료 시 저장되었던 백업 복구 로직
  useEffect(() => {
    const checkBackup = () => {
      const backup = localStorage.getItem(`edit_backup_${postId}`);
      if (!backup) return;

      try {
        const data = JSON.parse(backup);
        
        // 1. 현재 DB 데이터와 백업 내용이 거의 동일하면 조용히 삭제하고 종료
        const normalize = (html: string) => html.replace(/\s+/g, '').replace(/<p><br><\/p>/g, '');
        const isSameAsDB = normalize(data.content || '') === normalize(initialContent || '') && 
                          data.imageUrl === initialImageUrl;

        if (isSameAsDB) {
          localStorage.removeItem(`edit_backup_${postId}`);
          return;
        }

        // 2. 내용에 차이가 있는 경우에만 복구 여부 확인
        const isStale = new Date().getTime() - data.lastUpdated > 86400000; // 24시간
        
        if (!isStale) {
          if (confirm(`비정상적으로 종료된 수정 중인 내용이 있습니다.\n마지막으로 작성하던 내용을 불러오시겠습니까?`)) {
            if (data.content) setContent(data.content);
            if (data.imageUrl) setImageUrl(data.imageUrl);
            if (data.showMainImage !== undefined) setShowMainImage(data.showMainImage);
          }
        }
        
        localStorage.removeItem(`edit_backup_${postId}`);
      } catch (e) {
        console.error("Backup restore error:", e);
      }
    };
    
    checkBackup();
  }, [postId, initialContent, initialImageUrl, initialShowMainImage]);

  // [수정] 사용자가 실제로 내용을 변경했을 때만 백업을 저장하도록 개선
  useEffect(() => {
    const isInitialContent = content === initialContent && 
                             imageUrl === initialImageUrl && 
                             showMainImage === initialShowMainImage;
    
    if (isInitialContent || isSubmitting) return;

    const backupData = {
      title: initialTitle, 
      content, 
      category: initialCategory, 
      imageUrl, 
      showMainImage, 
      lastUpdated: new Date().getTime()
    };
    
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`edit_backup_${postId}`, JSON.stringify(backupData));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, showMainImage, imageUrl, initialTitle, initialCategory, postId, initialContent, initialImageUrl, initialShowMainImage, isSubmitting]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  }

  const uploadMainImage = async (uploadBlob: Blob | File, isOriginal = false) => {
    setIsUploading(true)
    setShowCropModal(false)
    try {
      let finalBlob = uploadBlob;
      let fileExt = isOriginal ? (originalFile?.name.split('.').pop() || 'jpg') : 'jpg';
      let contentType = isOriginal ? (originalFile?.type || 'image/jpeg') : 'image/jpeg';

      if (!isOriginal) {
        finalBlob = await compressImage(new File([uploadBlob], "main.jpg", { type: "image/jpeg" }));
      }

      const fileName = `covers/${Math.random().toString(36).substring(2, 12)}_${Date.now()}.${fileExt}`
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, finalBlob, { contentType })

      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName)
      setImageUrl(publicUrl)
    } catch (err) {
      console.error('Edit upload failed:', err)
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
      setOriginalFile(null)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('content', content)
    formData.set('imageUrl', imageUrl)
    formData.set('showMainImage', showMainImage ? 'on' : 'off')
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const result = await updatePost(postId, formData)
        if (result.ok) {
          localStorage.removeItem(`edit_backup_${postId}`);
          window.location.href = result.redirectTo
        } else {
          alert('수정에 실패했습니다.')
          setIsSubmitting(false)
        }
      } catch (err) {
        console.error("Update submit error:", err)
        alert('네트워크 오류가 발생했습니다.')
        setIsSubmitting(false)
      }
    })
  }

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const result = await saveDraft({
        category: initialCategory,
        title: initialTitle,
        imageUrl,
        content,
        isEditorsPick: initialIsEditorsPick,
        isPublic,
        isFeature: initialCategory === 'feature',
        showMainImage
      });
      if (result.success) {
        alert("수정 중인 내용이 내 보관함에 저장되었습니다.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <div className={styles.inputGroup}>
        <label htmlFor="category">카테고리</label>
        <select id="category" name="category" required className={styles.input} defaultValue={initialCategory}>
          <option value="movie">영화</option>
          <option value="book">책</option>
          <option value="game">게임</option>
          <option value="restaurant">맛집</option>
          <option value="travel">여행</option>
          <option value="exhibition">전시회</option>
          <option value="other">기타</option>
          <option value="feature">✨ 기획전</option>
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="title">제목</label>
        <input type="text" id="title" name="title" required defaultValue={initialTitle} className={styles.input} />
      </div>

      <div className={styles.inputGroup}>
        <label>대표 이미지</label>
        <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
          {imageUrl ? (
            <img src={imageUrl} alt="Preview" className={styles.previewImage} />
          ) : (
            <div className={styles.uploadPlaceholder}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>클릭하여 이미지 업로드</span>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className={styles.hiddenInput} accept="image/*" />
        </div>
        <input type="hidden" name="imageUrl" value={imageUrl} />
        
        <div className={styles.checkboxGroup} style={{ marginTop: '10px' }}>
          <input 
            type="checkbox" 
            id="showMainImage" 
            name="showMainImage" 
            checked={showMainImage}
            onChange={(e) => setShowMainImage(e.target.checked)}
          />
          <label htmlFor="showMainImage" className={styles.checkboxLabel} style={{ fontSize: '0.85rem' }}>본문에 대표 이미지 포함하기</label>
        </div>
      </div>

      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용</label>
        <RichTextEditor content={content} onChange={setContent} />
        <textarea name="content" value={content} style={{ display: 'none' }} readOnly />
      </div>

      {isAdmin && (
        <div className={styles.checkboxGroup}>
          <input type="checkbox" id="isEditorsPick" name="isEditorsPick" defaultChecked={initialIsEditorsPick} />
          <label htmlFor="isEditorsPick" className={styles.checkboxLabel}>🏆 티끌러 추천(Editor's Pick)으로 지정</label>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-hover)', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="checkbox" 
            id="isPrivateCheck" 
            checked={!isPublic}
            onChange={(e) => setIsPublic(!e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <label htmlFor="isPrivateCheck" style={{ fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#555' }}>
            🔒 이 게시물을 비공개로 설정합니다
          </label>
          <input type="hidden" name="isPublic" value={isPublic ? 'on' : 'off'} />
        </div>
      </div>

      <div className={styles.buttonGroup} style={{ display: 'flex', gap: '12px' }}>
        <button 
          type="button" 
          className={styles.saveDraftBtn} 
          onClick={handleSaveDraft}
          disabled={isSaving}
          style={{ flex: 1 }}
        >
          {isSaving ? '저장 중...' : '임시 저장'}
        </button>
        <button 
          type="submit" 
          className={styles.submitBtn} 
          disabled={isPending || isUploading}
          style={{ flex: 1 }}
        >
          {isPending ? '수정 중...' : isUploading ? '이미지 업로드 중...' : '수정 완료'}
        </button>
      </div>

      {showCropModal && (
        <ImageCropModal 
          image={cropImageSrc}
          onCropComplete={(blob) => uploadMainImage(blob)}
          onUseOriginal={() => originalFile && uploadMainImage(originalFile, true)}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </form>
  )
}
