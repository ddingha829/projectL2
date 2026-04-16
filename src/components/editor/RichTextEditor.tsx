"use client";

import dynamic from 'next/dynamic';
import { useState, useMemo, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './RichTextEditor.module.css';
import ImageCropModal from './ImageCropModal';
import 'react-quill-new/dist/quill.snow.css'; // 최상단으로 이동

// [중요] Quill 관련 커스텀 등록 (SSR 방지 및 안정적인 등록)
const ReactQuill = dynamic(async () => {
    const { default: RQ } = await import("react-quill-new");
    
    // [중요] RQ.Quill을 사용하여 해당 라이브러리 인스턴스에 직접 등록
    const Quill = (RQ as any).Quill;
    
    if (Quill) {
        try {
            // [Quill 2.0 정석 등록 방식]
            const Parchment = Quill.import('parchment');
            
            // 1. Font Family (Class Attributor) - Noto Sans Light가 기본값(false)
            const Font = Quill.import('formats/font');
            if (Font) {
                Font.whitelist = [
                    'notosans', 'notosans-thin', 'notosans-medium', 'notosans-bold', 'notosans-black',
                    'nanummyeongjo', 'nanumgothic', 'inter', 'merriweather'
                ];
                Quill.register(Font, true);
            }

            // 2. Font Size (Style Attributor) - 14px가 기본값(false)
            const StyleAttributor = Parchment.StyleAttributor || (Parchment.Attributor ? (Parchment.Attributor as any).Style : null);
            if (StyleAttributor) {
                const SizeStyle = new StyleAttributor('size', 'font-size', {
                    scope: Parchment.Scope.INLINE,
                    whitelist: ['10px', '11px', '12px', '13px', '16px', '18px', '20px', '24px', '32px', '48px']
                });
                Quill.register(SizeStyle, true);
            }

            // 3. Line Height (Custom Class Attributor) - 1.6이 기본값(false)
            const ClassAttributor = Parchment.ClassAttributor || (Parchment.Attributor ? (Parchment.Attributor as any).Class : null);
            if (ClassAttributor) {
                const LineHeightClass = new ClassAttributor('line-height', 'ql-line-height', {
                    scope: Parchment.Scope.INLINE,
                    whitelist: ['1-0', '1-2', '1-4', '1-5', '1-8', '2-0', '2-5', '3-0']
                });
                Quill.register(LineHeightClass, true);
            }

            // 4. Image Resize
            if (typeof window !== 'undefined') {
                (window as any).Quill = Quill;
            }
            const ImageResizeModule = await import('quill-image-resize-module-react');
            if (ImageResizeModule.default) {
                Quill.register('modules/imageResize', ImageResizeModule.default);
            }
            
            console.log("Quill formats & modules registered successfully");
        } catch (e) {
            console.error("Quill registration failed", e);
        }
    }

    return function QuillComponent({ forwardedRef, ...props }: any) {
        return <RQ ref={forwardedRef} {...props} />;
    };
}, { ssr: false });

interface RichTextEditorProps {
    content: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
    const supabase = createClient();
    const [isClient, setIsClient] = useState(false);
    const quillRef = useRef<any>(null);
    const lastContentRef = useRef(content);
    
    // [이미지 관련 State]
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState("");
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

    const compressImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const max_size = 1200;

                    if (width > height) {
                        if (width > max_size) {
                            height *= max_size / width;
                            width = max_size;
                        }
                    } else {
                        if (height > max_size) {
                            width *= max_size / height;
                            height = max_size;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas to Blob failed'));
                    }, 'image/jpeg', 0.85);
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        
        const quill = quillRef.current?.getEditor();
        const range = quill?.getSelection();
        const currentIndex = range ? range.index : quill.getLength();

        try {
            const compressedFile = await compressImage(file);
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `editor/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
            
            const { error } = await supabase.storage
                .from('post-images')
                .upload(fileName, compressedFile, { contentType: file.type });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('post-images')
                .getPublicUrl(fileName);

            if (quill) {
                quill.insertEmbed(currentIndex, "image", publicUrl);
                quill.setSelection(currentIndex + 1);
            }
        } catch (err) {
            console.error('Direct upload failed:', err);
        }
    };

    const handlersAttached = useRef(false);

    useEffect(() => {
        setIsClient(true);
        
        const checkEditor = () => {
            const editorElement = document.querySelector(`.${styles.editorContainer}`);
            if (!editorElement) return;

            const qlEditor = editorElement.querySelector('.ql-editor') as HTMLElement;
            if (qlEditor && !handlersAttached.current) {
                handlersAttached.current = true;
                
                const handleEditorClick = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (target.closest(`.${styles.imageFloatingToolbar}`)) return;

                    if (target.tagName === 'IMG') {
                        const img = target as HTMLImageElement;
                        qlEditor.querySelectorAll('img').forEach(i => i.removeAttribute('data-cropping-target'));
                        img.setAttribute('data-cropping-target', 'true');
                        setSelectedImage(img);
                        
                        const rect = img.getBoundingClientRect();
                        setToolbarPos({
                            top: rect.top - 50,
                            left: rect.left + (rect.width / 2) - 100
                        });
                    } else {
                        setSelectedImage(null);
                        qlEditor.querySelectorAll('img').forEach(i => i.removeAttribute('data-cropping-target'));
                    }
                };

                qlEditor.addEventListener('click', handleEditorClick as EventListener);
                qlEditor.onscroll = () => setSelectedImage(null);
            }
        };

        const timer = setInterval(checkEditor, 1000); 
        return () => clearInterval(timer);
    }, []);

    const handleEditorChange = (newContent: string) => {
        if (newContent !== lastContentRef.current) {
            lastContentRef.current = newContent;
            onChange(newContent);
        }
    };

    const imageHandler = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = true;
        input.click();
        input.onchange = async () => {
            const files = input.files;
            if (!files) return;
            for (let i = 0; i < files.length; i++) {
                handleImageFile(files[i]);
            }
        };
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setShowCropModal(false);
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        try {
            const compressedFile = await compressImage(new File([croppedBlob], "image.jpg", { type: "image/jpeg" }));
            const fileName = `editor/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.jpg`;
            const { error } = await supabase.storage
                .from('post-images')
                .upload(fileName, compressedFile, { contentType: "image/jpeg" });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('post-images')
                .getPublicUrl(fileName);

            const targetImg = quill.root.querySelector('img[data-cropping-target="true"]');
            if (targetImg) {
                const blot = (quill.constructor as any).find(targetImg);
                if (blot) {
                    const index = blot.offset(quill.scroll);
                    // [변경] 기존 이미지의 attributes(data-main-image 등)을 최대한 보존하거나, 필요시 새로 삽입
                    const isMain = targetImg.hasAttribute('data-main-image');
                    
                    quill.deleteText(index, 1);
                    quill.insertEmbed(index, "image", publicUrl);
                    
                    // 삽입된 이미지를 다시 찾아서 속성 복구
                    setTimeout(() => {
                        const newImg = quill.root.querySelector(`img[src="${publicUrl}"]`);
                        if (newImg && isMain) {
                            newImg.setAttribute('data-main-image', 'true');
                            (newImg as HTMLElement).style.outline = '4px solid #ff4804';
                        }
                    }, 50);
                    
                    quill.setSelection(index + 1);
                }
            } else {
                let range = quill.getSelection();
                let currentIndex = range ? range.index : quill.getLength();
                quill.insertEmbed(currentIndex, "image", publicUrl);
            }
            setSelectedImage(null);
            quill.root.querySelectorAll('img').forEach((i: any) => i.removeAttribute('data-cropping-target'));
        } catch (err) {
            console.error('Upload failed:', err);
        }
    };

    const handleSetAsMain = () => {
        if (!selectedImage) return;
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const images = quill.root.querySelectorAll('img');
        images.forEach((img: HTMLImageElement) => {
            img.removeAttribute('data-main-image');
            img.style.outline = 'none';
        });

        selectedImage.setAttribute('data-main-image', 'true');
        selectedImage.style.outline = '4px solid #ff4804';
        
        onChange(quill.root.innerHTML);
        alert("대표 이미지로 지정되었습니다.");
        setSelectedImage(null);
    };

    const handleAddCaption = () => {
        if (!selectedImage) return;
        const caption = prompt("사진 캡션을 입력하세요:");
        if (caption === null) return;

        const quill = quillRef.current?.getEditor();
        const parentP = selectedImage.closest('p');
        
        if (parentP) {
            let nextEl = parentP.nextElementSibling;
            if (nextEl && nextEl.classList.contains(styles.captionText)) {
                (nextEl as HTMLElement).innerText = caption;
            } else {
                const captionNode = document.createElement('p');
                captionNode.className = styles.captionText;
                captionNode.innerText = caption;
                parentP.insertAdjacentElement('afterend', captionNode);
            }
            onChange(quill.root.innerHTML);
        }
        setSelectedImage(null);
    };

    const handleReCrop = () => {
        if (!selectedImage) return;
        setCropImageSrc(selectedImage.src);
        setShowCropModal(true);
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                [{ 'font': [
                    false, 'notosans', 'notosans-thin', 'notosans-medium', 'notosans-bold', 'notosans-black',
                    'nanummyeongjo', 'nanumgothic', 'inter', 'merriweather'
                ] }],
                [{ 'size': ['10px', '11px', '12px', '13px', false, '16px', '18px', '20px', '24px', '32px', '48px'] }],
                [{ 'line-height': ['1-0', '1-2', '1-4', '1-5', false, '1-8', '2-0', '2-5', '3-0'] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['image', 'link', 'clean']
            ],
            handlers: { image: imageHandler }
        },
        imageResize: { modules: ['Resize', 'DisplaySize', 'Toolbar'] }
    }), []);

    const formats = [
        'header', 'font', 'size', 'line-height',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background', 'align',
        'list', 'image', 'link'
    ];

    if (!isClient) return <div className={styles.loading}>티끌러를 불러오는 중입니다...</div>;

    return (
        <div className={styles.editorContainer}>
            {selectedImage && !showCropModal && (
                <div 
                    className={styles.imageFloatingToolbar}
                    style={{ 
                        top: toolbarPos.top, 
                        left: toolbarPos.left 
                    }}
                    onMouseDown={(e) => e.stopPropagation()} 
                    onClick={(e) => e.stopPropagation()}
                >
                    <button type="button" onClick={handleSetAsMain}>📌 대표설정</button>
                    <button type="button" onClick={handleReCrop}>✂️ 크롭</button>
                    <button type="button" onClick={handleAddCaption}>💬 캡션</button>
                    <button 
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => {
                            if (confirm("사진을 삭제하시겠습니까?")) {
                                const quill = quillRef.current?.getEditor();
                                const parentP = selectedImage.closest('p');
                                if (parentP) {
                                    const nextEl = parentP.nextElementSibling;
                                    if (nextEl && nextEl.classList.contains(styles.captionText)) {
                                        nextEl.remove();
                                    }
                                }
                                selectedImage.remove();
                                onChange(quill.root.innerHTML);
                                setSelectedImage(null);
                            }
                        }}
                    >
                        🗑️ 삭제
                    </button>
                    <button type="button" onClick={() => setSelectedImage(null)}>✕</button>
                </div>
            )}

            <ReactQuill
                forwardedRef={quillRef}
                theme="snow"
                value={content}
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
        </div>
    );
}
