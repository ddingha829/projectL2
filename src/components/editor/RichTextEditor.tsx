import { useRef } from 'react';
import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
// import '@toast-ui/editor/dist/theme/toastui-editor-dark.css'; // Optional dark mode 
import { createClient } from '@/lib/supabase/client';

export default function RichTextEditor({ content, onChange }: { content: string, onChange: (val: string) => void }) {
  const editorRef = useRef<Editor>(null);
  const supabase = createClient();

  const handleImageHook = async (blob: Blob | File, callback: (url: string, altText: string) => void) => {
    try {
      const file = blob as File;
      const fileExt = file.name ? file.name.split('.').pop() : 'png';
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, blob, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Upload Error Details:', error);
        alert('이미지 업로드에 실패했습니다.');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      callback(publicUrl, 'image');
    } catch (err) {
      console.error('Image hook failed', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: '100%' }}>
      {/* Toast UI Editor doesn't natively hot-reload content well if state changes externally. 
          Using initialValue is the standard correct pattern for it. */}
      <Editor
        ref={editorRef}
        initialValue={content}
        previewStyle="vertical"
        height="600px"
        initialEditType="wysiwyg"
        useCommandShortcut={true}
        hideModeSwitch={false}
        onChange={() => {
          if (editorRef.current) {
             onChange(editorRef.current.getInstance().getHTML());
          }
        }}
        hooks={{
          addImageBlobHook: handleImageHook
        }}
      />
    </div>
  );
}
