"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import Link from 'next/link';
import { useSearchParams } from "next/navigation";
import layoutStyles from '@/app/layout.module.css';

function LibraryContent() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [userComment, setUserComment] = useState("");
  
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search");
  const supabase = createClient();

  useEffect(() => {
    if (urlSearch && !search) {
      setSearch(urlSearch);
      setExpandedId(urlSearch);
    }
  }, [urlSearch]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Movie/Book Reviews (Category is 'movie' or 'book', or type was 'movie')
      // post_reviews table now stores 'movie' in category field via postManage actions
      const { data: editorData, error: mainError } = await supabase
        .from('post_reviews')
        .select(`
          id, subject, rating, comment, created_at, post_id, 
          place_id, address, category, embed_url,
          post:posts(id, title, author:profiles!author_id(display_name, avatar_url))
        `)
        .or('category.eq.movie,category.eq.book,address.ilike.%TMDB%')
        .order('created_at', { ascending: false });

      if (mainError) {
        console.error('Library Fetch Error Details:', JSON.stringify(mainError, null, 2));
      }

      // 2. Fetch User Reviews for these subjects
      const { data: userReviewsData } = await supabase
        .from('user_reviews')
        .select(`*, user:profiles(display_name, avatar_url)`)
        .order('created_at', { ascending: false });

      // 3. Process & Group Data
      const grouped: Record<string, any> = {};

      (editorData || []).forEach((p: any) => {
        const s = p.subject?.trim() || "Untitled";
        const key = s.toLowerCase();
        
        let tmdbRating = p.place_id && p.place_id.startsWith('movie-') ? null : p.place_id;
        if (p.address && p.address.includes('TMDB 평점')) {
          const match = p.address.match(/TMDB 평점 ([\d.]+)/);
          if (match) tmdbRating = match[1];
        }

        if (!grouped[key]) {
          grouped[key] = { 
            subject: s, 
            reviews: [], 
            userReviews: [], 
            avgRating: 0,
            imageUrl: (p.category === 'movie' && p.embed_url?.includes('google.com/maps')) ? null : p.embed_url, // 영화인데 구글맵 주소면 무시 (엑박 방지)
            tmdbRating: tmdbRating,
            category: p.category || (p.address?.includes('TMDB') ? 'movie' : 'book'),
            comment: p.comment,
            authorName: p.post?.author?.display_name || "익명 티끌러"
          };
        }
        grouped[key].reviews.push({
          id: p.id,
          post_id: p.post_id,
          review_subject: p.subject,
          review_rating: p.rating,
          review_comment: p.comment,
          created_at: p.created_at,
          author: p.post?.author || { display_name: "익명 티끌러" },
          post_title: p.post?.title
        });
        // Prefer poster if multiple reviews exist
        if (!grouped[key].imageUrl && p.embed_url) {
          const isJunkMovieUrl = p.category === 'movie' && p.embed_url.includes('google.com/maps');
          if (!isJunkMovieUrl) grouped[key].imageUrl = p.embed_url;
        }
      });

      if (userReviewsData) {
        userReviewsData.forEach((ur: any) => {
          const s = ur.subject?.trim() || "Untitled";
          const key = s.toLowerCase();
          if (grouped[key]) { // Only add user reviews for items already in editor library or created via editors
             grouped[key].userReviews.push(ur);
          }
        });
      }

      const subjectsArray = Object.values(grouped).map((g: any) => {
        const editorSum = g.reviews.reduce((acc: number, r: any) => acc + (Number(r.review_rating) || 0), 0);
        const userSum = g.userReviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
        const totalCount = g.reviews.length + g.userReviews.length;
        
        return {
          ...g,
          editorAvg: g.reviews.length > 0 ? (editorSum / g.reviews.length).toFixed(1) : "0.0",
          userAvg: g.userReviews.length > 0 ? (userSum / g.userReviews.length).toFixed(1) : "0.0",
          avgRating: totalCount > 0 ? ((editorSum + userSum) / totalCount).toFixed(1) : "0.0"
        };
      });

      setSubjects(subjectsArray);
    } catch (err) {
      console.error('Library Load Crash:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUserVote = async (subject: string) => {
    if (!userRating || !userComment.trim()) {
      alert("평점과 한줄평을 모두 입력해주세요.");
      return;
    }
    const { submitUserReview } = await import('../actions/reviews');
    const result = await submitUserReview(subject, userRating, userComment);
    if (result.success) {
      alert("리뷰가 등록되었습니다!");
      setUserRating(0);
      setUserComment("");
      fetchData();
    } else {
      alert(result.error);
    }
  };

  const filtered = subjects.filter(s => 
    s.subject.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating));

  return (
    <div className={layoutStyles.centeredContent}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}><span style={{ color: '#ff4804' }}>티끌</span> 라이브러리</h1>
          <p className={styles.subtitle}>티끌러들의 안목으로 수집한 명작과 기록들입니다.</p>
          
          <form className={styles.searchBox} onSubmit={(e) => e.preventDefault()}>
            <input 
              type="search"
              placeholder="영화, 도서 제목으로 검색..." 
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              suppressHydrationWarning
            />
          </form>
        </header>

        {isLoading ? (
          <div className={styles.loading}>라이브러리를 정리 중입니다...</div>
        ) : (
          <div className={styles.libraryGrid}>
            {filtered.length > 0 ? (
              filtered.map((item: any) => (
                <div 
                  key={item.subject} 
                  className={`${styles.workCard} ${expandedId === item.subject ? styles.expandedCard : ''}`}
                  onClick={() => setExpandedId(expandedId === item.subject ? null : item.subject)}
                >
                  <div className={styles.posterArea}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.subject} className={styles.posterImage} />
                    ) : (
                      <div className={styles.posterPlaceholder}>NO POSTER</div>
                    )}
                  </div>
                  
                  <div className={styles.workInfo}>
                    <div className={styles.userRatingBadge}>{item.avgRating}</div>
                    <h3 className={styles.workTitle}>{item.subject}</h3>
                    {item.comment && (
                      <p className={styles.representativeComment}>"{item.comment}"</p>
                    )}
                    <div className={styles.workMeta}>
                      {item.tmdbRating && (
                        <span className={styles.tmdbRating}>TMDB {item.tmdbRating}</span>
                      )}
                      <span className={styles.authorBadge}>{item.authorName}</span>
                    </div>
                  </div>

                  {expandedId === item.subject && (
                    <div className={styles.expandedContent} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.comparisonBox}>
                        <div className={styles.compRow}>
                          <span className={styles.compLabel}>티끌러 평점</span>
                          <span className={styles.compValue}>{item.editorAvg}</span>
                        </div>
                        <div className={styles.compRow}>
                          <span className={styles.compLabel}>유저 평점</span>
                          <span className={styles.compValue}>{item.userAvg}</span>
                        </div>
                      </div>

                      <div className={styles.reviewsList}>
                        {item.reviews.map((rev: any) => (
                          <div key={rev.id} className={styles.reviewSnippet}>
                            <div className={styles.snippetHeader}>
                              <span className={styles.snippetAuthor}>{rev.author.display_name}</span>
                              <span className={styles.snippetScore}>★ {rev.review_rating}</span>
                            </div>
                            <p className={styles.snippetText}>{rev.review_comment}</p>
                            <Link href={`/post/db-${rev.post_id}`} className={styles.goLink}>상세 보기 →</Link>
                          </div>
                        ))}
                      </div>

                      <div className={styles.voteForm}>
                        <div className={styles.voteRow}>
                          <select value={userRating} onChange={(e) => setUserRating(Number(e.target.value))} className={styles.miniSelect}>
                            <option value="0">평점</option>
                            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}점</option>)}
                          </select>
                          <button className={styles.miniVoteBtn} onClick={() => handleUserVote(item.subject)}>남기기</button>
                        </div>
                        <textarea 
                          placeholder="작품에 대한 짧은 한줄평을 남겨주세요." 
                          className={styles.miniTextarea}
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>검색 결과가 없습니다.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div>Loading Library...</div>}>
      <LibraryContent />
    </Suspense>
  );
}
