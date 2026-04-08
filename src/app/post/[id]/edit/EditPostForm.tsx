"use client"

import { useState, useRef, useTransition } from 'react'
import { updatePost, getUniqueReviewSubjects } from '@/app/actions/postManage'
import styles from '@/app/write/page.module.css'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/utils/image'

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  ssr: false,
  loading: () => <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>에디터 로딩중...</div>
})

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
}

export default function EditPostForm({
  postId, initialTitle, initialContent, initialCategory,
  initialImageUrl, initialIsEditorsPick,
  initialReviewSubject = '', initialReviewRating = 0, initialReviewComment = '',
  isAdmin, initialIsPublic
}: EditPostFormProps) {
  const [content, setContent] = useState(initialContent)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [reviewSubject, setReviewSubject] = useState(initialReviewSubject)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      let uploadBlob: Blob | File = file
      let fileExt = 'jpg'
      let contentType = 'image/jpeg'

      if (file.type === 'image/gif') {
        if (file.size > 1024 * 1024) {
          alert('GIF 파일은 애니메이션 유지를 위해 압축하지 않으므로, 1MB 이하만 업로드 가능합니다.')
          setIsUploading(false)
          return
        }
        uploadBlob = file
        fileExt = 'gif'
        contentType = 'image/gif'
      } else {
        uploadBlob = await compressImage(file)
        fileExt = 'jpg'
        contentType = 'image/jpeg'
      }

      const fileName = `covers/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, uploadBlob, { contentType })

      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName)
      setImageUrl(publicUrl)
    } catch (err) {
      console.error('Edit upload failed:', err)
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('content', content)
    formData.set('imageUrl', imageUrl)
    formData.set('reviewSubject', reviewSubject)
    startTransition(() => updatePost(postId, formData))
  }

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
              <span>📸 클릭하여 이미지 업로드</span>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className={styles.hiddenInput} accept="image/*" />
        </div>
        <input type="hidden" name="imageUrl" value={imageUrl} />
      </div>

      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용</label>
        <RichTextEditor content={content} onChange={setContent} />
        <input type="hidden" name="content" value={content} />
      </div>

      {isAdmin && (
        <div className={styles.checkboxGroup}>
          <input type="checkbox" id="isEditorsPick" name="isEditorsPick" defaultChecked={initialIsEditorsPick} />
          <label htmlFor="isEditorsPick" className={styles.checkboxLabel}>🏆 에디터 추천(Editor's Pick)으로 지정</label>
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
          <label htmlFor="reviewRating">에디터 평점 (10점 만점)</label>
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
          <label htmlFor="reviewComment">에디터 한줄평</label>
          <textarea 
            id="reviewComment" 
            name="reviewComment" 
            defaultValue={initialReviewComment} 
            className={`${styles.input} ${styles.textarea}`} 
            rows={3}
            placeholder="작품에 대한 짧은 평을 남겨주세요."
          />
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-hover)', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="checkbox" 
            id="isPublic" 
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <label htmlFor="isPublic" style={{ fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: isPublic ? '#1a77ce' : '#ea4335' }}>
            {isPublic ? "🌐 모두에게 공개" : "🔒 나만 보기 (비공개)"}
          </label>
          <input type="hidden" name="isPublic" value={isPublic ? 'on' : 'off'} />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: '30px', marginTop: '4px' }}>
          {isPublic ? "모든 방문자가 이 글을 읽을 수 있습니다." : "관리자와 작성자 본인에게만 글이 보입니다."}
        </p>
      </div>

      <button type="submit" className={styles.submitBtn} disabled={isPending || isUploading}>
        {isPending ? '저장 중...' : isUploading ? '이미지 업로드 중...' : '수정 완료'}
      </button>
    </form>
  )
}
