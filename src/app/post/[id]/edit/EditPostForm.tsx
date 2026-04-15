"use client"

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePost, getUniqueReviewSubjects } from '@/app/actions/postManage'
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
  initialReviewSubject?: string
  initialReviewRating?: number
  initialReviewComment?: string
  isAdmin: boolean
  initialIsPublic: boolean
  initialShowMainImage: boolean
}

export default function EditPostForm({
  postId, initialTitle, initialContent, initialCategory,
  initialImageUrl, initialIsEditorsPick,
  initialReviewSubject = '', initialReviewRating = 0, initialReviewComment = '',
  isAdmin, initialIsPublic, initialShowMainImage
}: EditPostFormProps) {
  const [content, setContent] = useState(initialContent)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [reviewSubject, setReviewSubject] = useState(initialReviewSubject)
  const [reviewComment, setReviewComment] = useState(initialReviewComment)
  const [showMainImage, setShowMainImage] = useState(initialShowMainImage)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isSubmittingRef = useRef(false)
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // [신규] 대표 이미지 크롭 관련 상태
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  // 1. [신규] 페이지 이탈 방지 경고 및 로컬 백업
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittingRef.current || isSubmitting) return; // 제출 중에는 경고창을 띄우지 않음
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 2. [신규] 로컬 스토리지 자동 백업 (정전/새로고침 대비)
  useEffect(() => {
    const backupData = {
      title: initialTitle, content, category: initialCategory, imageUrl, 
      reviewSubject, reviewComment, showMainImage, lastUpdated: new Date().getTime()
    };
    localStorage.setItem(`edit_backup_${postId}`, JSON.stringify(backupData));
  }, [content, reviewSubject, reviewComment, showMainImage, imageUrl]);

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
        // 크롭 완료된 데이터라면 압축 진행
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
    formData.set('reviewSubject', reviewSubject)
    formData.set('reviewComment', reviewComment)
    formData.set('showMainImage', showMainImage ? 'on' : 'off')
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    startTransition(async () => {
      const result = await updatePost(postId, formData)
      router.push(result.redirectTo)
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
        isFeature: initialCategory === 'feature', // 기획전 여부 유지
        showMainImage,
        reviewSubject,
        reviewComment
      });
      if (result.success) {
        alert("수정 중인 내용이 내 보관함(임시저장)에 안전하게 저장되었습니다.");
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

      <div className={styles.reviewEditorBox}>
        <h3 className={styles.sectionTitle}>리뷰 아카이브 설정</h3>
        
        <div className={styles.inputGroup}>
          <label htmlFor="reviewSubject">리뷰 대상 (작품 제목)</label>
          <div className={styles.autocompleteWrapper}>
            <input 
              type="text" 
              id="reviewSubject" 
              name="reviewSubject" 
              value={reviewSubject}
              placeholder="예: 듄, 오펜하이머, 노인과 바다 등" 
              className={styles.input}
              autoComplete="off"
              onChange={async (e) => {
                const val = e.target.value
                setReviewSubject(val)
                const suggs = await getUniqueReviewSubjects(val)
                setSuggestions(suggs)
              }}
            />
            {suggestions.length > 0 && (
              <ul className={styles.suggestionsList}>
                {suggestions.map((s, i) => (
                  <li key={i} onClick={() => {
                    setReviewSubject(s)
                    setSuggestions([])
                  }}>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="reviewRating">티끌러 평점 (10점 만점)</label>
          <select 
            id="reviewRating" 
            name="reviewRating" 
            defaultValue={initialReviewRating} 
            className={styles.input}
          >
            <option value="0">평점 없음</option>
            {[10,9,8,7,6,5,4,3,2,1].map(n => (
              <option key={n} value={n}>{n}점</option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="reviewComment">티끌러 한줄평 (최대 25자)</label>
          <input 
            type="text" 
            id="reviewComment" 
            name="reviewComment" 
            value={reviewComment}
            className={styles.input} 
            placeholder="작품에 대한 짧은 평을 남겨주세요."
            onChange={(e) => {
              const val = e.target.value;
              if (val.length > 25) {
                alert("한줄평은 최대 25자까지 입력 가능합니다.");
                return;
              }
              setReviewComment(val);
            }}
            maxLength={25}
          />
        </div>
      </div>

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
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: '30px', marginTop: '4px' }}>
          체크하면 관리자와 작성자 본인에게만 글이 보이며, 목록에서 숨겨집니다.
        </p>
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
