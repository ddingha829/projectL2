"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/utils/image';
import styles from './RichTextEditor.module.css';
import ImageCropModal from './ImageCropModal';

// [중요] 최신 버전의 Quill 2.0 및 React 19 호환을 위한 동적 로드 및 모듈 등록
const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import('react-quill-new');
    const { default: ImageResize } = await import('quill-image-resize-module-react');
    
    // Quill 인스턴스에 이미지 리사이즈 모듈 등록
    if (typeof window !== 'undefined' && RQ.Quill) {
        const BaseImage: any = RQ.Quill.import('formats/image');
        class AppImage extends BaseImage {
            static formats(domNode: any) {
                return BaseImage.formats(domNode);
            }
            format(name: string, value: any) {
                const node = (this as any).domNode;
                if (name === 'align') {
                    if (value) {
                        node.style.display = 'block';
                        if (value === 'center') {
                            node.style.margin = '20px auto';
                        } else if (value === 'right') {
                            node.style.margin = '20px 0 20px auto';
                        } else {
                            node.style.margin = '20px auto 20px 0';
                        }
                    } else {
                        node.style.display = '';
                        node.style.margin = '';
                    }
                } else {
                    super.format(name, value);
                }
            }
        }
        (AppImage as any).blotName = 'image';
        (AppImage as any).tagName = 'IMG';
        
        RQ.Quill.register(AppImage, true);
        RQ.Quill.register('modules/imageResize', ImageResize);
    }

    return function QuillComponent({ forwardedRef, ...props }: any) {
        return <RQ ref={forwardedRef} {...props} />;
    };
}, { ssr: false });

interface RichTextEditorProps {
    content: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
    const [isClient, setIsClient] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string>("");
    const quillRef = useRef<any>(null);
    const lastContentRef = useRef<string>(content); // 루프 방지를 위한 Ref
    const supabase = createClient();

    useEffect(() => {
        setIsClient(true);
    }, []);

    // 외부에서 content가 들어왔을 때 (예: 임시저장 불러오기), 
    // 에디터 내부 값과 다를 경우에만 동기화하여 타이핑 렉 방지
    useEffect(() => {
        if (quillRef.current) {
            const editor = quillRef.current.getEditor();
            if (content !== editor.root.innerHTML && content !== lastContentRef.current) {
                lastContentRef.current = content;
                editor.root.innerHTML = content;
            }
        }
    }, [content]);

    const handleEditorChange = (newContent: string) => {
        lastContentRef.current = newContent;
        onChange(newContent);
    };

    const imageHandler = () => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", "image/*");
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                setCropImageSrc(reader.result as string);
                setShowCropModal(true);
            };
            reader.readAsDataURL(file);
        };
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setShowCropModal(false);
        const quill = quillRef.current?.getEditor();
        let range = quill?.getSelection();
        let currentIndex = range ? range.index : quill.getLength();

        try {
            const compressedFile = await compressImage(new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" }));
            const fileName = `editor/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.jpg`;
            const { error } = await supabase.storage
                .from('post-images')
                .upload(fileName, compressedFile, { contentType: "image/jpeg" });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('post-images')
                .getPublicUrl(fileName);

            if (quill) {
                quill.insertEmbed(currentIndex, "image", publicUrl);
                quill.setSelection(currentIndex + 1);
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('이미지 업로드에 실패했습니다.');
        }
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
            parchment: null,
            modules: ['Resize', 'DisplaySize', 'Toolbar']
        },
        keyboard: {
            bindings: {
                enter: {
                    key: 'Enter',
                    handler: function(range: any, context: any) {
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
                defaultValue={content} // value 대신 defaultValue 사용하여 입력 도중 개입 차단
                onChange={handleEditorChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
                className={styles.quillEditor}
            />

            {showCropModal && (
                <ImageCropModal 
                    image={cropImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setShowCropModal(false)}
                />
            )}
            
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
                    margin-top: 20px;
                    margin-bottom: 20px;
                    max-width: 100%;
                    cursor: pointer;
                    /* 정렬을 위해 고정 center 해제 */
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
                    top: 62px; /* 상단 네비바 높이에 맞춤 */
                    z-index: 1000;
                    border-radius: 12px 12px 0 0;
                }
                @media (max-width: 768px) {
                    .ql-toolbar.ql-snow {
                        top: 54px; /* 모바일 네비바 높이에 맞춤 */
                    }
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
