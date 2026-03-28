"use client";

import { useState, useRef } from "react";
import { createPost } from "./actions";
import styles from "./page.module.css";
import { useFormStatus } from "react-dom";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const RichTextEditor = dynamic(() => import("@/components/editor/RichTextEditor"), { 
  ssr: false, 
  loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>에디터 로딩중...</div> 
});

function SubmitButton({ isUploading }: { isUploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submitBtn} disabled={pending || isUploading}>
      {pending ? "출간하는 중..." : isUploading ? "이미지 업로드 중..." : "출간하기"}
    </button>
  );
}

export default function WritePostForm() {
  const [content, setContent] = useState("<p>리뷰를 작성해 보세요!</p>");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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
      alert('대표 이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

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
        <label>대표 이미지 (메인 포스터)</label>
        <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
          {mainImageUrl ? (
            <img src={mainImageUrl} alt="Preview" className={styles.previewImage} />
          ) : (
            <div className={styles.uploadPlaceholder}>
              <span>📸 클릭하여 이미지 업로드</span>
              <p>권장 비율 14:20 (매거진 스타일)</p>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleMainImageUpload} 
            className={styles.hiddenInput} 
            accept="image/*"
          />
        </div>
        <input type="hidden" name="imageUrl" value={mainImageUrl} required />
      </div>

      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용</label>
        <RichTextEditor content={content} onChange={setContent} />
        <input type="hidden" name="content" value={content} />
      </div>

      <div className={styles.checkboxGroup}>
        <input type="checkbox" id="isEditorsPick" name="isEditorsPick" />
        <label htmlFor="isEditorsPick" className={styles.checkboxLabel}>🏆 이 게시물을 에디터의 추천(Editor's Pick)으로 지정합니다.</label>
      </div>

      <SubmitButton isUploading={isUploading} />
    </form>
  );
}
