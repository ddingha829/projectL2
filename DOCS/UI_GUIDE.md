# 📐 Ticgle 표준 간격 & UI 가이드라인

이 문서는 티끌(Ticgle)의 고밀도 매거진 스타일 인터페이스를 유지하기 위한 **표준 디자인 시스템**을 정의합니다. 
앞으로 모든 신규 개발 및 스타일 수정은 하드코딩된 예외처리를 지양하고 본 가이드의 통합 시스템과 공통 컴포넌트를 최우선으로 재사용합니다.

---

## 1. 섹션 컴포넌트 & 간격 시스템 (Single Source of Truth)
모든 섹션의 제목, 간격, 기본 레이아웃은 개별 CSS 작성 대신 **`components/shared/SectionLayout.tsx`**를 재사용하여 통일합니다.

*   **PC 버전**: `margin-top 35px`, 제목-콘텐츠 간격 `8px`, 제목 폰트 `2.44rem`
*   **모바일 버전**: `margin-top 12px`, 제목-콘텐츠 간격 `4px`, 제목 폰트 `1.42rem`
*   **최상단 섹션**: `margin-top: 0` (`isFirst` prop 사용)
*   모든 타이틀(`.sectionTitle`)은 `margin: 0`, `padding: 0`을 기본으로 하며, 포인트 컬러(`#ff4804`)는 `span` 태그나 `titleHighlight` prop을 통해 적용합니다.

---

## 2. 카드 디자인 및 그리드 규격 (Card & Grid Specifications)
PC와 모바일 양쪽에서 C카드(새로운 티끌), 리뷰 카드(한줄평), 에디터 카드의 폭과 정렬은 반드시 일치해야 합니다.

### PC 레이아웃 (5열 그리드 통일)
*   **간격 (Gap)**: `14px`로 통일 (기존 16px 혼용 금지)
*   **카드 폭**: 5열 그리드 기반 분배. flex 요소의 경우 `flex: 0 0 calc(20% - 11.2px)`를 적용하여 `.editorsGrid` (C카드)와 일치시킵니다.

### 모바일 레이아웃 (가로 스크롤 동기화)
*   **간격 (Gap)**: `12px` 통일
*   **카드 폭 (Flex-basis)**: 가로 스크롤 내 카드(C카드, 리뷰, 에디터)는 일괄적으로 **`55%`** (`flex: 0 0 55% !important; width: 55% !important;`)를 차지합니다.
*   **Box-sizing**: 카드 폭 왜곡을 막기 위해 모든 카드는 `box-sizing: border-box !important;`를 명시합니다.
*   **Hover 효과 제거**: 터치 디바이스에서의 버그를 막기 위해 모바일 미디어 쿼리 내에서는 카드의 hover 애니메이션(`transition: none`)을 비활성화합니다.

### A카드 (Hero/Main) 특칙
*   **비율**: `4 : 4.2` (`aspect-ratio: 4 / 4.2`)
*   **내용**: 최대 **2줄** 제한 (말줄임표 처리)

---

## 3. CSS 작성 원칙 및 정렬 기준 (Clean Code)
1.  **전역 여백 의존 (Baseline Alignment)**: 
    * 가로 스크롤 컨테이너(`.horizontalScrollMobile`, `.reviewHorizontalGrid` 등) 자체에 좌우 `padding`을 넣지 마세요. 
    * 이미 전역 래퍼인 `.centeredContent`가 모바일 좌우 여백(`22px`)을 제공하므로, 스크롤 컨테이너의 패딩을 제거해야 모든 섹션의 시작선(Baseline)이 완벽히 일치합니다.
2.  **개별 하드코딩 금지**: 
    * 특정 페이지나 컴포넌트만을 위한 임의의 `padding`, `margin`, 인라인 스타일 지양.
    * 디자인 변경이 필요하면 개별 코드가 아닌 **공통 클래스와 디자인 토큰(글로벌 CSS 변수)**을 수정해 전체 시스템을 동기화하세요.
3.  **카드 Footer 하단 고정**: 
    * 카드 내부 텍스트 길이가 달라도 하단 요소(링크, 아이콘 등)는 항상 맨 밑에 붙도록, 푸터 영역에 `margin-top: auto`를 적용합니다.

---

*최종 업데이트: 2026. 04. 29.*
