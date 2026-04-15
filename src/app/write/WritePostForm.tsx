"use client";

import { useState, useRef, useEffect } from "react";
import { createPost, saveDraft, getDraft, getUniqueReviewSubjects, deleteDraft } from "./actions";
import styles from "./page.module.css";
import { useFormStatus } from "react-dom";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { compressImage } from "@/lib/utils/image";

// [중요] 수리된 티끌러 컴포넌트를 다시 불러옴
const RichTextEditor = dynamic(() => import("@/components/editor/RichTextEditor"), { 
  ssr: false, 
  loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-hover)', borderRadius: '12px' }}>글쓰기 티끌러 로딩중...</div> 
});
import ImageCropModal from "@/components/editor/ImageCropModal";

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
  const [isDraftDeleting, setIsDraftDeleting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // [신규] 대표 이미지 크롭 관련 상태
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);

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

    // 탭 전환/새로고침 시 데이터 날림 방지
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) return; // 제출 중에는 경고창을 띄우지 않음
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // [초기 로드] 임시저장 데이터 및 로컬 백업 불러오기
    const initData = async () => {
      // 1. DB 임시저장 확인
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
          return; // DB 불러왔으면 로컬은 패스
        }
      }

      // 2. DB 없으면 로컬 백업 확인
      const backup = localStorage.getItem('write_backup');
      if (backup) {
        const data = JSON.parse(backup);
        if (confirm(`비정상적으로 종료된 작성 중인 글이 있습니다. (${new Date(data.lastUpdated).toLocaleString()})\n이 내용을 불러오시겠습니까?`)) {
          setTitle(data.title || "");
          setCategory(data.category || "movie");
          setContent(data.content || "");
          setMainImageUrl(data.mainImageUrl || "");
          setReviewSubject(data.reviewSubject || "");
          setReviewComment(data.reviewComment || "");
          if (data.reviewSubject) setShowReview(true);
        }
      }
    };
    initData();

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [searchParams, error]); 

  // 실시간 로컬 스토리지 백업
  useEffect(() => {
    if (!title && !content) return; 
    const backupData = {
      title, content, category, mainImageUrl, 
      reviewSubject, reviewComment, showMainImage, lastUpdated: new Date().getTime()
    };
    localStorage.setItem('write_backup', JSON.stringify(backupData));
  }, [title, content, category, mainImageUrl, reviewSubject, reviewComment, showMainImage]);

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

  const handleDeleteDraft = async () => {
    if (!confirm("저장된 모든 임시저장 기록(DB 및 로컬 백업)을 삭제하시겠습니까? \n이 작업은 취소할 수 없습니다.")) return;
    
    setIsDraftDeleting(true);
    try {
      // 1. DB 삭제
      const result = await deleteDraft();
      
      // 2. 로컬 삭제
      localStorage.removeItem('write_backup');
      
      if (result.success) {
        alert("임시저장 기록이 모두 삭제되었습니다.");
        // 3. 폼 초기화 (선택 사항이지만 유저 경험을 위해 권장)
        setTitle("");
        setContent("");
        setMainImageUrl("");
        setReviewSubject("");
        setReviewComment("");
        setReviewRating(0);
        setShowReview(false);
      } else {
        alert(`DB 삭제 중 오류 발생: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("삭제 중 예기치 못한 오류가 발생했습니다.");
    } finally {
      setIsDraftDeleting(false);
    }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const uploadMainImage = async (uploadBlob: Blob | File, isOriginal = false) => {
    setIsUploading(true);
    setShowCropModal(false);
    try {
      let finalBlob = uploadBlob;
      let fileExt = isOriginal ? (originalFile?.name.split('.').pop() || 'jpg') : 'jpg';
      let contentType = isOriginal ? (originalFile?.type || 'image/jpeg') : 'image/jpeg';

      if (!isOriginal) {
        // 크롭 완료된 데이터라면 압축 진행 (GIF는 알아서 패스됨)
        finalBlob = await compressImage(new File([uploadBlob], "main.jpg", { type: "image/jpeg" }));
      }

      const fileName = `covers/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, finalBlob, { contentType });

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
      setOriginalFile(null);
    }
  };

  const handleFormSubmit = async (formData: FormData) => {
    // 약 1MB 이상의 텍스트(Base64 이미지 포함 가능성)가 포함된 경우 경고
    if (content.length > 800000) {
      if (!confirm("글의 용량이 너무 큼니다. 본문에 이미지를 직접 붙여넣기(Paste) 하셨나요? \n\n이대로 진행하면 업로드에 실패할 수 있습니다. 이미지를 삭제하고 '이미지 업로드' 버튼을 통해 다시 올려주시는 것을 권장합니다. \n\n그래도 진행할까요?")) {
        return;
      }
    }
    setIsSubmitting(true);
    const result = await createPost(formData);
    if (result?.error) {
      alert(result.error);
      setIsSubmitting(false);
    } else {
      // Clear backup on success (redirect handles navigation)
      localStorage.removeItem('write_backup');
    }
  };

  if (!isClient) return <div className={styles.formContainer}>잠시만 기다려 주세요...</div>;

  return (
    <form action={handleFormSubmit} className={styles.formContainer}>
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
          {role === 'admin' && <option value="feature">✨ 기획전 (Feature)</option>}
          {role === 'admin' && <option value="notice">📢 공지사항 (Notice)</option>}
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
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>클릭하여 이미지 업로드</span>
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
          <label htmlFor="showMainImage" className={styles.checkboxLabel} style={{ fontSize: '0.85rem' }}>본문에 대표 이미지 포함하기 (배너 이미지를 본문 상단에도 노출합니다)</label>
        </div>
      </div>

      {/* 수리된 티끌러 컴포넌트 복구 */}
      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용</label>
        <RichTextEditor 
          content={content} 
          onChange={setContent} 
          placeholder="리뷰를 작성해 보세요!"
        />
        <textarea name="content" value={content} style={{ display: 'none' }} readOnly />
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
          <label htmlFor="isEditorsPick" className={styles.checkboxLabel}>🏆 이 게시물을 티끌러 추천으로 지정합니다.</label>
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

      <div className={styles.actionsFooter}>
        <div className={styles.draftActionsGroup}>
          <button 
            type="button" 
            className={styles.draftBtn} 
            onClick={handleSaveDraft}
            disabled={isUploading || isDraftSaving || isDraftDeleting}
          >
            {isDraftSaving ? "저장 중..." : "임시저장"}
          </button>
          <button 
            type="button" 
            className={styles.draftDeleteBtn} 
            onClick={handleDeleteDraft}
            disabled={isUploading || isDraftSaving || isDraftDeleting}
          >
            {isDraftDeleting ? "삭제 중..." : "기록 삭제"}
          </button>
        </div>
        <SubmitButton isUploading={isUploading} isDraftSaving={isDraftSaving} />
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
  );
}

