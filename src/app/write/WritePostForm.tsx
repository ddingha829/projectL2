"use client";

import { useState } from "react";
import { createPost } from "./actions";
import styles from "./page.module.css";
import { useFormStatus } from "react-dom";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/editor/RichTextEditor"), { 
  ssr: false, 
  loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>에디터 로딩중...</div> 
});

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submitBtn} disabled={pending}>
      {pending ? "출간하는 중..." : "출간하기"}
    </button>
  );
}

export default function WritePostForm() {
  const [content, setContent] = useState("<p>리뷰를 작성해 보세요!</p>");

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
        <label htmlFor="imageUrl">대표 이미지 URL (메인 포스터 연동용)</label>
        <input type="url" id="imageUrl" name="imageUrl" required placeholder="https://..." className={styles.input} />
      </div>

      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용</label>
        <RichTextEditor content={content} onChange={setContent} />
        <input type="hidden" name="content" value={content} />
      </div>

      <SubmitButton />
    </form>
  );
}
