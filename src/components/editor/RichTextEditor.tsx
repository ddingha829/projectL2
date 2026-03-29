"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  content: string;
  onChange: (val: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
      },
    },
  });

  const addImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `post-editor/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('post-images')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        if (editor) {
          editor.chain().focus().setImage({ src: publicUrl }).run();
        }
      } catch (err) {
        console.error('Image upload error:', err);
        alert('이미지 업로드에 실패했습니다.');
      }
    };
    input.click();
  };

  if (!isClient || !editor) {
    return <div className={styles.loading}>에디터를 준비 중입니다...</div>;
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? styles.active : ''}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? styles.active : ''}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? styles.active : ''}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? styles.active : ''}
        >
          • List
        </button>
        <button type="button" onClick={addImage}>
          🖼️ Image
        </button>
      </div>
      <EditorContent editor={editor} className={styles.content} />
      <style jsx global>{`
        .ProseMirror {
          padding: 20px;
          min-height: 500px;
          background: #fff;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          outline: none;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px 0;
          border-radius: 8px;
        }
        .ProseMirror p { margin-bottom: 1em; line-height: 1.7; }
        .ProseMirror h1 { font-size: 2rem; margin-bottom: 0.5em; }
        .ProseMirror h2 { font-size: 1.5rem; margin-bottom: 0.5em; }
      `}</style>
    </div>
  );
}
