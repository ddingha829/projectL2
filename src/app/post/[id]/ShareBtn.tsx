"use client"

import { useState, useRef, useEffect } from 'react'
import styles from './page.module.css'

interface ShareBtnProps {
  title: string;
}

declare global {
  interface Window {
    Kakao: any;
  }
}

export default function ShareBtn({ title }: ShareBtnProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const url = typeof window !== 'undefined' ? window.location.href : ''

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setIsOpen(false)
      }, 2000)
    } catch (err) {
      console.error('URL 복사 실패:', err)
      alert('URL 복사에 실패했습니다.')
    }
  }

  const shareToX = () => {
    const text = encodeURIComponent(`[티끌] ${title}`);
    const shareUrl = encodeURIComponent(url);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank');
    setIsOpen(false);
  }

  // Kakao SDK Initialization
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init('97f8f4014384af8c9af5ad10d5abf617'); 
      }
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const shareToKakao = () => {
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: '티끌 모아 반짝이는, 일상 매거진',
          imageUrl: 'https://ticgle.kr/preview.png',
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
        buttons: [
          {
            title: '매거진 읽기',
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
        ],
      });
    } else {
      // Fallback if SDK fails
      const shareUrl = encodeURIComponent(url);
      window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${shareUrl}`, '_blank', 'width=400,height=600');
    }
    setIsOpen(false);
  }

  return (
    <div className={styles.shareWrapper} ref={menuRef}>
      <button 
        className={styles.copyBtn} 
        onClick={() => setIsOpen(!isOpen)}
        title="공유하기"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      </button>

      {isOpen && (
        <div className={styles.shareMenu}>
          <button className={styles.shareItem} onClick={shareToKakao}>
            <div className={styles.shareItemIcon}>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="#3A1D1D"><path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.553 1.706 4.8 4.315 6.091l-1.091 4.015 4.612-3.076c.381.054.769.085 1.164.085 4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/></svg>
            </div>
            카카오톡 공유
          </button>
          
          <button className={styles.shareItem} onClick={shareToX}>
            <div className={styles.shareItemIcon}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </div>
            X(트위터) 공유
          </button>

          <div style={{ height: '1px', background: 'var(--border-light)', margin: '4px 8px' }} />

          <button className={styles.shareItem} onClick={handleCopy}>
            <div className={styles.shareItemIcon}>
               {copied ? (
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2fb344" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
               ) : (
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
               )}
            </div>
            {copied ? '복사되었습니다!' : '링크 복사'}
          </button>
        </div>
      )}
    </div>
  )
}
