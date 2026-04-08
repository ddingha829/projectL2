"use client";

import { useEffect, useRef } from "react";
import styles from "./page.module.css";

export default function ContentSegmenter({ content }: { content: string }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // 본문 내의 직접적인 자식 요소들(p, h1, h2, li 등)에 순차적으로 ID 부여
    const children = contentRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      child.setAttribute('data-segment-id', `seg-${i}`);
      child.style.transition = 'background-color 0.5s ease';
      
      // 마우스 호버 시 어떤 영역인지 시각적으로 확인 (PoC용)
      child.onmouseenter = () => {
        child.style.backgroundColor = 'rgba(32, 75, 184, 0.03)';
        child.style.cursor = 'pointer';
      };
      child.onmouseleave = () => {
        child.style.backgroundColor = 'transparent';
      };
    }
  }, [content]);

  return (
    <div 
      ref={contentRef}
      className={styles.content} 
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  );
}
