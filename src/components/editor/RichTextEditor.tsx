"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/utils/image';
import styles from './RichTextEditor.module.css';

// [중요] 최신 버전의 Quill 2.0 및 React 19 호환을 위한 동적 로드 및 모듈 등록
const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import('react-quill-new');
    const { default: ImageResize } = await import('quill-image-resize-module-react');
    
    // Quill 인스턴스에 이미지 리사이즈 모듈 등록
    // react-quill-new는 내부적으로 Quill을 내장하고 있거나 전역 Quill을 사용할 수 있음
    if (typeof window !== 'undefined' && RQ.Quill) {
        RQ.Quill.register('modules/imageResize', ImageResize);
    }

    return function QuillComponent({ forwardedRef, ...props }: any) {
        return <RQ ref={forwardedRef} {...props} />;
    };
}, { ssr: false });

interface RichTextEditorProps {
    content: string;
    onChange: (val: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
    const [isClient, setIsClient] = useState(false);
    const quillRef = useRef<any>(null);
    const supabase = createClient();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const imageHandler = () => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", "image/*");
        input.click();

        input.onchange = async () => {
            const file = input.files ? input.files[0] : null;
            if (!file) return;

            try {
                let uploadBlob: Blob | File = file;
                let fileExt = 'jpg';
                let contentType = 'image/jpeg';

                // GIF 특수 처리: 압축하지 않되 1MB 제한
                if (file.type === 'image/gif') {
                    if (file.size > 1024 * 1024) {
                        alert('GIF 파일은 애니메이션 유지를 위해 압축하지 않으므로, 1MB 이하만 업로드 가능합니다.');
                        return;
                    }
                    uploadBlob = file;
                    fileExt = 'gif';
                    contentType = 'image/gif';
                } else {
                    // 일반 이미지는 기존처럼 압축 진행
                    uploadBlob = await compressImage(file);
                    fileExt = 'jpg';
                    contentType = 'image/jpeg';
                }

                const fileName = `editor/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
                
                const { error } = await supabase.storage
                    .from('post-images')
                    .upload(fileName, uploadBlob, { contentType });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName);

                const quill = quillRef.current?.getEditor();
                const range = quill?.getSelection();
                if (quill && range) {
                    quill.insertEmbed(range.index, "image", publicUrl);
                    quill.setSelection(range.index + 1);
                }
            } catch (err) {
                console.error("Quill image upload failed:", err);
                alert("이미지 업로드에 실패했습니다.");
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                [{ 'font': [] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['blockquote', 'code-block'],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
        imageResize: {
            parchment: null, // Quill 2.0 호환성 관련 설정
            modules: ['Resize', 'DisplaySize', 'Toolbar']
        },
        // [수정] 모바일 엔터 키 이슈 해결을 위한 키보드 바인딩 추가
        keyboard: {
            bindings: {
                enter: {
                    key: 'Enter',
                    handler: function(range: any, context: any) {
                        // 기본 엔터 동작을 허용하되, 모바일에서 명확히 캡처되도록 함
                        return true; 
                    }
                }
            }
        }
    }), []);

    const formats = [
        'header', 'font',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'align',
        'list', 'bullet',
        'blockquote', 'code-block',
        'link', 'image', 'video'
    ];

    if (!isClient) return <div className={styles.loading}>에디터를 불러오는 중입니다...</div>;

    return (
        <div className={styles.editorContainer}>
            <ReactQuill
                forwardedRef={quillRef}
                theme="snow"
                value={content}
                onChange={onChange}
                modules={modules}
                formats={formats}
                className={styles.quillEditor}
            />
            
            <style jsx global>{`
                .ql-editor {
                    min-height: 600px;
                    font-size: 1.1rem;
                    line-height: 1.8;
                    padding: 40px !important;
                    font-family: 'Noto Sans KR', sans-serif;
                }
                @media (max-width: 768px) {
                    .ql-editor {
                        padding: 20px 16px !important;
                        font-size: 1rem;
                    }
                    .ql-toolbar.ql-snow {
                        padding: 8px 12px;
                    }
                }
                .ql-editor h1 { font-size: 2.5rem; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 800; }
                .ql-editor h2 { font-size: 1.8rem; margin-top: 1.2em; margin-bottom: 0.4em; }
                .ql-editor blockquote { 
                    border-left: 5px solid #1a77ce; 
                    background: #f8faff; 
                    padding: 15px 25px; 
                    margin: 20px 0;
                    color: #555;
                    font-style: italic;
                }
                .ql-editor img {
                    border-radius: 12px;
                    margin: 20px auto;
                    display: block;
                    max-width: 100%;
                    cursor: pointer;
                }
                /* 리사이즈 툴바 스타일 개선 */
                .ql-image-resizer {
                    border: 2px solid #1a77ce;
                }
                .ql-toolbar.ql-snow {
                    border: none;
                    border-bottom: 1px solid #eee;
                    padding: 12px 16px;
                    background: #fdfdfd;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .ql-container.ql-snow {
                    border: none;
                }
                .ql-snow .ql-picker.ql-header { width: 100px; }
                .ql-snow .ql-picker.ql-font { width: 120px; }
            `}</style>
        </div>
    );
}
