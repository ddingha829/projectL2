"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  content: string;
  onChange: (val: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [ReactQuill, setReactQuill] = useState<any>(null);
  const quillRef = useRef<any>(null);
  const supabase = createClient();

  // 브라우저 환경에서만 최소한의 라이브러리 로드
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initEditor = async () => {
      try {
        const { default: RQ } = await import("react-quill");
        setReactQuill(() => RQ);
      } catch (err) {
        console.error("에디터 본체 로드 실패:", err);
      }
    };
    initEditor();
  }, []);

  // 모듈 설정 (가장 기본만)
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image", "video"],
      ["clean"],
    ],
  };

  if (!ReactQuill) {
    return <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: '12px' }}>에디터를 불러오는 중...</div>;
  }

  return (
    <div className="quill-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        style={{ height: "500px", marginBottom: "50px" }}
      />
      {/* 스타일은 인라인이나 CSS 모듈로 안전하게 처리 */}
      <style>{`
        .quill-editor-wrapper .ql-container {
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .quill-editor-wrapper .ql-toolbar {
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          background: #fafafa;
        }
        .ql-editor { font-size: 1rem; line-height: 1.6; }
      `}</style>
    </div>
  );
}
