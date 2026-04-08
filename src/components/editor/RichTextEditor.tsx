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
        try {
            // 폰트 사이즈 등록
            const Size: any = RQ.Quill.import('attributors/style/size');
            if (Size) {
                Size.whitelist = ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '2.5rem'];
                RQ.Quill.register(Size, true);
            }

            // 폰트 등록
            const Font: any = RQ.Quill.import('formats/font');
            if (Font) {
                Font.whitelist = ['notosans', 'nanummyeongjo', 'nanumgothic', 'inter', 'merriweather'];
                RQ.Quill.register(Font, true);
            }

            // 줄간격(Line Height) 등록 - 클래스 방식이 오버라이드에 유리함
            const Parchment = RQ.Quill.import('parchment');
            const ClassAttributor = (Parchment as any).Attributor?.Class || (Parchment as any).ClassAttributor;
            if (ClassAttributor) {
                const LineHeight = new ClassAttributor('lineheight', 'ql-line-height', {
                    scope: (Parchment as any).Scope?.BLOCK || 3,
                    whitelist: ['1-0', '1-2', '1-4', '1-5', '1-6', '1-8', '2-0', '2-5', '3-0']
                });
                RQ.Quill.register(LineHeight, true);
            }
        } catch (err) {
            console.error('Quill custom formats registration failed:', err);
        }

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
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const quillRef = useRef<any>(null);
    const lastContentRef = useRef<string>(content); // 루프 방지용
    const supabase = createClient();

    useEffect(() => {
        setIsClient(true);
        
        // [중요] 에디터 내의 모든 버튼(리사이즈 툴바 등)이 폼을 제출하지 않도록 강제 설정
        const preventSubmit = () => {
            const editorElement = document.querySelector(`.${styles.editorContainer}`);
            if (editorElement) {
                const buttons = editorElement.querySelectorAll("button");
                buttons.forEach(btn => {
                    if (!btn.getAttribute("type")) {
                        btn.setAttribute("type", "button");
                    }
                });
            }
        };

        const timer = setInterval(preventSubmit, 1000); // 동적으로 생기는 버튼 대응
        return () => clearInterval(timer);
    }, []);

    const handleEditorChange = (newContent: string, delta: any, source: string) => {
        // [보안] 에러 등으로 인해 갑자기 빈 값이 들어올 경우 무시 (데이터 유실 방지)
        if (newContent === '<p><br></p>' || newContent === '' || newContent === '<p></p>') {
            if (lastContentRef.current && lastContentRef.current.length > 30) {
                // 이전에 데이터가 충분히 있었는데 갑자기 비었다면 크래시 가능성 있음 -> 업데이트 무시
                return;
            }
        }

        // 루프 방지: 현재 값과 동일하면 부모 호출 안 함
        if (newContent !== lastContentRef.current) {
            lastContentRef.current = newContent;
            onChange(newContent);
        }
    };

    const imageHandler = () => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", "image/*");
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            setOriginalFile(file); // 원본 파일 보관
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

    const handleUseOriginal = async () => {
        if (!originalFile) return;
        setShowCropModal(false);
        const quill = quillRef.current?.getEditor();
        let range = quill?.getSelection();
        let currentIndex = range ? range.index : quill.getLength();

        try {
            // 원본 그대로 사용 (압축 생략)
            const fileExt = originalFile.name.split('.').pop() || 'jpg';
            const fileName = `editor/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
            const { error } = await supabase.storage
                .from('post-images')
                .upload(fileName, originalFile, { contentType: originalFile.type });

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
            alert('원본 이미지 업로드에 실패했습니다.');
        } finally {
            setOriginalFile(null);
        }
    };


    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                [{ 'font': ['notosans', 'nanummyeongjo', 'nanumgothic', 'inter', 'merriweather'] }],
                [{ 'size': ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '2.5rem'] }],
                [{ 'lineheight': ['1-0', '1-2', '1-4', '1-5', '1-6', '1-8', '2-0', '2-5', '3-0'] }],
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
        'header', 'font', 'size', 'lineheight',
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
                value={content} // 안정적인 제어 방식을 위해 value로 회귀하되 내부 로직으로 루프 차단
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
                    onUseOriginal={handleUseOriginal}
                    onCancel={() => setShowCropModal(false)}
                />
            )}
            
            <style jsx global>{`
                .ql-editor {
                    min-height: 600px;
                    font-size: 1.125rem;
                    line-height: 1.7;
                    padding: 40px !important;
                    font-family: var(--font-noto-sans), sans-serif;
                    color: #333;
                }
                /* 에디터 내 문단 간격 초기화 (실제 게시물과 동일하게) */
                .ql-editor p {
                    margin: 0;
                    padding: 0;
                }
                :global(.ql-snow .ql-picker.ql-size .ql-picker-label::before),
                :global(.ql-snow .ql-picker.ql-size .ql-picker-item::before) {
                    content: attr(data-value) !important;
                }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label::before) { content: 'Line Height'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-0"]::before) { content: '1.0'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-2"]::before) { content: '1.2'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-4"]::before) { content: '1.4'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-5"]::before) { content: '1.5'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-6"]::before) { content: '1.6'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-8"]::before) { content: '1.8'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="2-0"]::before) { content: '2.0'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="2-5"]::before) { content: '2.5'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="3-0"]::before) { content: '3.0'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label::before) { content: 'Line Height'; }
                :global(.ql-snow .ql-picker.ql-font.ql-header .ql-picker-label::before) { content: 'Heading'; }
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans"]::before) { content: '노토산스 (기본)'; font-family: var(--font-noto-sans); }
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="nanummyeongjo"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="nanummyeongjo"]::before) { content: '나눔명조'; font-family: var(--font-nanum-myeongjo); }
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="nanumgothic"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="nanumgothic"]::before) { content: '나눔고딕'; font-family: var(--font-nanum-gothic); }
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="inter"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="inter"]::before) { content: 'Inter (Sans)'; font-family: var(--font-inter); }
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="merriweather"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="merriweather"]::before) { content: 'Merriweather (Serif)'; font-family: var(--font-merriweather); }

                :global(.ql-font-notosans) { font-family: var(--font-noto-sans) !important; }
                :global(.ql-font-nanummyeongjo) { font-family: var(--font-nanum-myeongjo) !important; }
                :global(.ql-font-nanumgothic) { font-family: var(--font-nanum-gothic) !important; }
                :global(.ql-font-inter) { font-family: var(--font-inter) !important; }
                :global(.ql-font-merriweather) { font-family: var(--font-merriweather) !important; }

                :global(.ql-line-height-1-0) { line-height: 1.0 !important; }
                :global(.ql-line-height-1-2) { line-height: 1.2 !important; }
                :global(.ql-line-height-1-4) { line-height: 1.4 !important; }
                :global(.ql-line-height-1-5) { line-height: 1.5 !important; }
                :global(.ql-line-height-1-6) { line-height: 1.6 !important; }
                :global(.ql-line-height-1-8) { line-height: 1.8 !important; }
                :global(.ql-line-height-2-0) { line-height: 2.0 !important; }
                :global(.ql-line-height-2-5) { line-height: 2.5 !important; }
                :global(.ql-line-height-3-0) { line-height: 3.0 !important; }

                @media (max-width: 768px) {
                    .ql-editor {
                        padding: 20px 16px !important;
                        font-size: 1.05rem;
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
                }
                .ql-image-resizer {
                    border: 2px solid #1a77ce;
                }
                .ql-toolbar.ql-snow {
                    border: none;
                    border-bottom: 1px solid #eee;
                    padding: 12px 16px;
                    background: #fdfdfd;
                    position: sticky;
                    top: 62px; 
                    z-index: 1000;
                    border-radius: 12px 12px 0 0;
                }
                @media (max-width: 768px) {
                    .ql-toolbar.ql-snow {
                        top: 54px;
                    }
                }
                .ql-container.ql-snow {
                    border: none;
                }
                .ql-snow .ql-picker.ql-header { width: 100px; }
                .ql-snow .ql-picker.ql-font { width: 160px; }
                .ql-snow .ql-picker.ql-size { width: 100px; }
                .ql-snow .ql-picker.ql-lineheight { width: 120px; }
            `}</style>
        </div>
    );
}
