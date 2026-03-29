"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  content: string;
  onChange: (val: string) => void;
}

const FONTS = [
  { label: 'Sans (기본)', value: 'Noto Sans KR' },
  { label: 'Serif (세리프)', value: 'serif' },
  { label: 'Mono (모노체)', value: 'monospace' },
  { label: 'Outfit (영어 추천)', value: 'Outfit' },
  { label: 'Dancing Script', value: 'Dancing Script' },
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
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
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

  const addImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `editor/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('post-images').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
        if (editor) editor.chain().focus().setImage({ src: publicUrl }).run();
      } catch (err) {
        console.error('Image upload failed:', err);
      }
    };
    input.click();
  }, [editor, supabase]);

  if (!isClient || !editor) {
    return <div className={styles.loading}>에디터를 불러오는 중입니다...</div>;
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar}>
        {/* 1. 폰트 및 스타일 */}
        <select 
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className={styles.fontSelect}
          value={editor.getAttributes('textStyle').fontFamily || ''}
        >
          <option value="">글꼴 선택</option>
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <div className={styles.divider} />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? styles.active : ''}><b>B</b></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? styles.active : ''}><i>I</i></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? styles.active : ''}><u>U</u></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#ffec3d' }).run()} className={editor.isActive('highlight') ? styles.active : ''}>🖍️</button>
        <input 
          type="color" 
          onInput={(e: any) => editor.chain().focus().setColor(e.target.value).run()} 
          className={styles.colorPicker} 
          title="Text Color"
        />

        <div className={styles.divider} />

        {/* 2. 제목 및 섹션 */}
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? styles.active : ''}>H1</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? styles.active : ''}>❝ 인용</button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>➖ 선</button>

        <div className={styles.divider} />

        {/* 3. 정렬 및 목록 */}
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? styles.active : ''}>⬅️</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? styles.active : ''}>↔️</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? styles.active : ''}>➡️</button>
        
        <div className={styles.divider} />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? styles.active : ''}>• List</button>
        <button type="button" onClick={addImage}>🖼️ 이미지</button>
      </div>

      <EditorContent editor={editor} className={styles.content} />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Outfit:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap');

        .ProseMirror {
          padding: 40px;
          min-height: 600px;
          background: #fff;
          outline: none;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 1.1rem;
          line-height: 1.9;
          color: #222;
        }

        /* 매거진 스타일 커스텀 정렬 */
        .ProseMirror p[data-text-align="center"], .ProseMirror h1[data-text-align="center"], .ProseMirror h2[data-text-align="center"] { text-align: center; }
        .ProseMirror p[data-text-align="right"], .ProseMirror h1[data-text-align="right"], .ProseMirror h2[data-text-align="right"] { text-align: right; }

        .ProseMirror h1 { font-size: 2.6rem; font-weight: 700; margin: 1.5em 0 0.8em; line-height: 1.25; color: #111; border-top: 1px solid #eee; padding-top: 20px; }
        .ProseMirror h2 { font-size: 1.8rem; font-weight: 700; margin: 1.2em 0 0.6em; line-height: 1.35; color: #333; }
        .ProseMirror p { margin-bottom: 1.4em; }

        /* 인용구 (매거진 스타일) */
        .ProseMirror blockquote {
          border-left: 5px solid var(--primary);
          padding-left: 25px;
          color: #444;
          font-style: italic;
          font-size: 1.25rem;
          margin: 40px 0;
          line-height: 1.7;
          background: #fdfdff;
          padding-top: 10px;
          padding-bottom: 10px;
        }

        /* 가로 구분선 */
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #eee;
          margin: 50px auto;
          width: 80%;
        }

        .ProseMirror img { max-width: 100%; height: auto; border-radius: 12px; margin: 3rem auto; display: block; filter: saturate(1.1); }
        .ProseMirror mark { background-color: #ffec3d; padding: 0 4px; border-radius: 4px; }
      `}</style>
    </div>
  );
}
