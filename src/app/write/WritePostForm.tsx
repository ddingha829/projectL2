"use client";

import { useState, useRef, useEffect } from "react";
import { createPost } from "./actions";
import styles from "./page.module.css";
import { useFormStatus } from "react-dom";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { compressImage } from "@/lib/utils/image";

// [중요] 수리된 에디터 컴포넌트를 다시 불러옴
const RichTextEditor = dynamic(() => import("@/components/editor/RichTextEditor"), { 
  ssr: false, 
  loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-hover)', borderRadius: '12px' }}>글쓰기 에디터 로딩중...</div> 
});

function SubmitButton({ isUploading }: { isUploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submitBtn} disabled={pending || isUploading}>
      {pending ? "출간하는 중..." : isUploading ? "이미지 업로드 중..." : "출간하기"}
    </button>
  );
}

export default function WritePostForm({ role }: { role: string }) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [content, setContent] = useState("<p>리뷰를 작성해 보세요!</p>");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setIsClient(true);
    if (error) {
      alert(`저장 중 오류가 발생했습니다: ${error}`);
    }
  }, [error]);

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let uploadBlob: Blob | File = file;
      let fileExt = 'jpg';
      let contentType = 'image/jpeg';

      // GIF 특수 처리: 압축하지 않되 1MB 제한
      if (file.type === 'image/gif') {
        if (file.size > 1024 * 1024) {
          alert('GIF 파일은 애니메이션 유지를 위해 압축하지 않으므로, 1MB 이하만 업로드 가능합니다.');
          setIsUploading(false);
          return;
        }
        uploadBlob = file;
        fileExt = 'gif';
        contentType = 'image/gif';
      } else {
        // 일반 이미지는 기존처럼 압축 진행
        uploadBlob = await compressImage(file);
        fileExt = 'jpg';
        contentType = 'image/jpeg';
      }

      const fileName = `covers/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, uploadBlob, { contentType });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      setMainImageUrl(publicUrl);
    } catch (err) {
      console.error('Cover upload failed:', err);
      alert('대표 이미지 업로드 실패');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isClient) return <div className={styles.formContainer}>잠시만 기다려 주세요...</div>;

  return (
    <form action={createPost} className={styles.formContainer}>
      <div className={styles.inputGroup}>
        <label htmlFor="category">카테고리</label>
        <select 
          id="category" 
          name="category" 
          required 
          className={styles.input}
          defaultValue={searchParams.get('category') || 'movie'}
        >
          <option value="movie">영화 (Movie)</option>
          <option value="book">책 (Book)</option>
          <option value="game">게임 (Game)</option>
          <option value="restaurant">맛집 (Restaurant)</option>
          <option value="travel">여행 (Travel)</option>
          <option value="exhibition">전시회 (Exhibition)</option>
          <option value="other">기타 (Other)</option>
          {role === 'admin' && (
            <option value="notice">📢 공지사항 (Notice)</option>
          )}
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
              <p>권장 비율 4:5 (인스타 스타일)</p>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleMainImageUpload} className={styles.hiddenInput} accept="image/*" />
        </div>
        {/* 브라우저의 'required' 밸리데이션이 hidden input에서 오작동할 수 있어 속성 제거 */}
        <input type="hidden" name="imageUrl" value={mainImageUrl} />
      </div>

      {/* 수리된 에디터 컴포넌트 복구 */}
      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용</label>
        <RichTextEditor content={content} onChange={setContent} />
        <input type="hidden" name="content" value={content} />
      </div>

      {role === 'admin' && (
        <div className={styles.checkboxGroup}>
          <input type="checkbox" id="isEditorsPick" name="isEditorsPick" />
          <label htmlFor="isEditorsPick" className={styles.checkboxLabel}>🏆 이 게시물을 에디터 추천으로 지정합니다.</label>
        </div>
      )}

      <SubmitButton isUploading={isUploading} />
    </form>
  );
}
