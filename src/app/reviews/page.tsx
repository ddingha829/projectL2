"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import Link from 'next/link';
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ReviewArchiveContent() {
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
    const [{ data: postsData }, { data: userReviewsData }] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          id, 
          title, 
          review_subject, 
          review_rating, 
          review_comment, 
          created_at, 
          author:profiles!author_id(display_name, avatar_url)
        `)
        .not('review_subject', 'is', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_reviews')
        .select(`
          *, 
          user:profiles(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
    ]);
    
    if (postsData) {
      const grouped = postsData.reduce((acc: any, p: any) => {
        const s = p.review_subject?.trim() || "Untitled";
        const key = s.toLowerCase();
        if (!acc[key]) acc[key] = { subject: s, reviews: [], userReviews: [], avgRating: 0 };
        acc[key].reviews.push(p);
        return acc;
      }, {});

      if (userReviewsData) {
        userReviewsData.forEach((ur: any) => {
          const s = ur.subject?.trim() || "Untitled";
          const key = s.toLowerCase();
          if (!grouped[key]) {
            grouped[key] = { subject: s, reviews: [], userReviews: [], avgRating: 0 };
          }
          grouped[key].userReviews.push(ur);
        });
      }

      const subjectsArray = Object.values(grouped).map((g: any) => {
        const editorSum = g.reviews.reduce((acc: number, r: any) => acc + (Number(r.review_rating) || 0), 0);
        const userSum = g.userReviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
        
        const editorCount = g.reviews.length;
        const userCount = g.userReviews.length;
        
        return {
          ...g,
          editorAvg: editorCount > 0 ? (editorSum / editorCount).toFixed(1) : "0.0",
          userAvg: userCount > 0 ? (userSum / userCount).toFixed(1) : "0.0",
          avgRating: (editorCount + userCount) > 0 
            ? ((editorSum + userSum) / (editorCount + userCount)).toFixed(1) 
            : "0.0"
        };
      });

      console.log('Review Archive Data:', subjectsArray);
      setSubjects(subjectsArray);
    }
    setIsLoading(false);
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
      alert("리뷰가 성공적으로 등록되어 평균 점수에 반영되었습니다!");
      setUserRating(0);
      setUserComment("");
      fetchData();
    } else {
      alert(result.error);
    }
  };

  const filtered = subjects.filter(s => 
    s.subject.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (b.reviews.length + b.userReviews.length) - (a.reviews.length + a.userReviews.length));

  const activeSubject = expandedId 
    ? subjects.find(s => s.subject === expandedId) 
    : (filtered.length === 1 ? filtered[0] : null);

  const gridItems = activeSubject 
    ? subjects.filter(s => s.subject !== activeSubject.subject) 
    : filtered;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>평점 아카이브</h1>
        <p className={styles.subtitle}>에디터와 독자가 함께 완성하는 공간입니다.</p>
        <div className={styles.searchBox}>
          <input 
            type="text" 
            placeholder="작품 제목으로 검색..." 
            className={styles.searchInput}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (expandedId) setExpandedId(null);
            }}
          />
        </div>
      </header>

      {isLoading ? (
        <div className={styles.loading}>아카이브를 불러오는 중입니다...</div>
      ) : (
        <div className={styles.archiveWrapper}>
          {activeSubject && (
            <div className={styles.activeSection}>
              <div 
                className={`${styles.subjectCard} ${styles.activeCard}`}
              >
                <div className={styles.subjectMain}>
                  <div 
                    className={styles.subjectTop}
                    onClick={() => {
                      setExpandedId(null);
                      setSearch('');
                    }}
                  >
                    <h3 className={styles.subjectName}>{activeSubject.subject}</h3>
                    <div className={styles.metaWrapper}>
                      <div className={styles.subjectMeta}>
                        <div className={styles.avgBadgeLarge}>
                          {activeSubject.avgRating}
                        </div>
                        <span className={styles.reviewCount}>이용자 리뷰 {activeSubject.reviews.length + activeSubject.userReviews.length}개</span>
                      </div>
                      <span className={styles.expandIcon}>▴</span>
                    </div>
                  </div>

                  {/* Rating Infographic Section */}
                  <div className={styles.infographicBox}>
                    <div className={styles.infoTitle}>매체 전문가 vs 독자 만족도</div>
                    <div className={styles.comparisonGrid}>
                      <div className={styles.compItem}>
                        <div className={styles.compLabel}>에디터 평점</div>
                        <div className={styles.compValue} style={{ color: '#ff4804' }}>{activeSubject.editorAvg}</div>
                        <div className={styles.compBarBg}>
                          <div 
                            className={styles.compBarFill} 
                            style={{ width: `${Number(activeSubject.editorAvg) * 10}%`, backgroundColor: '#ff4804' }}
                          />
                        </div>
                      </div>
                      <div className={styles.vsIcon}>VS</div>
                      <div className={styles.compItem}>
                        <div className={styles.compLabel}>유저 평점</div>
                        <div className={styles.compValue} style={{ color: '#666' }}>{activeSubject.userAvg}</div>
                        <div className={styles.compBarBg}>
                          <div 
                            className={styles.compBarFill} 
                            style={{ width: `${Number(activeSubject.userAvg) * 10}%`, backgroundColor: '#666' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={styles.verdictRow}>
                      <div className={styles.verdictBadge}>
                        {Math.abs(Number(activeSubject.editorAvg) - Number(activeSubject.userAvg)) < 0.5 
                          ? "시각 일치: 전문가와 대중이 공통적으로 평가한 작품"
                          : Number(activeSubject.editorAvg) > Number(activeSubject.userAvg)
                            ? `전문가 호평: 대중보다 에디터가 ${(Number(activeSubject.editorAvg) - Number(activeSubject.userAvg)).toFixed(1)}점 더 높게 평가`
                            : `대중의 선택: 에디터보다 독자가 ${(Number(activeSubject.userAvg) - Number(activeSubject.editorAvg)).toFixed(1)}점 더 높게 평가`
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.reviewList}>
                  <div className={styles.reviewDivider}>에디터 평점</div>

                  {activeSubject.reviews.map((rev: any) => (
                    <div key={rev.id} className={styles.reviewItem}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewAuthorGroup}>
                            <div className={styles.authorAvatar}>
                              {rev.author?.avatar_url ? (
                                <img src={rev.author.avatar_url} alt="" />
                              ) : "👤"}
                            </div>
                            <span className={styles.authorName}>{rev.author?.display_name || "익명 에디터"}</span>
                          </div>
                          <div className={styles.ratingBox}>
                            <div className={styles.stars}>
                              {[1,2,3,4,5].map(i => (
                                <span key={i} style={{ color: (rev.review_rating >= i*2) ? '#ff4d4d' : '#ddd' }}>★</span>
                              ))}
                            </div>
                            <span className={styles.score}>{rev.review_rating}</span>
                          </div>
                        </div>
                        <p className={styles.reviewText}>{rev.review_comment}</p>
                        <div className={styles.reviewFooter}>
                           <span className={styles.date}>{new Date(rev.created_at).toLocaleDateString()}</span>
                           <Link href={`/post/db-${rev.id}`} className={styles.postLink}>원문 포스팅 보기 →</Link>
                        </div>
                    </div>
                  ))}

                  <div className={styles.userVoteBox}>
                    <h4 className={styles.userVoteTitle}>이 작품이 어떠셨나요?</h4>
                    <div className={styles.voteControls}>
                      <select 
                        className={styles.ratingSelect}
                        value={userRating}
                        onChange={(e) => setUserRating(Number(e.target.value))}
                      >
                        <option value="0">평점</option>
                        {[10,9,8,7,6,5,4,3,2,1].map(n => <option key={n} value={n}>{n}점</option>)}
                      </select>
                      <textarea 
                        placeholder="작품에 대한 한줄평을 남겨주세요." 
                        className={styles.voteTextarea}
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                      />
                      <button className={styles.voteBtn} onClick={() => handleUserVote(activeSubject.subject)}>참여하기</button>
                    </div>
                  </div>

                  {activeSubject.userReviews.length > 0 && (
                    <>
                      <div className={styles.reviewDivider}>유저 한줄평</div>
                      {activeSubject.userReviews.map((ur: any) => (
                        <div key={ur.id} className={`${styles.reviewItem} ${styles.userReviewItem}`}>
                           <div className={styles.reviewHeader}>
                              <div className={styles.reviewAuthorGroup}>
                                <div className={`${styles.authorAvatar} ${styles.userAvatarSmall}`}>
                                  {ur.user?.avatar_url ? (
                                    <img src={ur.user.avatar_url} alt="" />
                                  ) : "👤"}
                                </div>
                                <span className={styles.userReviewAuthor}>{ur.user?.display_name || "익명 유저"}</span>
                              </div>
                              <div className={styles.ratingBox}>
                                <span className={styles.userReviewScore}>★ {ur.rating}</span>
                              </div>
                           </div>
                           <p className={styles.userReviewText}>{ur.comment}</p>
                           <div className={styles.userReviewDay}>
                              {new Date(ur.created_at).toLocaleDateString()}
                           </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={styles.archiveGrid}>
            {gridItems.length > 0 ? (
              gridItems.map((group) => (
                <div key={group.subject} 
                  className={styles.brickCard}
                  onClick={() => {
                    setExpandedId(group.subject);
                    setSearch('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className={styles.brickHeader}>
                    <div className={styles.editorRating}>E {group.editorAvg}</div>
                    <div className={styles.userRating}>U {group.userAvg}</div>
                  </div>
                  <div className={styles.brickSubject}>{group.subject}</div>
                  <div className={styles.brickMeta}>한줄 평 수 {group.reviews.length + group.userReviews.length}</div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>검색된 결과가 없습니다.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewArchive() {
  return (
    <Suspense fallback={<div>Loading Reviews...</div>}>
      <ReviewArchiveContent />
    </Suspense>
  );
}
