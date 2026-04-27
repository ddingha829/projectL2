"use client";

import dynamic from 'next/dynamic';
import { useState, useMemo, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './RichTextEditor.module.css';
import ImageCropModal from './ImageCropModal';
import PlaceSearchModal from './PlaceSearchModal';
import { AnimatePresence } from 'framer-motion';
import 'react-quill-new/dist/quill.snow.css';

// [중요] Quill 관련 커스텀 등록 (SSR 방지 및 안정적인 등록)
const ReactQuill = dynamic(async () => {
    const { default: RQ, Quill } = await import("react-quill-new");
    
    if (Quill) {
        try {
            // [Quill 2.0 정석 등록 방식]
            const Parchment = (Quill as any).import('parchment');
            
            // 아이콘 추가 (장소 버튼용)
            const icons = (Quill as any).import('ui/icons');
            if (icons) {
                icons['place'] = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
            }

            // 1. Font Family (Class Attributor) - Noto Sans Thin이 기본값(false)이 되도록 함
            const Font = (Quill as any).import('formats/font');
            if (Font) {
                Font.whitelist = [
                    'notosans', 'notosans-medium', 'notosans-bold', 'notosans-black',
                    'nanummyeongjo', 'nanumgothic', 'inter', 'merriweather'
                ];
                (Quill as any).register(Font, true);
            }

            // 2. Font Size (Style Attributor) - 14px가 기본값(false)
            const StyleAttributor = Parchment.StyleAttributor || (Parchment.Attributor ? (Parchment.Attributor as any).Style : null);
            if (StyleAttributor) {
                const SizeStyle = new StyleAttributor('size', 'font-size', {
                    scope: Parchment.Scope.INLINE,
                    whitelist: ['10px', '11px', '12px', '13px', '16px', '18px', '20px', '24px', '32px', '48px'] // 14px는 false로 처리
                });
                (Quill as any).register(SizeStyle, true);
            }

            // 3. Line Height (Custom Class Attributor) - 1.6이 기본값(false)
            const ClassAttributor = Parchment.ClassAttributor || (Parchment.Attributor ? (Parchment.Attributor as any).Class : null);
            if (ClassAttributor) {
                const LineHeightClass = new ClassAttributor('line-height', 'ql-line-height', {
                    scope: Parchment.Scope.INLINE,
                    whitelist: ['1-0', '1-2', '1-4', '1-5', '1-8', '2-0', '2-5', '3-0']
                });
                (Quill as any).register(LineHeightClass, true);
            }

            // 4. Video/Iframe Blot (Google Maps 지원)
            const Video = (Quill as any).import('formats/video');
            class SafeVideo extends (Video as any) {
                static create(value: string) {
                    const node = super.create(value);
                    if (value.includes('google.com/maps')) {
                        node.setAttribute('frameborder', '0');
                        node.setAttribute('style', 'border:0; width:100%; height:450px;');
                        node.setAttribute('allowfullscreen', 'true');
                    }
                    return node;
                }
            }
            (Quill as any).register(SafeVideo, true);

            // 5. Review Card Blot (인라인 리뷰 카드)
            const BlockEmbed = (Quill as any).import('blots/block/embed');
            class ReviewCard extends BlockEmbed {
                static blotName = 'review-card';
                static tagName = 'div';
                static className = 'ql-review-card';

                static create(value: any) {
                    const node = super.create();
                    node.style.position = 'relative'; // 삭제 버튼의 기준점
                    node.style.margin = '40px auto';
                    node.style.display = 'block';
                    node.style.maxWidth = '700px';
                    node.style.width = '100%';
                    node.style.lineHeight = 'normal';
                    node.setAttribute('contenteditable', 'false');
                    node.setAttribute('draggable', 'true'); // 드래그 가능하게 설정
                    node.style.cursor = 'grab';
                    node.setAttribute('data-place-name', value.placeName || '');
                    node.setAttribute('data-place-id', value.placeId || '');
                    node.setAttribute('data-address', value.address || '');
                    node.setAttribute('data-rating', value.rating || '0');
                    node.setAttribute('data-comment', value.comment || '');
                    node.setAttribute('data-embed-url', value.embedUrl || '');
                    node.setAttribute('data-category', value.category || ''); 
                    node.setAttribute('data-lat', value.lat?.toString() || '');
                    node.setAttribute('data-lng', value.lng?.toString() || '');
                    node.id = 'ticgle-place';
                    
                    const rating = Number(value.rating) || 0;
                    const starsHtml = [1, 2, 3, 4, 5].map(s => {
                        const diff = rating - (s - 1);
                        const fillPercent = Math.max(0, Math.min(100, diff * 100));
                        return `<div class="star-mini-wrapper" style="position:relative;display:inline-block;width:13px;height:13px;margin-right:0;"><svg viewBox="0 0 24 24" width="13" height="13" fill="#FFFFFF"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><div style="position:absolute;top:0;left:0;width:${fillPercent}%;overflow:hidden;"><svg viewBox="0 0 24 24" width="13" height="13" fill="#FF4804"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></div></div>`;
                    }).join('');

                    const isManual = value.placeId === 'manual';
                    let googleMapsUrl = '';
                    if (value.placeId && !isManual) {
                        // 검색 결과 목록을 띄우지 않고 해당 업체의 상세 정보 단독 뷰를 강제함
                        googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${value.placeId}`;
                    } else if (value.lat && value.lng) {
                        googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`;
                    } else {
                        googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.placeName || '')}`;
                    }
                    
                    if (isManual) {
                        node.classList.add('review-card-manual-photo');
                    }
                    
                    const mapOrImageHtml = isManual 
                        ? `<div class="review-card-map review-card-manual-photo-area" style="width:220px !important; min-width:220px !important; height:100% !important; background-color:#f8fafc; position:relative;"></div>`
                        : `<div class="review-card-map"><iframe src="${value.embedUrl}" frameborder="0"></iframe></div>`;
                    
                    node.innerHTML = `
                        <div class="review-card-inner" style="margin: 0 auto;">
                            <div class="review-card-header">
                                <span class="brand-label">TICGLE PLACE</span>
                            </div>
                            <div class="review-card-main">
                                ${isManual ? mapOrImageHtml : `<a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="review-card-map-link">${mapOrImageHtml}</a>`}
                                
                                ${isManual ? `
                                    <div class="review-card-body" style="display:flex !important;">
                                        <div class="review-card-top" style="width:100%;">
                                            <div class="place-info">
                                                <h3 class="place-name">${value.placeName}</h3>
                                                <p class="place-address">${value.category || value.address || ''}</p>
                                            </div>
                                            <div class="score-column" style="display:flex; flex-direction:column; align-items:center; gap:6px; margin-left:auto; flex-shrink:0;">
                                                <div class="score-badge">
                                                    <span class="score-value">${rating.toFixed(1)}</span>
                                                </div>
                                                <div class="score-stars-box">${starsHtml}</div>
                                            </div>
                                        </div>
                                        <div class="review-comment">
                                            <blockquote style="margin:0;">"${value.comment}"</blockquote>
                                        </div>
                                    </div>
                                ` : `
                                    <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="review-card-body" style="text-decoration:none; color:inherit; display:flex !important; cursor:pointer;" title="구글 지도에서 크게 보기">
                                        <div class="review-card-top" style="width:100%;">
                                            <div class="place-info">
                                                <h3 class="place-name">${value.placeName}</h3>
                                                <p class="place-address">${value.address || ''}</p>
                                            </div>
                                            <div class="score-column" style="display:flex; flex-direction:column; align-items:center; gap:6px; margin-left:auto; flex-shrink:0;">
                                                <div class="score-badge">
                                                    <span class="score-value">${rating.toFixed(1)}</span>
                                                </div>
                                                <div class="score-stars-box">${starsHtml}</div>
                                            </div>
                                        </div>
                                        <div class="review-comment">
                                            <blockquote style="margin:0;">"${value.comment}"</blockquote>
                                        </div>
                                    </a>
                                `}
                            </div>
                            <button class="review-card-delete" style="display:none;" onclick="this.closest('.ql-review-card').remove()">✕</button>
                        </div>`;
                    return node;
                }

                static value(node: HTMLElement) {
                    return {
                        placeName: node.getAttribute('data-place-name'),
                        placeId: node.getAttribute('data-place-id'),
                        address: node.getAttribute('data-address'),
                        rating: node.getAttribute('data-rating'),
                        comment: node.getAttribute('data-comment'),
                        embedUrl: node.getAttribute('data-embed-url'),
                        category: node.getAttribute('data-category'),
                        lat: node.getAttribute('data-lat') ? parseFloat(node.getAttribute('data-lat')!) : undefined,
                        lng: node.getAttribute('data-lng') ? parseFloat(node.getAttribute('data-lng')!) : undefined
                    };
                }
            }
            (Quill as any).register(ReviewCard, true);

            // 6. Image Resize
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

export default function RichTextEditor({ content, onChange, placeholder = "" }: RichTextEditorProps) {
    const supabase = createClient();
    const [isClient, setIsClient] = useState(false);
    const quillRef = useRef<any>(null);
    const lastContentRef = useRef(content);
    
    // [이미지 관련 State]
    const [showCropModal, setShowCropModal] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState("");
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [selectedCard, setSelectedCard] = useState<HTMLElement | null>(null);
    const [isMobilePreview, setIsMobilePreview] = useState(false);
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
        if (!quill) return;

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

            // [심폐소생술] 삽입 직전에 최신 커서 위치를 다시 한 번 확인
            const range = quill.getSelection(true);
            const insertIndex = range ? range.index : quill.getLength();

            quill.insertEmbed(insertIndex, "image", publicUrl);
            // [기본값] 사진 삽입 시 해당 라인을 가운데 정렬로 설정 (나중에 나란히 배치도 가능)
            quill.formatLine(insertIndex, 1, 'align', 'center');
            quill.setSelection(insertIndex + 1);
            
            // 모바일을 위해 잠깐의 휴식 (UI 갱신 시간 확보)
            await new Promise(resolve => setTimeout(resolve, 100));
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

                    const card = target.closest('.ql-review-card') as HTMLElement;

                    if (target.tagName === 'IMG') {
                        const img = target as HTMLImageElement;
                        qlEditor.querySelectorAll('img').forEach(i => i.removeAttribute('data-cropping-target'));
                        img.setAttribute('data-cropping-target', 'true');
                        setSelectedImage(img);
                        setSelectedCard(null);
                        
                        const rect = img.getBoundingClientRect();
                        setToolbarPos({
                            top: rect.top - 50,
                            left: rect.left + (rect.width / 2) - 100
                        });
                    } else if (card) {
                        // 리뷰 카드 선택 효과 및 에디터 셀렉션 동기화
                        const quill = quillRef.current?.getEditor();
                        if (quill) {
                            const blot = (quill.constructor as any).find(card);
                            if (blot) {
                                const index = blot.offset(quill.scroll);
                                // [핵심] 해당 카드 위치를 에디터 선택 영역으로 지정 (Ctrl+X 작동용)
                                quill.setSelection(index, 1);
                            }
                        }

                        qlEditor.querySelectorAll('.ql-review-card').forEach(c => (c as HTMLElement).style.outline = 'none');
                        card.style.outline = '3px solid #ff4804';
                        card.style.borderRadius = '20px';
                        setSelectedCard(card);
                        setSelectedImage(null);

                        const rect = card.getBoundingClientRect();
                        setToolbarPos({
                            top: rect.top - 50,
                            left: rect.left + (rect.width / 2) - 100
                        });
                    } else {
                        setSelectedImage(null);
                        setSelectedCard(null);
                        qlEditor.querySelectorAll('img').forEach(i => i.removeAttribute('data-cropping-target'));
                        qlEditor.querySelectorAll('.ql-review-card').forEach(c => (c as HTMLElement).style.outline = 'none');
                    }
                };

                qlEditor.addEventListener('click', handleEditorClick as EventListener);
                qlEditor.onscroll = () => {
                    setSelectedImage(null);
                    setSelectedCard(null);
                };
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
            if (!files || files.length === 0) return;
            
            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            // 모바일에서 포커스 유실 대비: 현재 선택 영역 또는 끝 지점 확보
            let range = quill.getSelection(true);
            let currentIndex = range ? range.index : quill.getLength();

            for (let i = 0; i < files.length; i++) {
                // [순차 처리] await을 사용하여 한 장씩 확실하게 삽입
                await handleImageFile(files[i]);
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

    const handleMapSelect = (placeData: { 
        placeName: string, 
        address: string, 
        rating: number, 
        comment: string, 
        placeId?: string,
        lat?: number,
        lng?: number,
        category?: string
    }) => {
        const quill = quillRef.current?.getEditor();
        if (quill) {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=place_id:${placeData.placeId || encodeURIComponent(placeData.placeName)}&zoom=15&language=ko`;
            
            if (selectedCard) {
                // [수정 모드] 기존 위치를 찾아서 교체
                const blot = (quill.constructor as any).find(selectedCard);
                if (blot) {
                    const index = blot.offset(quill.scroll);
                    quill.deleteText(index, 1);
                    quill.insertEmbed(index, 'review-card', {
                        ...placeData,
                        embedUrl: embedUrl
                    });
                    quill.setSelection(index + 1 as any);
                }
            } else {
                // [신규 모드] 현재 커서 위치에 삽입
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'review-card', {
                    ...placeData,
                    embedUrl: embedUrl
                });
                quill.setSelection(range.index + 1 as any);
            }
        }
        setShowMapModal(false);
        setSelectedCard(null);
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'font': [
                    false, 'notosans', 'notosans-medium', 'notosans-bold', 'notosans-black',
                    'nanummyeongjo', 'nanumgothic', 'inter', 'merriweather'
                ] }],
                [{ 'size': [false, '10px', '11px', '12px', '13px', '16px', '18px', '20px', '24px', '32px', '48px'] }],
                [{ 'line-height': ['1-0', '1-2', '1-4', '1-5', false, '1-8', '2-0', '2-5', '3-0'] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['image', 'link', 'video', 'place', 'clean']
            ],
            handlers: { 
                image: imageHandler,
                place: () => setShowMapModal(true)
            }
        },
        imageResize: { modules: ['Resize', 'DisplaySize', 'Toolbar'] }
    }), []);

    const formats = [
        'header', 'font', 'size', 'line-height',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background', 'align',
        'list', 'image', 'link', 'video', 'review-card', 'color', 'background'
    ];

    if (!isClient) return <div className={styles.loading}>티끌러를 불러오는 중입니다...</div>;

    return (
        <div className={`${styles.editorOverallWrapper} ${isMobilePreview ? styles.mobilePreviewMode : ''}`}>
            <div className={styles.modeToggleContainer}>
                <div className={styles.modeToggleTrack}>
                    <button 
                        type="button"
                        className={`${styles.modeButton} ${!isMobilePreview ? styles.active : ''}`}
                        onClick={() => setIsMobilePreview(false)}
                    >
                        <svg className={styles.modeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <span className={styles.label}>Desktop</span>
                    </button>
                    <button 
                        type="button"
                        className={`${styles.modeButton} ${isMobilePreview ? styles.active : ''}`}
                        onClick={() => setIsMobilePreview(true)}
                    >
                        <svg className={styles.modeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                            <line x1="12" y1="18" x2="12.01" y2="18"></line>
                        </svg>
                        <span className={styles.label}>Mobile</span>
                    </button>
                    <div className={styles.activeGlider} style={{ transform: isMobilePreview ? 'translateX(100%)' : 'translateX(0)' }} />
                </div>
            </div>

            <div className={styles.editorContainer}>
                <style dangerouslySetInnerHTML={{ __html: `
                    /* 1. 순수 블랙 텍스트 강제 적용 */
                    .ql-editor {
                        color: #000000 !important;
                        --base-width: 1100;
                        --f-unit: clamp(0.6px, calc(100cqw / var(--base-width)), 1px);
                        container-type: inline-size;
                        font-family: var(--font-noto-sans) !important;
                        font-weight: 400 !important;
                        background-color: #ffffff !important;
                        word-break: keep-all !important;
                        overflow-wrap: break-word !important;
                        padding: calc(60 * var(--f-unit)) calc(65 * var(--f-unit)) !important;
                        transition: all 0.3s ease;
                    }
                    .ql-editor.ql-blank::before { content: "" !important; display: none !important; }

                    .ql-editor * {
                        color: #000000 !important;
                    }
                    
                    .ql-snow .ql-picker.ql-color .ql-picker-item[data-value="#000000"] {
                        background-color: #000000 !important;
                    }

                /* 1. 폰트 선택기 라벨 교체 */
                body .ql-snow .ql-picker.ql-font .ql-picker-label::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item::before {
                    content: '노토 (Regular)' !important;
                }
                body .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans"]::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans"]::before {
                    content: '노토 (Regular)' !important;
                }
                body .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans-medium"]::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans-medium"]::before { content: '노토 (Medium)' !important; }
                body .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans-bold"]::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans-bold"]::before { content: '노토 (Bold)' !important; }
                body .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosans-black"]::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosans-black"]::before { content: '노토 (Black)' !important; }
                body .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="nanummyeongjo"]::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="nanummyeongjo"]::before { content: '나눔명조' !important; }
                body .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="nanumgothic"]::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="nanumgothic"]::before { content: '나눔고딕' !important; }
                body .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="inter"]::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="inter"]::before { content: 'Inter' !important; }
                body .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="merriweather"]::before,
                body .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="merriweather"]::before { content: 'Merriweather' !important; }

                /* 2. 글자 크기 라벨 교체 */
                body .ql-snow .ql-picker.ql-size .ql-picker-label::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item::before {
                    content: '14px' !important;
                }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before { content: '10px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="11px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="11px"]::before { content: '11px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before { content: '12px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="13px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="13px"]::before { content: '13px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before { content: '16px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before { content: '18px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before { content: '20px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before { content: '24px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before { content: '32px' !important; }
                body .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="48px"]::before,
                body .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="48px"]::before { content: '48px' !important; }

                    transition: all 0.3s ease; /* 미리보기 전환 시 부드러운 효과 */
                }

                /* 기본 14px -> 20px 매핑 적용 (1.43배 확대) */
                .ql-editor, .ql-editor p, .ql-editor li {
                    font-size: calc(20 * var(--f-unit)) !important;
                }

                /* 모든 지원 크기를 가변 단위로 매칭 */
                .ql-editor [class*="ql-size-10px"] { font-size: calc(21 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-11px"] { font-size: calc(23 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-12px"] { font-size: calc(24 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-13px"] { font-size: calc(26 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-14px"] { font-size: calc(30 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-16px"] { font-size: calc(34 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-18px"] { font-size: calc(38 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-20px"] { font-size: calc(42 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-24px"] { font-size: calc(51 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-32px"] { font-size: calc(68 * var(--f-unit)) !important; }
                .ql-editor [class*="ql-size-48px"] { font-size: calc(102 * var(--f-unit)) !important; }

                /* Placeholder도 가변 크기 적용 */
                .ql-editor.ql-blank::before {
                    font-size: calc(30 * var(--f-unit)) !important;
                    color: #adb5bd !important;
                    letter-spacing: normal !important;
                }
            ` }} />

            {(selectedImage || selectedCard) && !showCropModal && (
                <div 
                    className={styles.imageFloatingToolbar}
                    style={{ 
                        top: toolbarPos.top, 
                        left: toolbarPos.left 
                    }}
                    onMouseDown={(e) => e.stopPropagation()} 
                    onClick={(e) => e.stopPropagation()}
                >
                    {selectedImage ? (
                        <>
                            <button type="button" onClick={handleSetAsMain}>📌 대표설정</button>
                            <button type="button" onClick={handleReCrop}>✂️ 크롭</button>
                            <button type="button" onClick={handleAddCaption}>💬 캡션</button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => setShowMapModal(true)}>✏️ 수정</button>
                        </>
                    )}
                    
                    <button 
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => {
                            if (confirm(selectedImage ? "사진을 삭제하시겠습니까?" : "리뷰 카드를 삭제하시겠습니까?")) {
                                const quill = quillRef.current?.getEditor();
                                if (selectedImage) {
                                    const parentP = selectedImage.closest('p');
                                    if (parentP) {
                                        const nextEl = parentP.nextElementSibling;
                                        if (nextEl && nextEl.classList.contains(styles.captionText)) {
                                            nextEl.remove();
                                        }
                                    }
                                    selectedImage.remove();
                                } else if (selectedCard) {
                                    selectedCard.remove();
                                }
                                onChange(quill.root.innerHTML);
                                setSelectedImage(null);
                                setSelectedCard(null);
                            }
                        }}
                    >
                        🗑️ 삭제
                    </button>
                    <button type="button" onClick={() => { setSelectedImage(null); setSelectedCard(null); }}>✕</button>
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

            <AnimatePresence>
                {showMapModal && (
                    <PlaceSearchModal 
                        initialData={selectedCard ? (() => {
                            const embedUrl = selectedCard.getAttribute('data-embed-url') || '';
                            let placeId = selectedCard.getAttribute('data-place-id') || '';
                            
                            // [심폐소생술] placeId가 없는 구형 카드의 경우 임베드 주소에서 추출
                            if (!placeId || placeId === 'manual') {
                                const match = embedUrl.match(/place_id:([^&]+)/);
                                if (match && match[1]) {
                                    placeId = decodeURIComponent(match[1]);
                                }
                            }

                            return {
                                placeName: selectedCard.getAttribute('data-place-name') || '',
                                address: selectedCard.getAttribute('data-address') || '',
                                rating: parseFloat(selectedCard.getAttribute('data-rating') || '0'),
                                comment: selectedCard.getAttribute('data-comment') || '',
                                placeId: placeId || undefined,
                                category: selectedCard.getAttribute('data-category') || '',
                                lat: selectedCard.getAttribute('data-lat') ? parseFloat(selectedCard.getAttribute('data-lat')!) : undefined,
                                lng: selectedCard.getAttribute('data-lng') ? parseFloat(selectedCard.getAttribute('data-lng')!) : undefined
                            };
                        })() : undefined}
                        onSelect={handleMapSelect}
                        onCancel={() => {
                            setShowMapModal(false);
                            setSelectedCard(null);
                            const q = quillRef.current?.getEditor();
                            if (q) q.root.querySelectorAll('.ql-review-card').forEach((c:any) => c.style.outline = 'none');
                        }}
                    />
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}
