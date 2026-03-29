"use client";

import { useState, useRef, useEffect } from "react";
import { createPost } from "./actions";
import styles from "./page.module.css";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";

function SubmitButton({ isUploading }: { isUploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submitBtn} disabled={pending || isUploading}>
      {pending ? "출간하는 중..." : isUploading ? "이미지 업로드 중..." : "출간하기"}
    </button>
  );
}

export default function WritePostForm({ role }: { role: string }) {
  const [content, setContent] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `covers/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      setMainImageUrl(publicUrl);
    } catch (err) {
      console.error('Cover upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isClient) return <div className={styles.formContainer}>준비 중...</div>;

  return (
    <form action={createPost} className={styles.formContainer}>
      <div className={styles.inputGroup}>
        <label htmlFor="category">카테고리</label>
        <select id="category" name="category" required className={styles.input}>
          <option value="movie">영화 (Movie)</option>
          <option value="book">책 (Book)</option>
          <option value="game">게임 (Game)</option>
          <option value="restaurant">맛집 (Restaurant)</option>
          <option value="other">기타 (Other)</option>
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="title">제목</label>
        <input type="text" id="title" name="title" required placeholder="글 제목을 입력하세요" className={styles.input} />
      </div>

      <div className={styles.inputGroup}>
        <label>대표 이미지</label>
        <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
          {mainImageUrl ? (
            <img src={mainImageUrl} alt="Preview" className={styles.previewImage} />
          ) : (
            <div className={styles.uploadPlaceholder}>📸 클릭하여 업로드</div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleMainImageUpload} className={styles.hiddenInput} accept="image/*" />
        </div>
        <input type="hidden" name="imageUrl" value={mainImageUrl} required />
      </div>

      {/* [테스트용] 에디터 대신 일반 텍스트 입력창 사용 */}
      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용 (에디터 테스트 모드)</label>
        <textarea 
          required
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="리뷰 내용을 입력하세요 (현재 에디터 점검 중입니다)"
          style={{ width: '100%', height: '400px', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', lineHeight: '1.6' }}
        />
      </div>

      {role === 'admin' && (
        <div className={styles.checkboxGroup}>
          <input type="checkbox" id="isEditorsPick" name="isEditorsPick" />
          <label htmlFor="isEditorsPick" className={styles.checkboxLabel}>🏆 에디터 추천 지정</label>
        </div>
      )}

      <SubmitButton isUploading={isUploading} />
    </form>
  );
}
