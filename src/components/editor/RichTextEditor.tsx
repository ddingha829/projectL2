import { useEffect, useRef, useState, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { createClient } from '@/lib/supabase/client';
import './quill-override.css'; // Global override for dark/light mode

export default function RichTextEditor({ content, onChange }: { content: string, onChange: (val: string) => void }) {
  const [value, setValue] = useState(content);
  const quillRef = useRef<ReactQuill>(null);
  const supabase = createClient();

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];

      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);

      if (error) {
        alert("이미지 업로드 실패!");
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      // Insert image manually
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const range = editor.getSelection();
        editor.insertEmbed(range ? range.index : 0, 'image', publicUrl);
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  return (
    <div className="quill-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px', flexGrow: 1 }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={setValue}
        modules={modules}
      />
    </div>
  );
}
