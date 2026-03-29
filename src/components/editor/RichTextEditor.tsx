"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// 에디터의 CSS 임포트를 파일 상단에서 제거하고, 
// 대신 런타임에 삽입하거나 브라우저에서만 로드하도록 합니다.

interface RichTextEditorProps {
  content: string;
  onChange: (val: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [ReactQuill, setReactQuill] = useState<any>(null);
  const quillRef = useRef<any>(null);
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initEditor = async () => {
      try {
        // 스타일 시트를 브라우저에서 동적으로 임포트 (서버 크래시 방지)
        await import("react-quill/dist/quill.snow.css");
        const { default: RQ } = await import("react-quill");
        setReactQuill(() => RQ);
      } catch (err) {
        console.error("에디터 초기화 실패:", err);
      }
    };
    initEditor();
  }, []);

  // 라이브러리 로딩 전 UI
  if (!ReactQuill) {
    return (
      <div style={{ 
        height: '500px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        border: '1px solid #eee', 
        borderRadius: '12px',
        backgroundColor: '#fafafa',
        color: '#666'
      }}>
        에디터 로딩 중...
      </div>
    );
  }

  // 기본 툴바 설정
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image", "video"],
      ["clean"],
    ],
  };

  return (
    <div className="quill-editor-container">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        style={{ height: "500px", marginBottom: "80px" }}
      />
      {/* 런타임 스타일 삽입 (Next.js 15/16 크래시 방지) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .quill-editor-container .ql-container {
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .quill-editor-container .ql-toolbar {
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          background: #fdfdfd;
        }
        .ql-editor { font-family: inherit; font-size: 1.05rem; min-height: 420px; }
      `}} />
    </div>
  );
}
