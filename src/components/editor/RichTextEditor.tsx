"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  content: string;
  onChange: (val: string) => void;
}

const FONTS = [
  { label: '기본 (Sans)', value: 'sans-serif' },
  { label: '세리프 (Serif)', value: 'serif' },
  { label: '모노체 (Mono)', value: 'monospace' },
  { label: 'Outfit (영어 추천)', value: 'Outfit' },
  { label: 'Dancing Script', value: 'Dancing Script' },
  { label: 'Noto Sans KR', value: 'Noto Sans KR' },
];

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      Color,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
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
        const fileName = `editor/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
        
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
        alert('이미지 업로드 실패');
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
        {/* 폰트 선택 드롭다운 */}
        <select 
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className={styles.fontSelect}
          value={editor.getAttributes('textStyle').fontFamily || ''}
        >
          <option value="">글꼴 선택</option>
          {FONTS.map(font => (
            <option key={font.value} value={font.value}>{font.label}</option>
          ))}
        </select>

        <div className={styles.divider} />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? styles.active : ''}
          title="Bold (Ctrl+B)"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? styles.active : ''}
          title="Italic (Ctrl+I)"
        >
          <i>I</i>
        </button>
        
        <div className={styles.divider} />

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

        <div className={styles.divider} />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? styles.active : ''}
        >
          • List
        </button>
        <button type="button" onClick={addImage} title="Add Image">
          🖼️ Image
        </button>
      </div>

      <EditorContent editor={editor} className={styles.content} />

      {/* Tiptap 전용 스타일 가이드 */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Outfit:wght@300;400;700&family=Noto+Sans+KR:wght@300;400;700&display=swap');

        .ProseMirror {
          padding: 30px;
          min-height: 550px;
          background: #fff;
          outline: none;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 1.1rem;
          line-height: 1.8;
          color: #222;
        }
        .ProseMirror p { margin-bottom: 1.2em; }
        .ProseMirror h1 { font-size: 2.4rem; font-weight: 700; margin-bottom: 0.8em; line-height: 1.3; }
        .ProseMirror h2 { font-size: 1.8rem; font-weight: 600; margin-bottom: 0.6em; line-height: 1.4; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 12px; transition: transform 0.2s; cursor: pointer; display: block; margin: 2rem auto; }
        .ProseMirror img:hover { transform: scale(1.01); }
        .ProseMirror blockquote { border-left: 4px solid var(--primary); padding-left: 20px; color: #666; font-style: italic; margin: 20px 0; }
        
        /* 선택된 폰트 적용을 위한 스타일 */
        .ProseMirror [style*="font-family: Dancing Script"] { font-family: 'Dancing Script', cursive !important; }
        .ProseMirror [style*="font-family: Outfit"] { font-family: 'Outfit', sans-serif !important; }
        .ProseMirror [style*="font-family: serif"] { font-family: serif !important; }
        .ProseMirror [style*="font-family: monospace"] { font-family: monospace !important; }
      `}</style>
    </div>
  );
}
