"use client";

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// 에디터의 CSS는 최상단에서 불러와도 클라이언트 컴포넌트라면 대개 안전하지만, 
// 안전을 위해 여기서만 불러옵니다.
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  content: string;
  onChange: (val: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [EditorInstance, setEditorInstance] = useState<any>(null);
  const [QuillInstance, setQuillInstance] = useState<any>(null);
  const quillRef = useRef<any>(null);
  const supabase = createClient();

  // 1. 브라우저 환경에서만 라이브러리 및 모듈 로드
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initEditor = async () => {
      try {
        // [중요] 모든 라이브러리를 dynamic하게 import
        const { default: RQ, Quill: Q } = await import("react-quill");
        const { default: ImageResize } = await import("quill-image-resize-module-react");

        // 중복 등록 방지
        if (!Q.import("modules/imageResize")) {
          Q.register("modules/imageResize", ImageResize);
        }

        // 폰트 설정
        const Font = Q.import("formats/font");
        Font.whitelist = ["serif", "monospace", "noto-sans", "outfit", "dancing"];
        Q.register(Font, true);

        setQuillInstance(Q);
        setEditorInstance(() => RQ);
      } catch (err) {
        console.error("에디터 로딩 실패:", err);
      }
    };

    initEditor();
  }, []);

  // 2. 이미지 핸들러 (커스텀 업로드)
  const imageHandler = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `editor/${Math.random().toString(36).substring(2, 12)}_${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage.from("post-images").upload(fileName, file);
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(fileName);

        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection();
          if (range) {
            quill.insertEmbed(range.index, "image", publicUrl);
          }
        }
      } catch (err) {
        console.error("이미지 업로드 에러:", err);
        alert("이미지 업로드에 실패했습니다.");
      }
    };
  }, [supabase]);

  // 3. 모듈 설정 (QuillInstance가 준비된 후에 구성)
  const modules = useMemo(() => {
    if (!QuillInstance) return {};

    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          [{ font: ["serif", "monospace", "noto-sans", "outfit", "dancing"] }],
          [{ size: ["small", false, "large", "huge"] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["blockquote", "code-block"],
          ["link", "image", "video"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
      imageResize: {
        parchment: QuillInstance.import("parchment"),
        modules: ["Resize", "DisplaySize", "Toolbar"],
      },
    };
  }, [QuillInstance, imageHandler]);

  // 로딩 상태 UI
  if (!EditorInstance || !QuillInstance) {
    return (
      <div style={{ height: "600px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9f9f9", borderRadius: "12px", border: "1px solid #ddd" }}>
        <span>📝 에디터 구성 요소를 불러오는 중...</span>
      </div>
    );
  }

  // 4. 완성된 에디터 렌더링
  const ReactQuill = EditorInstance;
  return (
    <div className="quill-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        style={{ height: "600px", marginBottom: "80px" }}
      />
      <style jsx global>{`
        .quill-editor-wrapper .ql-container {
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          min-height: 520px;
        }
        .quill-editor-wrapper .ql-toolbar {
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          background: #fdfdfd;
        }
        .ql-editor {
          font-family: inherit;
          font-size: 1.05rem;
          line-height: 1.8;
        }
      `}</style>
    </div>
  );
}
