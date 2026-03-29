"use client";

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import 'react-quill/dist/quill.snow.css';

// 타입 정의
interface RichTextEditorProps {
  content: string;
  onChange: (val: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [ReactQuill, setReactQuill] = useState<any>(null);
  const [Quill, setQuill] = useState<any>(null);
  const quillRef = useRef<any>(null);
  const supabase = createClient();

  // 브라우저에서만 라이브러리 로드 (서버 크래시 방지 핵심)
  useEffect(() => {
    const initQuill = async () => {
      const { default: RQ, Quill: Q } = await import('react-quill');
      const { default: ImageResize } = await import('quill-image-resize-module-react');
      
      // 이미 등록되었는지 확인 후 등록
      if (!Q.imports['modules/imageResize']) {
        Q.register('modules/imageResize', ImageResize);
      }

      const Font = Q.import('formats/font');
      Font.whitelist = ['serif', 'monospace', 'noto-sans', 'outfit', 'dancing'];
      Q.register(Font, true);

      setQuill(Q);
      setReactQuill(() => RQ);
    };
    initQuill();
  }, []);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `post-content/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('post-images')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection();
          if (range) {
            quill.insertEmbed(range.index, 'image', publicUrl);
          }
        }
      } catch (err) {
        console.error('Image upload failed:', err);
        alert('이미지 업로드에 실패했습니다.');
      }
    };
  }, [supabase]);

  const modules = useMemo(() => {
    if (!Quill) return {};
    
    return {
      toolbar: {
        container: [
          [{ 'header': [1, 2, 3, false] }],
          [{ 'font': ['serif', 'monospace', 'noto-sans', 'outfit', 'dancing'] }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['blockquote', 'code-block'],
          ['link', 'image', 'video'],
          ['clean']
        ],
        handlers: {
          image: imageHandler
        }
      },
      imageResize: {
        parchment: Quill.import('parchment'),
        modules: ['Resize', 'DisplaySize', 'Toolbar']
      }
    };
  }, [Quill, imageHandler]);

  // 로딩 중 표시
  if (!ReactQuill || !Quill) {
    return <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-muted)' }}>에디터를 불러오는 중...</div>;
  }

  return (
    <div className="quill-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        style={{ height: '600px', marginBottom: '80px' }}
      />
      <style jsx global>{`
        .quill-editor-wrapper .ql-container {
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          font-family: inherit;
        }
        .quill-editor-wrapper .ql-toolbar {
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          background: #fdfdfd;
        }
        .ql-editor {
          font-size: 1.05rem;
          line-height: 1.8;
          min-height: 500px;
        }
      `}</style>
    </div>
  );
}
