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
import Youtube from '@tiptap/extension-youtube';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
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
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true, allowBase64: true }),
      Youtube.configure({ width: 840, height: 480 }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
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

  const addYoutube = useCallback(() => {
    const url = prompt('유튜브 URL을 입력하세요:');
    if (url && editor) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  if (!isClient || !editor) {
    return <div className={styles.loading}>에디터를 불러오는 중입니다...</div>;
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar}>
        {/* 그룹 1: 폰트 & 서식 */}
        <select 
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className={styles.fontSelect}
          value={editor.getAttributes('textStyle').fontFamily || ''}
        >
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? styles.active : ''}><b>B</b></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? styles.active : ''}><u>U</u></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#ffec3d' }).run()} className={editor.isActive('highlight') ? styles.active : ''}>🖍️</button>
        <input type="color" onInput={(e: any) => editor.chain().focus().setColor(e.target.value).run()} className={styles.colorPicker} />

        <div className={styles.divider} />

        {/* 그룹 2: 정렬 & 섹션 */}
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? styles.active : ''}>⬅️</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? styles.active : ''}>↔️</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? styles.active : ''}>❝ 인용</button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>➖ 구분선</button>

        <div className={styles.divider} />

        {/* 그룹 3: 미디어 삽입 */}
        <button type="button" onClick={addImage}>🖼️ 이미지</button>
        <button type="button" onClick={addYoutube}>📺 영상</button>

        <div className={styles.divider} />

        {/* 그룹 4: 표 관리 */}
        <div className={styles.tableGroup}>
          <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 삽입">📅 표</button>
          {editor.isActive('table') && (
            <div className={styles.tableControls}>
              <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} title="열 추가">➕列</button>
              <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} title="행 추가">➕行</button>
              <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제">❌</button>
            </div>
          )}
        </div>
      </div>

      <EditorContent editor={editor} className={styles.content} />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Outfit:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap');

        .ProseMirror {
          padding: 40px; min-height: 600px; outline: none; background: #fff;
          font-family: 'Noto Sans KR', sans-serif; font-size: 1.1rem; line-height: 1.9; color: #222;
        }

        /* 표 스타일 (매거진 스타일) */
        .ProseMirror table {
          border-collapse: collapse; margin: 2rem 0; width: 100%; table-layout: fixed;
          border-radius: 8px; overflow: hidden; border: 1px solid #eee;
        }
        .ProseMirror td, .ProseMirror th {
          border: 1px solid #eee; padding: 12px 15px; position: relative; text-align: left; vertical-align: middle;
        }
        .ProseMirror th { background: #f9fafb; font-weight: 700; color: #111; }
        .ProseMirror .selectedCell:after { background: rgba(200, 200, 255, 0.4); content: ""; left: 0; right: 0; top: 0; bottom: 0; pointer-events: none; position: absolute; z-index: 2; }

        /* 유튜브 임베드 */
        .ProseMirror iframe { border-radius: 12px; margin: 2rem auto; display: block; max-width: 100%; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }

        .ProseMirror h1 { font-size: 2.6rem; font-weight: 700; margin: 1.5em 0 0.8em; line-height: 1.25; color: #111; }
        .ProseMirror h2 { font-size: 1.8rem; font-weight: 700; margin: 1.2em 0 0.6em; line-height: 1.35; color: #333; }
        .ProseMirror blockquote { border-left: 5px solid var(--primary); padding-left: 25px; color: #444; font-style: italic; font-size: 1.25rem; margin: 40px 0; background: #fdfdff; padding-top: 10px; padding-bottom: 10px; }
        .ProseMirror hr { border: none; border-top: 2px solid #eee; margin: 50px auto; width: 80%; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 12px; margin: 3rem auto; display: block; filter: saturate(1.1); }
      `}</style>
    </div>
  );
}
