"use client";

import { useEffect, useRef, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import styles from "./page.module.css";

export default function ContentSegmenter({ 
  content, 
  comments = [] 
}: { 
  content: string;
  comments?: any[];
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // 1. Basic segments
    const children = contentRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      child.setAttribute('data-segment-id', `seg-${i}`);
    }

    // 2. Highlighting logic
    const quoteMap = new Map<string, string>(); // text -> commentId
    comments.forEach(c => {
      const match = c.content.match(/^\[quote:(.*?):(.*?)\]/);
      if (match && match[2]) {
        quoteMap.set(match[2], c.id);
      }
    });

    if (quoteMap.size > 0) {
      highlightNodes(contentRef.current, quoteMap);
    }

    // 3. Image click handling
    const images = contentRef.current.querySelectorAll('img');
    images.forEach(img => {
      img.style.cursor = 'zoom-in';
      img.title = "클릭하여 원본 이미지 보기";
      img.onclick = () => {
        window.open(img.src, '_blank');
      };
    });
  }, [content, comments]);

  const highlightNodes = (root: HTMLElement, quoteMap: Map<string, string>) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let node;
    while (node = walker.nextNode()) nodes.push(node);

    nodes.forEach(textNode => {
      let content = textNode.nodeValue || "";
      let parent = textNode.parentElement;
      if (!parent || parent.tagName === 'SCRIPT' || parent.classList.contains(styles.quoteHighlight)) return;

      for (const [quoteText, commentId] of quoteMap.entries()) {
        const index = content.indexOf(quoteText);
        if (index >= 0) {
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + quoteText.length);

          const span = document.createElement('span');
          span.className = styles.quoteHighlight;
          span.title = "댓글에서 인용됨 (클릭 시 이동)";
          span.onclick = (e) => {
            e.stopPropagation();
            const target = document.getElementById(`comment-${commentId}`);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              target.style.backgroundColor = 'rgba(186, 230, 253, 0.4)';
              setTimeout(() => target.style.backgroundColor = '', 2000);
            }
          };
          
          range.surroundContents(span);
          break; // Avoid overlapping for simplified version
        }
      }
    });
  };

  const sanitizedContent = useMemo(() => DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'span', 'div', 'figure', 'figcaption', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sub', 'sup'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'rel', 'width', 'height', 'data-*'],
    ALLOW_DATA_ATTR: true,
  }), [content]);

  return (
    <div 
      ref={contentRef}
      className={styles.content} 
      dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
    />
  );
}

