"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPost, saveDraft, getDraft, getUniqueReviewSubjects } from "./actions";
import styles from "./page.module.css";
import { useFormStatus } from "react-dom";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
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
  
  const [showReview, setShowReview] = useState(false);
  const [reviewSubject, setReviewSubject] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) return;
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
          
          if (draft.review_subject) {
            setReviewSubject(draft.review_subject);
            setReviewRating(draft.review_rating || 0);
            setReviewComment(draft.review_comment || "");
            setShowReview(true);
          }
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
          setReviewSubject(data.reviewSubject || "");
          setReviewComment(data.reviewComment || "");
          if (data.reviewSubject) setShowReview(true);
        }
      }
    };
    initData();

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [searchParams, isSubmitting, router]); 

  useEffect(() => {
    if (!isClient || isSubmitting) return; 
    const backupData = {
      title, content, category, mainImageUrl, 
      reviewSubject, reviewComment, showMainImage, lastUpdated: new Date().getTime()
    };
    localStorage.setItem('write_backup', JSON.stringify(backupData));
  }, [isClient, isSubmitting, title, content, category, mainImageUrl, reviewSubject, reviewComment, showMainImage]);

  const handleSaveDraft = async () => {
    setIsDraftSaving(true);
    const result = await saveDraft({
      title, content, category, imageUrl: mainImageUrl, isEditorsPick, isPublic, 
      isFeature, showMainImage, reviewSubject, reviewRating, reviewComment
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
      if (!isOriginal) {
        finalBlob = await compressImage(new File([uploadBlob], "main.jpg", { type: "image/jpeg" }));
      }
      const fileExt = (originalFile?.name || 'default.jpg').split('.').pop();
      const fileName = `covers/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage.from('post-images').upload(fileName, finalBlob, { 
        contentType: isOriginal ? originalFile?.type : 'image/jpeg' 
      });

      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
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
      if (!confirm("글의 용량이 너무 큽니다. 본문에 이미지를 직접 붙여넣기 하셨나요? 이대로 진행하면 업로드에 실패할 수 있습니다. 이미지를 삭제하고 '이미지 업로드' 버튼을 통해 다시 올려주시는 것을 권장합니다. 그래도 진행할까요?")) {
        return;
      }
    }
    
    setIsSubmitting(true);
    
    const result = await createPost(formData);

    if (result.success) {
      localStorage.removeItem('write_backup');
      alert("글이 성공적으로 발행되었습니다!");
      router.push('/');
    } else {
      alert(`발행 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`);
      if (result.reauth) {
        router.push('/login');
      }
      setIsSubmitting(false);
    }
  };

  if (!isClient) return <div className={styles.formContainer}>잠시만 기다려 주세요...</div>;

  return (
    <form action={handleFormSubmit} className={styles.formContainer}>
      {/* ... a lot of form elements ... */}
    </form>
  );
}
