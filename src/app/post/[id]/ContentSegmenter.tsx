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

    const el = contentRef.current;

    // 1. Basic segments
    const children = el.children;
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
      highlightNodes(el, quoteMap);
    }

    // 3. Image click handling
    const images = el.querySelectorAll('img');
    images.forEach(img => {
      img.style.cursor = 'zoom-in';
      img.title = "클릭하여 원본 이미지 보기";
      img.onclick = () => {
        window.open(img.src, '_blank');
      };
    });

    // 4. Review Card Stars Hydration & Link Handling
    const reviewCards = el.querySelectorAll('.ql-review-card');
    reviewCards.forEach(card => {
      const rating = Number(card.getAttribute('data-rating')) || 0;
      const scoreBadge = card.querySelector('.score-badge');
      const existingStars = card.querySelector('.score-stars-box');
      
      // A. 별점 보충 (Old Posts)
      if (scoreBadge && !existingStars) {
        const starsHtml = [1, 2, 3, 4, 5].map(s => {
          const diff = rating - (s - 1);
          const fillPercent = Math.max(0, Math.min(100, diff * 100));
          return `<div class="star-mini-wrapper" style="position:relative;display:inline-block;width:13px;height:13px;margin-right:0;"><svg viewBox="0 0 24 24" width="13" height="13" fill="#FFFFFF"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><div style="position:absolute;top:0;left:0;width:${fillPercent}%;overflow:hidden;"><svg viewBox="0 0 24 24" width="13" height="13" fill="#FF4804"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></div></div>`;
        }).join('');

        const starsBox = document.createElement('div');
        starsBox.className = 'score-stars-box';
        starsBox.innerHTML = starsHtml;
        
        let scoreColumn = card.querySelector('.score-column') as HTMLElement;
        if (!scoreColumn) {
          scoreColumn = document.createElement('div');
          scoreColumn.className = 'score-column';
          scoreColumn.style.display = 'flex';
          scoreColumn.style.flexDirection = 'column';
          scoreColumn.style.alignItems = 'center';
          scoreColumn.style.gap = '6px';
          scoreColumn.style.marginLeft = 'auto';
          scoreColumn.style.flexShrink = '0';
          
          if (scoreBadge.parentNode) {
            scoreBadge.parentNode.replaceChild(scoreColumn, scoreBadge);
            scoreColumn.appendChild(scoreBadge);
            scoreColumn.appendChild(starsBox);
          }
        } else {
          scoreColumn.appendChild(starsBox);
        }
      }

      // B. 오른쪽 내용 영역(.review-card-body) 클릭 시 구글 지도로 이동
      const cardBody = card.querySelector('.review-card-body') as HTMLElement;
      if (cardBody) {
        const lat = card.getAttribute('data-lat');
        const lng = card.getAttribute('data-lng');
        const placeName = card.getAttribute('data-place-name');
        const placeId = card.getAttribute('data-place-id') || '';
        
        const isManual = placeId === 'manual';

        // 이미 <a> 태그인 경우(신규 게시물)는 브라우저 기본 동작에 맡기고 스타일만 확인
        // <div> 인 경우(기존 게시물)는 직접 클릭 이벤트 주입
        if (cardBody.tagName !== 'A' && !isManual) {
          cardBody.style.cursor = 'pointer';
          cardBody.title = '구글 지도에서 크게 보기';
          
          cardBody.onclick = () => {
            // 장소명과 Place ID를 우선 사용 (업체 직접 연결)
            let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName || '')}`;
            if (placeId && placeId !== 'manual') {
              url += `&query_place_id=${placeId}`;
            } else if (lat && lng) {
              // Place ID가 없는 매뉴얼 등록의 경우 좌표 활용
              url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            }
            window.open(url, '_blank');
          };

          // 호버 시 시각적 효과 (검색된 장소만)
          cardBody.onmouseenter = () => {
            cardBody.style.backgroundColor = 'var(--bg-secondary)';
            cardBody.style.transition = 'background-color 0.2s ease';
          };
          cardBody.onmouseleave = () => {
            cardBody.style.backgroundColor = '#fff';
          };
        } else if (cardBody.tagName === 'A' && !isManual) {
          // <a> 태그라도 커서와 툴팁은 확실히 보장
          cardBody.style.cursor = 'pointer';
          if (!cardBody.title) cardBody.title = '구글 지도에서 크게 보기';

          // 호버 시 시각적 효과
          cardBody.onmouseenter = () => {
            cardBody.style.backgroundColor = 'var(--bg-secondary)';
            cardBody.style.transition = 'background-color 0.2s ease';
          };
          cardBody.onmouseleave = () => {
            cardBody.style.backgroundColor = '#fff';
          };
        } else {
          // 직접 입력(Manual)인 경우 커서와 스타일 초기화
          cardBody.style.cursor = 'default';
          cardBody.removeAttribute('title');
          cardBody.onmouseenter = null;
          cardBody.onmouseleave = null;
          if (cardBody.tagName === 'A') {
              // 혹시 수동인데 A태그면 링크 무효화
              (cardBody as any).onclick = (e: MouseEvent) => e.preventDefault();
          }
        }
      }
    });
  }, [content, comments]);

  const highlightNodes = (root: HTMLElement, quoteMap: Map<string, string>) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let node;
    while (node = walker.nextNode()) nodes.push(node);

    nodes.forEach(textNode => {
      let nodeContent = textNode.nodeValue || "";
      let parent = textNode.parentElement;
      if (!parent || parent.tagName === 'SCRIPT' || parent.classList.contains(styles.quoteHighlight)) return;

      for (const [quoteText, commentId] of quoteMap.entries()) {
        const index = nodeContent.indexOf(quoteText);
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
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sub', 'sup', 'iframe', 'button',
      'svg', 'path', 'circle', 'rect', 'defs', 'linearGradient', 'stop'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'rel', 'width', 'height', 'data-*', 'frameborder', 'allowfullscreen', 'onclick',
      'viewBox', 'fill', 'd', 'cx', 'cy', 'r', 'x', 'y', 'offset', 'stop-color', 'stop-opacity'],
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['style', 'class']
  }), [content]);

  return (
    <div 
      ref={contentRef}
      className={styles.content} 
      dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
    />
  );
}
