"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";
import Link from 'next/link';
import { useSearchParams } from "next/navigation";
import layoutStyles from '@/app/layout.module.css';
import 'leaflet/dist/leaflet.css';

function ReviewArchiveContent() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [userComment, setUserComment] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  
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
      // 1. Fetch Editor Reviews (Resiliently)
      let editorData: any[] = [];
      const { data: mainData, error: mainError } = await supabase
        .from('post_reviews')
        .select(`
          id, subject, rating, comment, created_at, post_id, 
          lat, lng, embed_url,
          post:posts(id, title, author:profiles!author_id(display_name, avatar_url))
        `)
        .order('created_at', { foreignTable: 'posts', ascending: false });

      if (mainError) {
        console.warn('Coordinates missing, using fallback query:', mainError);
        const { data: fallbackData } = await supabase
          .from('post_reviews')
          .select(`
            id, subject, rating, comment, created_at, post_id,
            post:posts(id, title, author:profiles!author_id(display_name, avatar_url))
          `)
          .order('created_at', { foreignTable: 'posts', ascending: false });
        editorData = fallbackData || [];
      } else {
        editorData = mainData || [];
      }

      // 2. Fetch User Reviews
      const { data: userReviewsData } = await supabase
        .from('user_reviews')
        .select(`*, user:profiles(display_name, avatar_url)`)
        .order('created_at', { ascending: false });

      // 3. Process & Group Data
      const grouped: Record<string, any> = {};

      editorData.forEach((p: any) => {
        const s = p.subject?.trim() || "Untitled";
        const key = s.toLowerCase();
        if (!grouped[key]) {
          grouped[key] = { subject: s, reviews: [], userReviews: [], avgRating: 0 };
        }
        grouped[key].reviews.push({
          id: p.id,
          post_id: p.post_id,
          review_subject: p.subject,
          review_rating: p.rating,
          review_comment: p.comment,
          created_at: p.created_at,
          lat: p.lat,
          lng: p.lng,
          embed_url: p.embed_url,
          author: p.post?.author || { display_name: "익명 티끌러" },
          post_title: p.post?.title
        });
      });

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

      // 4. Calculate Averages and Final Array
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
      console.error('Archive Data Load Crash:', err);
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
  ).sort((a, b) => (b.reviews.length + b.userReviews.length) - (a.reviews.length + a.userReviews.length));

  const activeSubject = expandedId 
    ? subjects.find(s => s.subject === expandedId) 
    : (filtered.length === 1 ? filtered[0] : null);

  const gridItems = activeSubject 
    ? filtered.filter(s => s.subject !== activeSubject.subject) 
    : filtered;

  // 1. Leaflet Map INITIALIZATION (Run Once)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Fast Refresh나 Strict Mode 대응: 이미 초기화된 컨테이너인지 확인
    const container = mapRef.current;
    if ((container as any)._leaflet_id) return;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        
        // 다시 한번 확인 (비동기 처리 중 중복 방지)
        if (!mapRef.current || mapInstanceRef.current || (container as any)._leaflet_id) return;

        // Leaflet 아이콘 기본 설정
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });

        // 한반도 전역 최적 뷰 설정
        const initialMap = L.map(container).setView([36.3, 127.8], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(initialMap);

        // 마커들을 관리할 전용 레이어 그룹 생성
        const markerGroup = L.layerGroup().addTo(initialMap);
        (initialMap as any)._markerGroup = markerGroup;

        mapInstanceRef.current = initialMap;
        setIsMapReady(true);

        // 레이아웃 보정 (사이즈 재계산)
        setTimeout(() => initialMap.invalidateSize(), 500);
      } catch (error) {
        console.error("Leaflet Init Error:", error);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // 의존성 없음: 지도 초기화는 한 번만

  // 2. Leaflet MARKERS UPDATE (Run when subjects change)
  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapInstanceRef.current || subjects.length === 0) return;
      
      const L = (await import('leaflet')).default;
      const initialMap = mapInstanceRef.current;
      const markerGroup = (initialMap as any)._markerGroup;

      if (!markerGroup) return;

      // 기존 핀들을 모두 닦아내고 새로 꽂습니다.
      markerGroup.clearLayers();
      const bounds = L.latLngBounds([]);
      let hasAnyMarker = false;

      subjects.forEach(s => {
        s.reviews.forEach((r: any) => {
          if (r.lat && r.lng) {
            const marker = L.circleMarker([r.lat, r.lng], {
              radius: 10, fillColor: "#ff4804", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9
            }).addTo(markerGroup);

            marker.bindPopup(`
              <div style="padding:10px; color:#1a202c; font-family:sans-serif; min-width:180px;">
                <h4 style="margin:0; font-weight:800; font-size:16px;">${s.subject}</h4>
                <p style="margin:5px 0; font-size:14px;">티끌러 평점: ★ ${s.editorAvg}</p>
                <button id="view-review-${s.subject.replace(/\s+/g, '-')}"
                        style="width:100%; padding:8px; background:#ff4804; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                  리뷰 리스트 보기
                </button>
              </div>
            `);

            marker.on('popupopen', () => {
              const btn = document.getElementById(`view-review-${s.subject.replace(/\s+/g, '-')}`);
              if (btn) {
                btn.onclick = () => {
                  window.dispatchEvent(new CustomEvent('map-select-subject', { detail: s.subject }));
                };
              }
            });

            bounds.extend([r.lat, r.lng]);
            hasAnyMarker = true;
          }
        });
      });

      // 필요한 경우 마커 전체가 보이도록 줌 조절 (현재는 한반도 전도 고정)
      // if (hasAnyMarker) initialMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    };

    updateMarkers();
  }, [subjects, isMapReady]);

  useEffect(() => {
    const handleMapSelect = (e: any) => {
      setExpandedId(e.detail);
      setSearch('');
      window.scrollTo({ top: 800, behavior: 'smooth' });
    };
    window.addEventListener('map-select-subject', handleMapSelect);
    return () => window.removeEventListener('map-select-subject', handleMapSelect);
  }, []);

  return (
    <div className={layoutStyles.centeredContent}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}><span style={{ color: '#ff4804' }}>티끌</span> 플레이스</h1>
          <p className={styles.subtitle}>티끌러와 독자가 함께 완성하는 지도입니다.</p>
          <div className={styles.mapContainer}>
            <div ref={mapRef} className={styles.mapCanvas} />
            {!isLoading && subjects.length > 0 && (
              <div className={styles.mapOverlayText}>
                🗺️ <strong>{subjects.filter(s => s.reviews.some((r:any) => r.lat)).length}</strong>개의 장소 핀이 꽂혀 있습니다.
              </div>
            )}
          </div>
          <form 
            className={styles.searchBox} 
            onSubmit={(e) => e.preventDefault()}
          >
            <input 
              type="search" /* type "search" instead of "text" for better mobile keyboard */
              placeholder="작품 제목으로 검색..." 
              className={styles.searchInput}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (expandedId) setExpandedId(null);
              }}
            />
          </form>
        </header>

        {isLoading ? (
          <div className={styles.loading}>아카이브를 불러오는 중입니다...</div>
        ) : (
          <div className={styles.archiveWrapper}>
            {activeSubject && (
              <div className={styles.activeSection}>
                <div className={`${styles.subjectCard} ${styles.activeCard}`}>
                  <div className={styles.subjectMain}>
                    <div className={styles.subjectTop} onClick={() => { setExpandedId(null); setSearch(''); }}>
                      <h3 className={styles.subjectName}>{activeSubject.subject}</h3>
                      <div className={styles.metaWrapper}>
                        <div className={styles.subjectMeta}>
                          <div className={styles.avgBadgeLarge}>{activeSubject.avgRating}</div>
                          <span className={styles.reviewCount}>리뷰 {activeSubject.reviews.length + activeSubject.userReviews.length}개</span>
                        </div>
                        <span className={styles.expandIcon}>▴</span>
                      </div>
                    </div>
                    <div className={styles.infographicBox}>
                      <div className={styles.infoTitle}>티끌러 vs 유저 평점</div>
                      <div className={styles.comparisonGrid}>
                        <div className={styles.compItem}>
                          <div className={styles.compLabel}>티끌러 평점</div>
                          <div className={styles.compValue} style={{ color: '#204bb8' }}>{activeSubject.editorAvg}</div>
                          <div className={styles.compBarBg}><div className={styles.compBarFill} style={{ width: `${Number(activeSubject.editorAvg) * 20}%`, backgroundColor: '#204bb8' }} /></div>
                        </div>
                        <div className={styles.vsIcon}>VS</div>
                        <div className={styles.compItem}>
                          <div className={styles.compLabel}>유저 평점</div>
                          <div className={styles.compValue} style={{ color: '#666' }}>{activeSubject.userAvg}</div>
                          <div className={styles.compBarBg}><div className={styles.compBarFill} style={{ width: `${Number(activeSubject.userAvg) * 20}%`, backgroundColor: '#666' }} /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.reviewList}>
                    <div className={styles.reviewDivider}>티끌러 평점</div>
                    {activeSubject.reviews.map((rev: any) => (
                      <div key={rev.id} className={styles.reviewItem}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewAuthorGroup}>
                            <div className={styles.authorAvatar}>{rev.author?.avatar_url ? <img src={rev.author.avatar_url} alt="" /> : "👤"}</div>
                            <span className={styles.authorName}>{rev.author?.display_name || "익명 티끌러"}</span>
                          </div>
                          <div className={styles.ratingBox}>
                            <div className={styles.stars}>
                              {[1, 2, 3, 4, 5].map(i => {
                                const fill = Math.min(Math.max(rev.review_rating - (i - 1), 0), 1) * 100;
                                return (
                                  <span key={i} className={styles.starWrapper}>
                                    <span className={styles.starBase}>★</span>
                                    <span className={styles.starFill} style={{ width: `${fill}%` }}>★</span>
                                  </span>
                                );
                              })}
                            </div>
                            <span className={styles.score}>{rev.review_rating}</span>
                          </div>
                        </div>
                        <p className={styles.reviewText}>{rev.review_comment}</p>
                        <div className={styles.reviewFooter}>
                          <span className={styles.date}>{new Date(rev.created_at).toLocaleDateString()}</span>
                          <Link href={`/post/db-${rev.post_id}`} className={styles.postLink}>원문 티끌 보기 →</Link>
                        </div>
                      </div>
                    ))}

                    {activeSubject.userReviews.length > 0 && (
                      <>
                        <div className={styles.reviewDivider}>유저 평점</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                          {activeSubject.userReviews.map((ur: any) => (
                            <div key={ur.id} className={`${styles.reviewItem} ${styles.userReviewItem}`}>
                              <div className={styles.reviewHeader}>
                                <div className={styles.reviewAuthorGroup}>
                                  <div className={styles.userAvatarSmall}>👤</div>
                                  <span className={styles.userReviewAuthor}>{ur.user?.display_name || "익명 독자"}</span>
                                </div>
                                <div className={styles.userReviewScore}>★ {ur.rating}</div>
                              </div>
                              <p className={styles.userReviewText}>{ur.comment}</p>
                              <div className={styles.userReviewDay}>{new Date(ur.created_at).toLocaleDateString()}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className={styles.userVoteBox}>
                      <h4 className={styles.userVoteTitle}>이 작품이 어떠셨나요?</h4>
                      <div className={styles.voteControls}>
                        <select className={styles.ratingSelect} value={userRating} onChange={(e) => setUserRating(Number(e.target.value))}>
                          <option value="0">평점</option>
                          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}점</option>)}
                        </select>
                        <textarea placeholder="작품에 대한 한줄평을 남겨주세요." className={styles.voteTextarea} value={userComment} onChange={(e) => setUserComment(e.target.value)} />
                        <button className={styles.voteBtn} onClick={() => handleUserVote(activeSubject.subject)}>참여하기</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className={styles.archiveGrid}>
              {gridItems.length > 0 ? (
                gridItems.map((group: any) => (
                  <div key={group.subject} className={styles.brickCard} onClick={() => { setExpandedId(group.subject); setSearch(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <div className={styles.brickHeader}>
                      <div className={styles.editorRating}>E {group.editorAvg}</div>
                      <div className={styles.userRating}>U {group.userAvg}</div>
                    </div>
                    <div className={styles.brickSubject}>{group.subject}</div>
                    <div className={styles.brickMeta}>리뷰 {group.reviews.length + group.userReviews.length}개</div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>결과가 없습니다.</div>
              )}
            </div>
          </div>
        )}
      </div>
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
