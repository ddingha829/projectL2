import { createClient } from "@/lib/supabase/server";
import HomeContent from "./HomeContent";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const MOCK_AUTHORS = {
  chulsoo: { id: "chulsoo", name: "철수", color: "#FF3333", avatar: "👨" },
  younghee: { id: "younghee", name: "영희", color: "#33CCFF", avatar: "👩" },
  minsoo: { id: "minsoo", name: "민수", color: "#33FF99", avatar: "👦" },
  jieun: { id: "jieun", name: "지은", color: "#FF9933", avatar: "👧" },
};

export const MOCK_POSTS = [
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
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80",
    isEditorsPick: true
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
    imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80",
    isEditorsPick: true
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
  const searchFilter = resolvedParams?.search as string;

  const CATEGORY_MAP: Record<string, string> = {
    movie: "영화",
    book: "책",
    game: "게임",
    restaurant: "맛집",
    other: "기타",
    travel: "여행",
    exhibition: "전시회",
    notice: "공지사항"
  };

  const supabase = await createClient();
  
  // 1. Fetch Hero posts (designated by admin)
  const { data: heroDbPosts } = await supabase
    .from('posts')
    .select('*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets), comments(count)')
    .eq('is_hero', true)
    .order('hero_at', { ascending: false })
    .limit(3);

  // 2. Fetch all posts for the feed (excluding or including hero posts - user's preference usually separate them)
  const { data: dbPosts, error: dbError } = await supabase
    .from('posts')
    .select('*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets), comments(count)')
    .neq('category', 'notice')
    .order('created_at', { ascending: false });

  // 3. Fetch Recent Reviews (for the new section)
  const { data: reviewDbPosts } = await supabase
    .from('posts')
    .select('id, review_subject, review_rating, review_comment, created_at, author:profiles!author_id(display_name)')
    .not('review_subject', 'is', null)
    .order('created_at', { ascending: false })
    .limit(7);

  if (dbError) {
    console.error('Supabase fetch error:', dbError);
  }

  const mapToPost = (p: any) => {
    const strippedContent = p.content 
      ? p.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim() 
      : "내용이 없습니다.";
    const authorData = p.author || {};
    return {
      id: `db-${p.id}`,
      dbId: p.id,
      categoryId: p.category,
      category: CATEGORY_MAP[p.category] || p.category,
      title: p.title,
      content: strippedContent.substring(0, 150) + (strippedContent.length > 150 ? '...' : ''),
      author: {
        id: authorData.id || p.author_id || 'db-anon',
        name: authorData.name || '활발한 작가',
        avatar: authorData.avatar || '👤',
        color: '#0a467d',
        description: {
          bio: authorData.bio || '웹진에서 활발히 활동하는 작가입니다.',
          bullets: authorData.bullets || ['최신 리뷰 전문가']
        }
      },
      date: p.created_at, 
      displayDate: new Date(p.created_at).toLocaleDateString('ko-KR'),
      likes: p.likes_count || 0,
      comments: p.comments?.[0]?.count || 0,
      imageUrl: p.image_url || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=1600&q=80',
      isEditorsPick: p.is_editors_pick || false,
      isHero: p.is_hero || false,
      heroAt: p.hero_at,
      isFeature: p.is_feature || false,
      isPublic: p.is_public !== false
    };
  };

  // 4. Fetch Special Feature posts (is_feature = true)
  const { data: featureDbPosts } = await supabase
    .from('posts')
    .select('*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets:description_bullets), comments(count)')
    .eq('is_feature', true)
    .order('created_at', { ascending: false })
    .limit(3);

  const heroPosts = heroDbPosts?.map(mapToPost) || [];
  const livePosts = dbPosts?.map(mapToPost) || [];

  // Sort: DB posts (2026) always come before MOCK_POSTS (2024)
  const sortByDate = (a: any, b: any) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  };

  const normalMocks = MOCK_POSTS.map(m => ({ ...m, displayDate: m.date }));
  let allPosts = [...livePosts, ...normalMocks].sort(sortByDate);

  // If we have hero posts from DB, they will be used by HomeContent. 
  // If not, it falls back to slicing allPosts.
  const finalHeroPosts = heroPosts.length > 0 ? heroPosts : allPosts.slice(0, 3);
  const finalOtherPosts = heroPosts.length > 0 
    ? allPosts.filter(p => !heroPosts.find(h => h.id === p.id))
    : allPosts.slice(3);

  // Unified Filtering
  let filteredPosts = allPosts;
  if (categoryFilter && categoryFilter !== 'all') {
    filteredPosts = filteredPosts.filter(p => p.categoryId === categoryFilter);
  }
  if (authorFilter && authorFilter !== 'all') {
    filteredPosts = filteredPosts.filter(p => p.author.id === authorFilter);
  }
  if (searchFilter) {
    const lowerQuery = searchFilter.toLowerCase();
    filteredPosts = filteredPosts.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) || 
      p.content.toLowerCase().includes(lowerQuery)
    );
  }

  const animationKey = `${categoryFilter || 'all'}-${authorFilter || 'all'}-${searchFilter || 'all'}`;
  const isInitialVisit = !categoryFilter && !authorFilter && !searchFilter;

  // Title Logic
  const categoryName = categoryFilter ? CATEGORY_MAP[categoryFilter] || categoryFilter : "";
  const authorName = authorFilter && authorFilter !== 'all' ? (allPosts.find(p => p.author.id === authorFilter)?.author.name || "") : "";

  let displayTitle = "Home";
  if (searchFilter) {
    displayTitle = `'${searchFilter}' 검색 결과`;
  } else if (categoryFilter && categoryFilter !== 'all' && authorFilter) {
    displayTitle = `${authorName}님이 작성한 ${categoryName}`;
  } else if (categoryFilter && categoryFilter !== 'all') {
    displayTitle = categoryName;
  } else if (authorFilter && authorFilter !== 'all') {
    displayTitle = `${authorName} 에디터가 작성한 글`;
  }

  const mappedReviews = reviewDbPosts?.map((p: any) => ({
    id: p.id,
    subject: p.review_subject,
    rating: p.review_rating,
    comment: p.review_comment,
    date: p.created_at,
    authorName: (p.author?.display_name || '익명').substring(0, 3) + '***'
  })) || [];

  const featurePosts = featureDbPosts?.map(mapToPost) || [];

  // 5. Fetch User Profile for persistence
  const { data: { user } } = await supabase.auth.getUser();
  let userProfile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('preferred_view_type, preferred_m_cols, preferred_d_cols')
      .eq('id', user.id)
      .single();
    userProfile = data;
  }

  return (
    <Suspense fallback={<div>피드를 불러오는 중입니다...</div>}>
      <HomeContent 
        heroPosts={finalHeroPosts}
        otherPosts={finalOtherPosts}
        allPosts={allPosts}
        featurePosts={featurePosts}
        displayTitle={displayTitle}
        animationKey={animationKey}
        isInitialVisit={isInitialVisit}
        recentReviews={mappedReviews}
        userProfile={userProfile}
      />
    </Suspense>
  );
}
