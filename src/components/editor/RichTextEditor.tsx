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

            // 폰트 등록 (두께별 옵션 포함)
            const Font: any = RQ.Quill.import('formats/font');
            if (Font) {
                Font.whitelist = [
                    'notosans', 'notosans-thin', 'notosans-light', 'notosans-medium', 'notosans-bold', 'notosans-black',
                    'nanummyeongjo', 'nanumgothic', 'inter', 'merriweather'
                ];
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

    const handleImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setOriginalFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result as string);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
    };

    const handlersAttached = useRef(false);

    useEffect(() => {
        setIsClient(true);
        
        // [중요] 티끌러 내의 모든 버튼(리사이즈 툴바 등)이 폼을 제출하지 않도록 강제 설정
        const preventSubmit = () => {
            const editorElement = document.querySelector(`.${styles.editorContainer}`);
            if (!editorElement) return;

            const buttons = editorElement.querySelectorAll("button");
            buttons.forEach(btn => {
                if (!btn.getAttribute("type")) {
                    btn.setAttribute("type", "button");
                }
            });

            // 드래그앤드롭 및 붙여넣기 핸들러 부착 (안정적인 Ref 방식 사용)
            const qlEditor = editorElement.querySelector('.ql-editor');
            if (qlEditor && !handlersAttached.current) {
                handlersAttached.current = true;
                
                // 1. 붙여넣기(Paste) 처리
                qlEditor.addEventListener('paste', ((e: ClipboardEvent) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;

                    let hasImage = false;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                            hasImage = true;
                            const file = items[i].getAsFile();
                            if (file) {
                                e.preventDefault();
                                e.stopImmediatePropagation();
                                handleImageFile(file);
                            }
                        }
                    }
                }) as any, true); // Capture phase로 우선권 확보

                // 2. 드래그앤드롭(Drop) 처리
                qlEditor.addEventListener('drop', ((e: DragEvent) => {
                    const files = e.dataTransfer?.files;
                    if (!files || files.length === 0) return;

                    let hasImage = false;
                    for (let i = 0; i < files.length; i++) {
                        if (files[i].type.startsWith('image/')) {
                            hasImage = true;
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            handleImageFile(files[i]);
                        }
                    }
                }) as any, true); // Capture phase

                // 3. 선택 영역 변경 시 툴바 강제 업데이트 (피드백 개선)
                quillRef.current.getEditor().on('selection-change', (range: any) => {
                    if (range) {
                        const quill = quillRef.current.getEditor();
                        quill.getFormat(range);
                    }
                });
            }
        };

        const timer = setInterval(preventSubmit, 1000); 
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
            handleImageFile(file);
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
                [{ 'font': [
                    false, 'notosans', 'notosans-thin', 'notosans-light', 'notosans-medium', 'notosans-bold', 'notosans-black',
                    'nanummyeongjo', 'nanumgothic', 'inter', 'merriweather'
                ] }],
                [{ 'size': [false, '0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '2.5rem'] }],
                [{ 'lineheight': [false, '1-0', '1-2', '1-4', '1-5', '1-6', '1-8', '2-0', '2-5', '3-0'] }],
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

    if (!isClient) return <div className={styles.loading}>티끌러를 불러오는 중입니다...</div>;

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
                    font-size: 1rem;
                    line-height: 1.8;
                    padding: 40px !important;
                    font-family: var(--font-noto-sans), sans-serif;
                    font-weight: 300; /* 기본 노토산스 Light 설정 */
                    color: var(--text-primary);
                    word-break: keep-all; 
                    overflow-wrap: break-word;
                }
                
                /* [신규] 폰트 영속성 해결을 위한 클래스 정의 */
                :global(.ql-font-notosans) { font-family: var(--font-noto-sans) !important; }
                :global(.ql-font-notosans-thin) { font-family: var(--font-noto-sans) !important; font-weight: 100 !important; }
                :global(.ql-font-notosans-light) { font-family: var(--font-noto-sans) !important; font-weight: 300 !important; }
                :global(.ql-font-notosans-medium) { font-family: var(--font-noto-sans) !important; font-weight: 500 !important; }
                :global(.ql-font-notosans-bold) { font-family: var(--font-noto-sans) !important; font-weight: 700 !important; }
                :global(.ql-font-notosans-black) { font-family: var(--font-noto-sans) !important; font-weight: 900 !important; }
                :global(.ql-font-nanummyeongjo) { font-family: var(--font-nanum-myeongjo) !important; }
                :global(.ql-font-nanumgothic) { font-family: var(--font-nanum-gothic) !important; }
                :global(.ql-font-inter) { font-family: var(--font-inter) !important; }
                :global(.ql-font-merriweather) { font-family: var(--font-merriweather) !important; }

                /* 티끌러 내 문단 간격 초기화 (실제 게시물과 동일하게) */
                .ql-editor p {
                    margin: 0;
                    padding: 0;
                }

                /* 사이즈 툴바 라벨 설정 */
                :global(.ql-snow .ql-picker.ql-size .ql-picker-label::before),
                :global(.ql-snow .ql-picker.ql-size .ql-picker-item::before) {
                    content: attr(data-value) !important;
                }
                :global(.ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before) { content: '1rem' !important; }

                /* 줄간격 툴바 라벨 설정 (data-value가 1-8 형태이므로 직접 매핑) */
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label::before) { content: '1.8'; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label:not([data-value])::before) { content: '1.8' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1-0"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-0"]::before) { content: '1.0' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1-2"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-2"]::before) { content: '1.2' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1-4"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-4"]::before) { content: '1.4' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1-5"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-5"]::before) { content: '1.5' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1-6"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-6"]::before) { content: '1.6' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="1-8"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="1-8"]::before) { content: '1.8' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="2-0"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="2-0"]::before) { content: '2.0' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="2-5"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="2-5"]::before) { content: '2.5' !important; }
                :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label[data-value="3-0"]::before), :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-item[data-value="3-0"]::before) { content: '3.0' !important; }

                /* 헤더 툴바 라벨 설정 */
                :global(.ql-snow .ql-picker.ql-header .ql-picker-label::before) { content: 'Heading'; }
                :global(.ql-snow .ql-picker.ql-header .ql-picker-label:not([data-value])::before) { content: '본문' !important; }

                /* Noto Sans 두께별 라벨 설정 */
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label:not([data-value])::before) { content: '기본 (노토산스 Light)'; font-family: var(--font-noto-sans); font-weight: 300; }


                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans"]::before) { content: '노토산스 (Regular)'; font-family: var(--font-noto-sans); }
                
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans-thin"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans-thin"]::before) { content: '노토산스 (Ultrathin)'; font-family: var(--font-noto-sans); font-weight: 100; }
                
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans-light"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans-light"]::before) { content: '노토산스 (Light)'; font-family: var(--font-noto-sans); font-weight: 300; }
                
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans-medium"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans-medium"]::before) { content: '노토산스 (Medium)'; font-family: var(--font-noto-sans); font-weight: 500; }
                
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans-bold"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans-bold"]::before) { content: '노토산스 (Bold)'; font-family: var(--font-noto-sans); font-weight: 700; }
                
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans-black"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans-black"]::before) { content: '노토산스 (Black)'; font-family: var(--font-noto-sans); font-weight: 900; }

                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="nanummyeongjo"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="nanummyeongjo"]::before) { content: '나눔명조'; font-family: var(--font-nanum-myeongjo); }
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="nanumgothic"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="nanumgothic"]::before) { content: '나눔고딕'; font-family: var(--font-nanum-gothic); }
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="inter"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="inter"]::before) { content: 'Inter (Sans)'; font-family: var(--font-inter); }
                :global(.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="merriweather"]::before),
                :global(.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="merriweather"]::before) { content: 'Merriweather (Serif)'; font-family: var(--font-merriweather); }

                @media (max-width: 768px) {
                    .ql-editor {
                        padding: 24px 11px !important; /* Adjusted to match ticgle.kr mobile padding */
                        font-size: 0.98rem; /* Match actual post detail page mobile font size */
                    }
                    .ql-toolbar.ql-snow {
                        padding: 4px 6px;
                    }
                    :global(.ql-snow .ql-picker.ql-header .ql-picker-label::before) { content: 'H' !important; }
                    :global(.ql-snow .ql-picker.ql-font .ql-picker-label::before) { content: 'Font' !important; }
                    :global(.ql-snow .ql-picker.ql-size .ql-picker-label::before) { content: 'Size' !important; }
                    :global(.ql-snow .ql-picker.ql-lineheight .ql-picker-label::before) { content: 'LH' !important; }
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
                    height: auto !important;
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
                .ql-snow .ql-picker.ql-font { width: 180px; }
                .ql-snow .ql-picker.ql-size { width: 100px; }
                .ql-snow .ql-picker.ql-lineheight { width: 120px; }


            `}</style>
        </div>
    );
}
