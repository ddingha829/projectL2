import PostCard from "@/components/feed/PostCard";
import styles from "./page.module.css";

export const MOCK_AUTHORS = {
  chulsoo: { id: "chulsoo", name: "철수", color: "#FF3333", avatar: "👨" },
  younghee: { id: "younghee", name: "영희", color: "#33CCFF", avatar: "👩" },
  minsoo: { id: "minsoo", name: "민수", color: "#33FF99", avatar: "👦" },
  jieun: { id: "jieun", name: "지은", color: "#FF9933", avatar: "👧" },
  donghyun: { id: "donghyun", name: "동현", color: "#B833FF", avatar: "👱" },
};

const MOCK_POSTS = [
  {
    id: "1",
    categoryId: "movie",
    category: "Movie",
    title: "듄: 파트 2 (Dune: Part Two) - 압도적인 시각적 경험",
    content: "전작보다 훨씬 더 방대해진 스케일과 탄탄한 스토리텔링이 돋보입니다. 한스 짐머의 음악은 여전히 영화의 몰입도를 극대화합니다. 반드시 아이맥스에서 관람해야 하는 영화.",
    author: MOCK_AUTHORS.chulsoo,
    date: "2024-03-22",
    likes: 42,
    comments: 12,
    imageUrl: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "2",
    categoryId: "book",
    category: "Book",
    title: "사피엔스 - 인류의 기원을 추적하다",
    content: "유발 하라리의 통찰력이 돋보이는 명저. 역사, 과학, 철학을 넘나들며 인류가 어떻게 현재의 모습이 되었는지 설득력 있게 풀어냅니다. 생각할 거리를 많이 던져주는 책.",
    author: MOCK_AUTHORS.younghee,
    date: "2024-03-20",
    likes: 38,
    comments: 5,
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "3",
    categoryId: "restaurant",
    category: "Restaurant",
    title: "뉴욕 전통 스테이크 하우스 방문기",
    content: "완벽한 시어링, 육즙이 가득한 티본 스테이크. 거기에 클래식한 매쉬드 포테이토와 아스파라거스가 곁들여져 환상적인 저녁 식사였습니다. 특별한 기념일에 강력 추천합니다.",
    author: MOCK_AUTHORS.chulsoo,
    date: "2024-03-18",
    likes: 56,
    comments: 8,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "4",
    categoryId: "game",
    category: "Game",
    title: "젤다의 전설: 왕국의 눈물 리뷰",
    content: "전작의 훌륭한 시스템을 기반으로 상상력을 자극하는 '스크래빌드'가 추가되어 플레이 내내 지루할 틈이 없었습니다. 게임 역사에 남을 다시 없을 마스터피스.",
    author: MOCK_AUTHORS.minsoo,
    date: "2024-03-15",
    likes: 120,
    comments: 34,
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "5",
    categoryId: "other",
    category: "Other",
    title: "M3 맥북 프로 14인치 언박싱 및 1주일 사용기",
    content: "압도적인 성능 향상과 더 길어진 배터리 타임이 인상적입니다. 특히 영상 편집 렌더링 속도에서 체감이 아주 큽니다. 스페이스 블랙 느낌이 대박입니다.",
    author: MOCK_AUTHORS.jieun,
    date: "2024-03-10",
    likes: 85,
    comments: 21,
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "6",
    categoryId: "movie",
    category: "Movie",
    title: "오펜하이머 - 크리스토퍼 놀란의 걸작",
    content: "숨막히는 3시간이었습니다. 킬리언 머피의 연기와 사운드 트랙이 완벽하게 어우러졌습니다. 도덕적 딜레마를 심도있게 다룬 명작입니다.",
    author: MOCK_AUTHORS.donghyun,
    date: "2024-03-05",
    likes: 142,
    comments: 53,
    imageUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80"
  }
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const categoryFilter = resolvedParams?.category as string;
  const authorFilter = resolvedParams?.author as string;

  let filteredPosts = MOCK_POSTS;
  
  if (categoryFilter) {
    filteredPosts = filteredPosts.filter(p => p.categoryId === categoryFilter);
  }
  
  if (authorFilter) {
    filteredPosts = filteredPosts.filter(p => p.author.id === authorFilter);
  }

  const animationKey = `${categoryFilter || 'all'}-${authorFilter || 'all'}`;

  return (
    <div className={styles.container}>
      <header className={styles.feedHeader}>
        <h1 className={styles.pageTitle}>
          {categoryFilter || authorFilter ? 'Filtered Results' : 'News Feed'}
        </h1>
        <div className={styles.filterTags}>
          {categoryFilter && <span className={styles.tag}>Category: {categoryFilter}</span>}
          {authorFilter && <span className={styles.tag}>Author: {authorFilter}</span>}
        </div>
      </header>
      
      <div key={animationKey} className={styles.feedAnimator}>
        {filteredPosts.length > 0 ? (
          <div className={styles.postList}>
            {filteredPosts.map(post => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            <p>조건에 맞는 검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
