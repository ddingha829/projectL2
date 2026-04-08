"use client";

import { useState, useRef, useEffect } from "react";
import { createPost, saveDraft, getDraft, getUniqueReviewSubjects } from "./actions";
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

function SubmitButton({ isUploading, isDraftSaving }: { isUploading: boolean, isDraftSaving: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className={styles.submitGroup}>
      <button type="submit" className={styles.submitBtn} disabled={pending || isUploading || isDraftSaving}>
        {pending ? "출간하는 중..." : isUploading ? "이미지 업로드 중..." : "출간하기"}
      </button>
    </div>
  );
}

export default function WritePostForm({ role }: { role: string }) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("movie");
  const [content, setContent] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [isEditorsPick, setIsEditorsPick] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [isFeature, setIsFeature] = useState(false);
  const [showMainImage, setShowMainImage] = useState(true);
  
  // [신규] 한줄평 상태
  const [showReview, setShowReview] = useState(false);
  const [reviewSubject, setReviewSubject] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setIsClient(true);
    if (searchParams.get('is_feature') === 'true') {
      setIsFeature(true);
    }
    if (error) {
      alert(`저장 중 오류가 발생했습니다: ${error}`);
    }

    // 임시저장 데이터 불러오기
    const loadDraft = async () => {
      const draft = await getDraft();
      if (draft) {
        if (confirm("작성 중이던 임시저장 글이 있습니다. 불러오시겠습니까?")) {
          setTitle(draft.title || "");
          setCategory(draft.category || "movie");
          setContent(draft.content || "");
          setMainImageUrl(draft.image_url || "");
          setIsEditorsPick(draft.is_editors_pick || false);
          setIsPublic(draft.is_public !== false);
          setIsFeature(draft.is_feature || false);
          setShowMainImage(draft.show_main_image !== false);
          
          if (draft.review_subject) {
            setReviewSubject(draft.review_subject);
            setReviewRating(draft.review_rating || 0);
            setReviewComment(draft.review_comment || "");
            setShowReview(true);
          }
        }
      }
    };
    loadDraft();
  }, [error]);

  const handleSaveDraft = async () => {
    setIsDraftSaving(true);
    const result = await saveDraft({
      title,
      content,
      category,
      imageUrl: mainImageUrl,
      isEditorsPick,
      isPublic,
      isFeature,
      showMainImage,
      reviewSubject,
      reviewRating,
      reviewComment
    });
    
    if (result.success) {
      alert("임시저장이 완료되었습니다.");
    } else {
      alert(`임시저장 실패: ${result.error}`);
    }
    setIsDraftSaving(false);
  };

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
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="movie">영화 (Movie)</option>
          <option value="book">책 (Book)</option>
          <option value="game">게임 (Game)</option>
          <option value="restaurant">맛집 (Restaurant)</option>
          <option value="travel">여행 (Travel)</option>
          <option value="exhibition">전시회 (Exhibition)</option>
          <option value="other">기타 (Other)</option>
          {role === 'admin' && (
            <>
              <option value="notice">📢 공지사항 (Notice)</option>
              <option value="feature">✨ 기획전 (Feature)</option>
            </>
          )}
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="title">제목</label>
        <input 
          type="text" 
          id="title" 
          name="title" 
          required 
          placeholder="글 제목을 입력하세요" 
          className={styles.input} 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
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
        <input type="hidden" name="imageUrl" value={mainImageUrl} />
        
        <div className={styles.checkboxGroup} style={{ marginTop: '10px' }}>
          <input 
            type="checkbox" 
            id="showMainImage" 
            name="showMainImage" 
            checked={showMainImage}
            onChange={(e) => setShowMainImage(e.target.checked)}
          />
          <label htmlFor="showMainImage" className={styles.checkboxLabel}>🖼️ 본문에 대표 이미지 포함하기 (배너 이미지를 본문 상단에도 노출합니다)</label>
        </div>
      </div>

      {/* 수리된 에디터 컴포넌트 복구 */}
      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용</label>
        <RichTextEditor 
          content={content} 
          onChange={setContent} 
          placeholder="리뷰를 작성해 보세요!"
        />
        <input type="hidden" name="content" value={content} />
      </div>

      {/* [신규] 한줄 평 추가 섹션 */}
      <div className={styles.checkboxGroup}>
        <input 
          type="checkbox" 
          id="showReview" 
          checked={showReview}
          onChange={(e) => setShowReview(e.target.checked)}
        />
        <label htmlFor="showReview" className={styles.checkboxLabel}>📝 한줄 평 추가하기</label>
      </div>

      {showReview && (
        <div className={styles.reviewEditorBox}>
          <div className={styles.inputGroup}>
            <label>평가 항목 (예: 영화 제목, 제품명)</label>
            <div className={styles.autocompleteWrapper}>
              <input 
                type="text" 
                name="reviewSubject"
                className={styles.input}
                placeholder="평가할 대상을 입력하세요"
                value={reviewSubject}
                onChange={async (e) => {
                  setReviewSubject(e.target.value);
                  const suggs = await getUniqueReviewSubjects(e.target.value);
                  setSuggestions(suggs);
                }}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <ul className={styles.suggestionsList}>
                  {suggestions.map((s, i) => (
                    <li key={i} onClick={() => {
                      setReviewSubject(s);
                      setSuggestions([]);
                    }}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>별점 ({reviewRating} / 10)</label>
            <div className={styles.starRatingRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <span 
                  key={star} 
                  className={`${styles.star} ${reviewRating >= star ? styles.starActive : ''}`}
                  onClick={() => setReviewRating(star)}
                >
                  ★
                </span>
              ))}
              <input type="hidden" name="reviewRating" value={reviewRating} />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>한줄평 (최대 25자)</label>
            <input 
              type="text" 
              name="reviewComment"
              className={styles.input}
              placeholder="한줄평을 입력하세요"
              value={reviewComment}
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
      )}

      {role === 'admin' && (
        <div className={styles.checkboxGroup}>
          <input 
            type="checkbox" 
            id="isEditorsPick" 
            name="isEditorsPick" 
            checked={isEditorsPick}
            onChange={(e) => setIsEditorsPick(e.target.checked)}
          />
          <label htmlFor="isEditorsPick" className={styles.checkboxLabel}>🏆 이 게시물을 에디터 추천으로 지정합니다.</label>
        </div>
      )}

      {role === 'admin' && (
        <div className={styles.checkboxGroup} style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <input 
            type="checkbox" 
            id="isFeature" 
            name="isFeature" 
            checked={isFeature}
            onChange={(e) => setIsFeature(e.target.checked)}
          />
          <label htmlFor="isFeature" className={styles.checkboxLabel}>✨ 이 게시물을 **기획전(Feature)** 섹션에 등록합니다.</label>
        </div>
      )}

      <div className={styles.checkboxGroup} style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-hover)', borderRadius: '12px' }}>
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

      <div className={styles.actionsFooter}>
        <button 
          type="button" 
          className={styles.draftBtn} 
          onClick={handleSaveDraft}
          disabled={isUploading || isDraftSaving}
        >
          {isDraftSaving ? "임시저장 중..." : "임시저장"}
        </button>
        <SubmitButton isUploading={isUploading} isDraftSaving={isDraftSaving} />
      </div>
    </form>
  );
}

