import { useMemo, useRef, useCallback } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageResize from 'quill-image-resize-module-react';
import { createClient } from '@/lib/supabase/client';

// Register modules
Quill.register('modules/imageResize', ImageResize);

// Add custom font whitelist if needed
const Font = Quill.import('formats/font');
Font.whitelist = ['serif', 'monospace', 'noto-sans', 'outfit', 'dancing'];
Quill.register(Font, true);

interface RichTextEditorProps {
  content: string;
  onChange: (val: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const supabase = createClient();

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
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        
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

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        [{ 'font': Font.whitelist }],
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
  }), [imageHandler]);

  return (
    <div className="quill-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={onChange}
        modules={modules}
        style={{ height: '600px', marginBottom: '50px' }}
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
        }
        .ql-editor img {
           max-width: 100%;
           height: auto;
        }
      `}</style>
    </div>
  );
}
