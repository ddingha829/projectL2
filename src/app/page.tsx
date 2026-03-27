// Test server stability
import { createClient } from "@/lib/supabase/server";
import HomeContent from "./HomeContent";
import { Suspense } from "react";

export const MOCK_AUTHORS = {
  chulsoo: { id: "chulsoo", name: "철수", color: "#FF3333", avatar: "👨" },
  younghee: { id: "younghee", name: "영희", color: "#33CCFF", avatar: "👩" },
  minsoo: { id: "minsoo", name: "민수", color: "#33FF99", avatar: "👦" },
  jieun: { id: "jieun", name: "지은", color: "#FF9933", avatar: "👧" },
  donghyun: { id: "donghyun", name: "동현", color: "#B833FF", avatar: "👱" },
};

export const MOCK_POSTS = [
  // ... MOCK_POSTS stay the same, skipping for brevity in thought but including in output
  {
    id: "1",
    categoryId: "movie",
    category: "영화",
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
    category: "책",
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
    category: "맛집",
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
    category: "게임",
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
    category: "기타",
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
    category: "영화",
    title: "오펜하이머 - 크리스토퍼 놀란의 걸작",
    content: "숨막히는 3시간이었습니다. 킬리언 머피의 연기와 사운드 트랙이 완벽하게 어우러졌습니다. 도덕적 딜레마를 심도있게 다룬 명작입니다.",
    author: MOCK_AUTHORS.donghyun,
    date: "2024-03-05",
    likes: 142,
    comments: 53,
    imageUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "7",
    categoryId: "restaurant",
    category: "맛집",
    title: "성수동 핫플레이스 카페 탐방기",
    content: "감각적인 인테리어와 직접 로스팅한 원두가 매력적인 곳. 바질 토마토 에이드와 크루아상의 조합이 생각보다 훨씬 훌륭했습니다.",
    author: MOCK_AUTHORS.jieun,
    date: "2024-03-02",
    likes: 64,
    comments: 15,
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "8",
    categoryId: "book",
    category: "책",
    title: "기분이 태도가 되지 않게 - 심리학 에세이",
    content: "감정 컨트롤이 서툰 어른들을 위한 조언들. 실질적인 상황 대처법보다는 마음가짐에 대한 따뜻한 위로를 건네주는 책입니다.",
    author: MOCK_AUTHORS.younghee,
    date: "2024-02-28",
    likes: 45,
    comments: 9,
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "9",
    categoryId: "game",
    category: "게임",
    title: "엘든 링: 황금 나무의 그림자 기대평",
    content: "트레일러에서 공개된 압도적인 보스들과 새로운 무기군들을 보니 잠이 안 옵니다. 프롬 소프트웨어의 정점은 어디일지 기대됩니다.",
    author: MOCK_AUTHORS.minsoo,
    date: "2024-02-25",
    likes: 89,
    comments: 42,
    imageUrl: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "10",
    categoryId: "other",
    category: "기타",
    title: "데스크테리어 추천 아이템 5가지",
    content: "생산성을 높여주는 깔끔한 데스크 환경 구축하기. 모니터 암부터 기계식 키보드까지, 실제로 써보고 만족한 아이템들만 모았습니다.",
    author: MOCK_AUTHORS.chulsoo,
    date: "2024-02-22",
    likes: 72,
    comments: 18,
    imageUrl: "https://images.unsplash.com/photo-1491333078588-55b6733c79e0?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "11",
    categoryId: "movie",
    category: "영화",
    title: "파묘 - 한국적 오컬트의 새로운 지평",
    content: "최민식, 김고은의 신들린 연기와 장재현 감독의 디테일한 연출이 만나 최고의 몰입감을 선사합니다. 민속 신앙과 역사적 아픔을 잘 녹여냈습니다.",
    author: MOCK_AUTHORS.jieun,
    date: "2024-02-20",
    likes: 156,
    comments: 67,
    imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "12",
    categoryId: "restaurant",
    category: "맛집",
    title: "일본 도쿄 오마카세 예약 팁과 후기",
    content: "웨이팅 없이 현지인들만 아는 가성비 오마카세를 예약하는 방법. 신선한 네타와 샤리의 조화가 일품이었던 롯폰기의 보석 같은 곳.",
    author: MOCK_AUTHORS.donghyun,
    date: "2024-02-15",
    likes: 93,
    comments: 29,
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "13",
    categoryId: "book",
    category: "책",
    title: "불편한 편의점 - 따뜻한 위로의 공간",
    content: "우리 주변 어디에나 있을 법한 사람들의 이야기를 담백하고 가슴 찡하게 풀어낸 소설. 읽는 내내 마음이 포근해지는 기분이 매력적입니다.",
    author: MOCK_AUTHORS.younghee,
    date: "2024-02-12",
    likes: 58,
    comments: 11,
    imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "14",
    categoryId: "game",
    category: "게임",
    title: "사이버펑크 2077: 팬텀 리버티 구매 가이드",
    content: "출시 초기의 오명을 씻어낸 완벽한 확장팩. 나이트 시티의 새로운 구역 '도그 타운'에서 벌어지는 첩보물 스타일의 스토리가 일품입니다.",
    author: MOCK_AUTHORS.minsoo,
    date: "2024-02-08",
    likes: 104,
    comments: 31,
    imageUrl: "https://images.unsplash.com/photo-1605898960710-990710ba5232?auto=format&fit=crop&w=1600&q=80"
  },
  {
    id: "15",
    categoryId: "other",
    category: "기타",
    title: "나 홀로 오사카 3박 4일 여행 코스 추천",
    content: "계획 없이 떠나도 망하지 않는 오사카 여행 가이드. 도톤보리의 활기참과 교토의 고즈넉함을 동시에 느낄 수 있는 효율적인 동선 공유.",
    author: MOCK_AUTHORS.chulsoo,
    date: "2024-02-05",
    likes: 77,
    comments: 24,
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80"
  }
];

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const categoryFilter = resolvedParams?.category as string;
  const authorFilter = resolvedParams?.author as string;
  const searchFilter = resolvedParams?.search as string;

  const CATEGORY_MAP: Record<string, string> = {
    movie: "영화",
    book: "책",
    game: "게임",
    restaurant: "맛집",
    other: "기타"
  };

  const supabase = await createClient();
  let query = supabase
    .from('posts')
    .select('*, author:profiles(id, name:display_name, avatar:avatar_url, bio, bullets:description_bullets)')
    .order('created_at', { ascending: false });

  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
  }
  if (authorFilter) {
    query = query.eq('author_id', authorFilter);
  }
  if (searchFilter) {
    query = query.ilike('title', `%${searchFilter}%`);
  }

  const { data: dbPosts } = await query;

  const livePosts = dbPosts?.map((p: any) => {
    const strippedContent = p.content ? p.content.replace(/<[^>]+>/g, '') : "내용이 없습니다.";
    const authorData = p.author || {};
    return {
      id: `db-${p.id}`,
      categoryId: p.category,
      category: CATEGORY_MAP[p.category] || p.category,
      title: p.title,
      content: strippedContent.substring(0, 150) + (strippedContent.length > 150 ? '...' : ''),
      author: {
        id: authorData.id || 'db-anon',
        name: authorData.name || '익명 작가',
        avatar: authorData.avatar || '👤',
        color: '#0a467d',
        description: {
          bio: authorData.bio || '활동 중인 작가입니다.',
          bullets: authorData.bullets || ['신규 작가']
        }
      },
      date: new Date(p.created_at).toISOString().split('T')[0],
      rawDate: p.created_at, // Use full timestamp for internal sorting
      likes: p.likes_count || 0,
      comments: 0,
      imageUrl: p.image_url || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1600&q=80'
    };
  }) || [];

  // Sort function to handle both raw ISO strings and mock dates
  const sortByDate = (a: any, b: any) => {
    return new Date(b.rawDate || b.date).getTime() - new Date(a.rawDate || a.date).getTime();
  };

  // Combine live and mock data, sorting by newest first
  let filteredPosts = [...livePosts, ...MOCK_POSTS].sort(sortByDate);
  
  // Apply filtering to the combined list
  if (categoryFilter) {
    filteredPosts = filteredPosts.filter(p => p.categoryId === categoryFilter);
  }
  if (authorFilter) {
    filteredPosts = filteredPosts.filter(p => p.author.id === authorFilter);
  }
  if (searchFilter) {
    const lowerQuery = (searchFilter as string).toLowerCase();
    filteredPosts = filteredPosts.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.content.toLowerCase().includes(lowerQuery)
    );
  }

  const animationKey = `${categoryFilter || 'all'}-${authorFilter || 'all'}-${searchFilter || 'all'}`;
  const isInitialVisit = !categoryFilter && !authorFilter && !searchFilter;

  const categoryName = categoryFilter ? CATEGORY_MAP[categoryFilter as string] || categoryFilter : "";
  const authorObj = MOCK_AUTHORS[authorFilter as keyof typeof MOCK_AUTHORS];
  const authorName = authorObj ? authorObj.name : "";

  let displayTitle = "Home";
  if (searchFilter) {
    displayTitle = `'${searchFilter}' 검색 결과`;
  } else if (categoryFilter && authorFilter) {
    displayTitle = `${authorName}님이 작성한 ${categoryName}`;
  } else if (categoryFilter) {
    displayTitle = categoryName;
  } else if (authorFilter) {
    displayTitle = `${authorName}님의 리뷰`;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent 
        key={animationKey}
        filteredPosts={filteredPosts} 
        displayTitle={displayTitle} 
        animationKey={animationKey}
        isInitialVisit={isInitialVisit}
      />
    </Suspense>
  );
}
