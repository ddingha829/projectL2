"use client";

import React from "react";
import styles from "./SectionLayout.module.css";

/**
 * SectionLayout — 모든 섹션의 공통 레이아웃 컴포넌트
 * 
 * UI_GUIDE.md 규격 준수:
 * - PC: margin-top 35px, title-content gap 8px
 * - Mobile: margin-top 12px, title-content gap 4px
 * - 첫 번째 섹션: margin-top 0
 * 
 * @example
 * <SectionLayout title="새로운" titleHighlight="티끌" moreHref="/?view=all">
 *   {children}
 * </SectionLayout>
 */

export interface SectionLayoutProps {
  /** 제목 텍스트 (포인트 컬러 이전 부분) */
  title: string;
  /** 포인트 컬러(#ff4804)로 표시될 키워드 */
  titleHighlight?: string;
  /** 제목 이후 추가 텍스트 (예: "러", " 모은 태산") */
  titleSuffix?: string;
  /** 커스텀 제목 렌더링 (복잡한 매거진 헤더 등) */
  customTitle?: React.ReactNode;
  /** more 버튼 클릭 핸들러 */
  onMoreClick?: () => void;
  /** more 버튼 링크 (Link 태그 대신 사용) */
  moreHref?: string;
  /** more 버튼 표시 여부 */
  showMore?: boolean;
  /** 첫 번째 섹션 여부 (margin-top: 0 적용) */
  isFirst?: boolean;
  /** 자식 요소 (카드 리스트 등) */
  children: React.ReactNode;
  /** 추가 className */
  className?: string;
  /** 섹션 전체를 감싸는 추가 스타일 */
  style?: React.CSSProperties;
  /** 콘텐츠 그리드에 적용할 className (기본 그리드 대신 커스텀 사용 시) */
  gridClassName?: string;
  /** 그리드 사용하지 않고 children 그대로 렌더링 */
  noGrid?: boolean;
  /** 헤더 영역에 추가 요소 삽입 */
  headerExtra?: React.ReactNode;
}

export default function SectionLayout({
  title,
  titleHighlight,
  titleSuffix,
  customTitle,
  onMoreClick,
  moreHref,
  showMore = false,
  isFirst = false,
  children,
  className,
  style,
  gridClassName,
  noGrid = false,
  headerExtra,
}: SectionLayoutProps) {
  const headerClass = `${styles.sectionHeader}${isFirst ? ` ${styles.isFirst}` : ""}`;

  const renderTitle = () => {
    if (customTitle) return customTitle;

    const titleContent = (
      <>
        {title}
        {titleHighlight && (
          <span className={styles.titleHighlight}>{titleHighlight}</span>
        )}
        {titleSuffix || ""}
        {(moreHref || onMoreClick) && (
          <span className={styles.sectionArrow}>❯</span>
        )}
      </>
    );

    if (moreHref) {
      return (
        <a href={moreHref} className={styles.sectionTitleLink}>
          <h2 className={styles.sectionTitle}>{titleContent}</h2>
        </a>
      );
    }

    if (onMoreClick) {
      return (
        <button onClick={onMoreClick} className={styles.sectionTitleBtn}>
          <h2 className={styles.sectionTitle}>{titleContent}</h2>
        </button>
      );
    }

    return (
      <h2 className={styles.sectionTitle}>
        {titleContent}
      </h2>
    );
  };

  return (
    <section className={className} style={style}>
      <header className={headerClass}>
        {renderTitle()}
        <div className={styles.headerSpacer} />
        {headerExtra}
      </header>
      {noGrid ? children : (
        <div className={gridClassName || styles.contentGrid}>
          {children}
        </div>
      )}
    </section>
  );
}
