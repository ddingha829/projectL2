"use client";

import { useState, useRef, useEffect } from "react";
import { createPost, saveDraft, getDraft, deleteDraft } from "./actions";
import styles from "./page.module.css";
import { useFormStatus } from "react-dom";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { compressImage } from "@/lib/utils/image";

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
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isDraftDeleting, setIsDraftDeleting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const isSubmittingRef = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    setIsClient(true);
    if (searchParams.get('is_feature') === 'true') {
      setIsFeature(true);
    }
    if (error) {
      alert(`저장 중 오류가 발생했습니다: ${error}`);
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittingRef.current || isSubmitting) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const initData = async () => {
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
          return;
        }
      }

      const backup = localStorage.getItem('write_backup');
      if (backup) {
        const data = JSON.parse(backup);
        if (confirm(`비정상적으로 종료된 작성 중인 글이 있습니다. (${new Date(data.lastUpdated).toLocaleString()})\n이 내용을 불러오시겠습니까?`)) {
          setTitle(data.title || "");
          setCategory(data.category || "movie");
          setContent(data.content || "");
          setMainImageUrl(data.mainImageUrl || "");
        } else {
          // 불러오지 않겠다고 하면 삭제 여부를 물어봐서 반복 팝업 방지
          if (confirm("더 이상 이 임시저장 내용을 보관하지 않고 삭제할까요?")) {
            localStorage.removeItem('write_backup');
          }
        }
      }
    };
    initData();

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [searchParams, error, isSubmitting]); 

  useEffect(() => {
    if (!content) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const manualMain = doc.querySelector('img[data-main-image="true"]');
    const firstImg = doc.querySelector('img');
    const extractedUrl = manualMain 
      ? (manualMain as HTMLImageElement).src 
      : (firstImg ? (firstImg as HTMLImageElement).src : "");
    
    if (extractedUrl !== mainImageUrl) {
      setMainImageUrl(extractedUrl);
    }
  }, [content, mainImageUrl]);

  const lastStateRef = useRef({ title, content, category, mainImageUrl, showMainImage });
  useEffect(() => {
    lastStateRef.current = { title, content, category, mainImageUrl, showMainImage };
  }, [title, content, category, mainImageUrl, showMainImage]);

  useEffect(() => {
    const autoSaveTimer = setInterval(() => {
      const { title, content, ...rest } = lastStateRef.current;
      if (!title && !content) return;
      
      const backupData = {
        title, content, ...rest,
        lastUpdated: new Date().getTime()
      };
      localStorage.setItem('write_backup', JSON.stringify(backupData));
    }, 300000); // 5분
    
    return () => clearInterval(autoSaveTimer);
  }, []);

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
      showMainImage
    });
    
    if (result.success) {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } else {
      alert(`임시저장 실패: ${result.error}`);
    }
    setIsDraftSaving(false);
  };

  const handleDeleteDraft = async () => {
    if (!confirm("저장된 모든 임시저장 기록(DB 및 로컬 백업)을 삭제하시겠습니까? \n이 작업은 취소할 수 없습니다.")) return;
    
    setIsDraftDeleting(true);
    try {
      const result = await deleteDraft();
      localStorage.removeItem('write_backup');
      
      if (result.success) {
        alert("임시저장 기록이 모두 삭제되었습니다.");
        setTitle("");
        setContent("");
        setMainImageUrl("");
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

  const uploadMainImage = async (uploadBlob: Blob | File, isOriginal = false) => {
    setIsUploading(true);
    setShowCropModal(false);
    try {
      let finalBlob = uploadBlob;
      let fileExt = isOriginal ? (originalFile?.name.split('.').pop() || 'jpg') : 'jpg';
      let contentType = isOriginal ? (originalFile?.type || 'image/jpeg') : 'image/jpeg';

      if (!isOriginal) {
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
    if (content.length > 800000) {
      if (!confirm("글의 용량이 너무 큼니다. 본문에 이미지를 직접 붙여넣기(Paste) 하셨나요? \n\n이대로 진행하면 업로드에 실패할 수 있습니다. 이미지를 삭제하고 '이미지 업로드' 버튼을 통해 다시 올려주시는 것을 권장합니다. \n\n그래도 진행할까요?")) {
        return;
      }
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const result = await createPost(formData);
    if (result?.error) {
      alert(result.error);
      setIsSubmitting(false);
    } else if (result?.success) {
      localStorage.removeItem('write_backup');
      window.location.href = `/post/${result.targetId}`;
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

      {mainImageUrl && (
        <div className={styles.inputGroup}>
          <label className={styles.label}>대표 이미지</label>
          <div className={styles.autoMainImagePreview}>
            <img src={mainImageUrl} alt="Main Preview" className={styles.previewImage} />
          </div>
          <input type="hidden" name="imageUrl" value={mainImageUrl} />
        </div>
      )}

      <div className={`${styles.inputGroup} ${styles.editorGroup}`}>
        <label>내용</label>
        <RichTextEditor 
          content={content} 
          onChange={setContent} 
          placeholder="리뷰를 작성해 보세요!"
        />
        <textarea name="content" value={content} style={{ display: 'none' }} readOnly />
      </div>

      <div className={styles.optionsSection}>
        <div className={styles.optionsGrid}>
          {role === 'admin' && (
            <div className={styles.checkboxGroup}>
              <input 
                type="checkbox" 
                id="isEditorsPick" 
                name="isEditorsPick"
                checked={isEditorsPick}
                onChange={(e) => setIsEditorsPick(e.target.checked)}
              />
              <label htmlFor="isEditorsPick" className={styles.checkboxLabel}>🏆 티끌러 추천</label>
            </div>
          )}

          {role === 'admin' && (
            <div className={styles.checkboxGroup}>
              <input 
                type="checkbox" 
                id="isFeature" 
                name="isFeature"
                checked={isFeature}
                onChange={(e) => setIsFeature(e.target.checked)}
              />
              <label htmlFor="isFeature" className={styles.checkboxLabel}>✨ 기획전 등록</label>
            </div>
          )}

          <div className={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="isPrivateCheck" 
              name="isPrivate"
              checked={!isPublic}
              onChange={(e) => setIsPublic(!e.target.checked)}
            />
            <label htmlFor="isPrivateCheck" className={styles.checkboxLabel}>🔒 비공개 설정</label>
          </div>
        </div>
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

      <div className={`${styles.draftToast} ${draftSaved ? styles.draftToastVisible : ''}`}>
        ✅ 임시저장이 완료되었습니다
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
