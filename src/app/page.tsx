import { createClient } from "@/lib/supabase/server";
import HomeContent from "./HomeContent";
import { Suspense } from "react";
import { headers, cookies } from "next/headers";
import { getAdminStatus } from "@/app/actions/hero";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const MOCK_AUTHORS = {};

export const MOCK_POSTS: any[] = [];

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
    travel: "여행",
    exhibition: "전시회",
    other: "기타",
    feature: "기획전",
    notice: "공지사항"
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { isAdmin } = await getAdminStatus();
  
  // Helper for privacy filter
  const applyPrivacyFilter = (query: any) => {
    if (isAdmin) return query; // Admins see everything
    if (user) {
      return query.or(`is_public.eq.true,author_id.eq.${user.id}`);
    }
    return query.eq('is_public', true); // Guests only see public
  };

  // 1. Fetch Hero posts (designated by admin)
  let heroQuery = supabase
    .from('posts')
    .select('*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets), comments(count)')
    .eq('is_hero', true);
  
  heroQuery = applyPrivacyFilter(heroQuery);
  
  const { data: heroDbPosts } = await heroQuery
    .order('hero_at', { ascending: false })
    .limit(3);

  // 2. Fetch all posts for the feed
  let feedQuery = supabase
    .from('posts')
    .select('*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets), comments(count)')
    .neq('category', 'notice');

  feedQuery = applyPrivacyFilter(feedQuery);

  const { data: dbPosts, error: dbError } = await feedQuery
    .order('created_at', { ascending: false });

  // 3. Fetch Recent Reviews
  let reviewQuery = supabase
    .from('posts')
    .select('id, review_subject, review_rating, review_comment, created_at, author:profiles!author_id(display_name)')
    .not('review_subject', 'is', null);

  reviewQuery = applyPrivacyFilter(reviewQuery);

  const { data: reviewDbPosts } = await reviewQuery
    .order('created_at', { ascending: false })
    .limit(7);

  if (dbError) {
    console.error('Supabase fetch error:', dbError);
  }

  const mapToPost = (p: any) => {
    const strippedContent = p.content 
      ? p.content
          .replace(/<br\s*\/?>/gi, '\n') 
          .replace(/<\/p>/gi, '\n')      
          .replace(/<[^>]+>/g, '')       
          .replace(/&nbsp;/gi, ' ')
          .trim() 
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
  let featureQuery = supabase
    .from('posts')
    .select('*, author:profiles!author_id(id, name:display_name, avatar:avatar_url, bio, bullets), comments(count)')
    .or('is_feature.eq.true,category.eq.feature');

  featureQuery = applyPrivacyFilter(featureQuery);

  const { data: featureDbPosts } = await featureQuery
    .order('created_at', { ascending: false })
    .limit(3);

  const heroPosts = heroDbPosts?.map(mapToPost) || [];
  
  // 5. Fetch Editors (profiles with admin/editor roles)
  const { data: editorsData } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, bullets, role')
    .in('role', ['admin', 'editor'])
    .order('display_name');

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
    displayTitle = `${authorName} 티끌러가 작성한 글`;
  }

  const mappedReviews = reviewDbPosts?.map((p: any) => ({
    id: p.id,
    subject: p.review_subject,
    rating: p.review_rating,
    comment: p.review_comment,
    date: p.created_at,
    authorName: p.author?.display_name || '익명'
  })) || [];

  const featurePosts = featureDbPosts?.map(mapToPost) || [];

  // 5. Fetch User Profile for persistence
  let userProfile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('preferred_view_pc, preferred_view_mobile, preferred_view_type, preferred_m_cols, preferred_d_cols')
      .eq('id', user.id)
      .single();
    userProfile = data;
  }

  // 6. Device Detection (Server-side) to prevent flicker
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || "";
  const isMobileServer = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // 7. Read Preference from Cookie or Profile
  const cookieStore = await cookies();
  const cookieView = isMobileServer ? cookieStore.get('viewType_mobile')?.value : cookieStore.get('viewType_pc')?.value;
  
  const initialViewType = cookieView || 
    (isMobileServer 
      ? (userProfile?.preferred_view_mobile || userProfile?.preferred_view_type || 'card')
      : (userProfile?.preferred_view_pc || userProfile?.preferred_view_type || 'magazine'));

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
        isMobileServer={isMobileServer}
        initialViewType={initialViewType as any}
        editors={editorsData || []}
      />
    </Suspense>
  );
}
