"use client"

import { useState, useRef, useTransition } from 'react'
import { updatePost } from '@/app/actions/postManage'
import styles from '@/app/write/page.module.css'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

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
  isAdmin: boolean
}

export default function EditPostForm({
  postId, initialTitle, initialContent, initialCategory,
  initialImageUrl, initialIsEditorsPick, isAdmin
}: EditPostFormProps) {
  const [content, setContent] = useState(initialContent)
  const [imageUrl, setImageUrl] = useState(initialImageUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `covers/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('post-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName)
      setImageUrl(publicUrl)
    } catch {
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

      <button type="submit" className={styles.submitBtn} disabled={isPending || isUploading}>
        {isPending ? '저장 중...' : isUploading ? '이미지 업로드 중...' : '수정 완료'}
      </button>
    </form>
  )
}
