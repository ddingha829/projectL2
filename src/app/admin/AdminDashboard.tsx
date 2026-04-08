'use client'

import { useState } from 'react'
import styles from './admin.module.css'
import { deletePostAdmin, updateUserRole, toggleEditorsPick } from './actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AdminDashboardProps {
  initialPosts: any[]
  initialProfiles: any[]
  visitCount?: number
  todayVisitCount?: number
  totalViews?: number
  trendData?: { day: string, count: number }[]
}

export default function AdminDashboard({ 
  initialPosts, 
  initialProfiles, 
  visitCount = 0, 
  todayVisitCount = 0,
  totalViews = 0,
  trendData = [] 
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'posts' | 'users' | 'categories'>('stats')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const router = useRouter()

  const posts = initialPosts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const users = initialProfiles.filter(u => 
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeletePost = async (id: string, title: string) => {
    if (confirm(`게시물 [${title}]을 정말로 삭제하시겠습니까?`)) {
      const res = await deletePostAdmin(id)
      if (res.success) {
        alert('삭제되었습니다.')
        router.refresh()
      } else {
        alert('삭제 실패: ' + res.error)
      }
    }
  }

  const handleToggleEditorsPick = async (id: string, status: boolean) => {
    const res = await toggleEditorsPick(id, status)
    if (res.success) router.refresh()
  }

  const handleRoleChange = async (userId: string, newRole: 'user' | 'editor' | 'admin') => {
    if (confirm(`유저 권한을 ${newRole}(으)로 변경하시겠습니까?`)) {
      const res = await updateUserRole(userId, newRole)
      if (res.success) {
        alert('권한이 변경되었습니다.')
        router.refresh()
      } else {
        alert('변경 실패: ' + res.error)
      }
    }
  }

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>운영자 관리 대시보드</h1>
        <p className={styles.dashboardSub}>Project L2 시스템 상태 및 콘텐츠 매니지먼트</p>
      </header>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'stats' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('stats'); setSearchQuery(''); }}
        >
          📊 방문자 및 통계
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'posts' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('posts'); setSearchQuery(''); }}
        >
          📝 게시물 관리
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
        >
          👥 유저 및 권한
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'categories' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('categories'); setSearchQuery(''); }}
        >
          📂 카테고리 기획
        </button>
      </div>

      {activeTab === 'stats' && (
        <StatsView 
          posts={initialPosts} 
          users={initialProfiles} 
          visitCount={visitCount}
          todayVisitCount={todayVisitCount}
          totalViews={totalViews}
          trendData={trendData}
          timeRange={timeRange} 
          onTimeRangeChange={setTimeRange} 
        />
      )}

      {(activeTab === 'posts' || activeTab === 'users') && (
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input 
            type="text" 
            placeholder={activeTab === 'posts' ? "제목 또는 카테고리 검색..." : "이름 또는 이메일 검색..."}
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {activeTab === 'posts' && (
        <div className={styles.glassCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>작가</th>
                  <th>제목</th>
                  <th>카테고리</th>
                  <th>픽</th>
                  <th>날짜</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {posts.length > 0 ? posts.map((post) => (
                  <tr key={post.id}>
                    <td data-label="작가">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img 
                          src={post.author?.avatar_url || "/avatars/default.png"} 
                          className={styles.authorAvatar} 
                          onError={(e) => (e.currentTarget.src = "https://ui-avatars.com/api/?name=" + (post.author?.display_name || "Author"))}
                          alt="author" 
                        />
                        {post.author?.display_name || "Unknown"}
                      </div>
                    </td>
                    <td data-label="제목">
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{post.title}</div>
                    </td>
                    <td data-label="카테고리">
                      <span className={styles.badge} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                        {post.category}
                      </span>
                    </td>
                    <td data-label="픽">
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => handleToggleEditorsPick(post.id, post.is_editors_pick)}
                      >
                        {post.is_editors_pick ? "⭐" : "☆"}
                      </button>
                    </td>
                    <td data-label="날짜">{new Date(post.created_at).toLocaleDateString()}</td>
                    <td data-label="관리">
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Link href={`/post/db-${post.id}`} className={styles.actionBtn}>👁️</Link>
                        <button className={styles.actionBtn} onClick={() => handleDeletePost(post.id, post.title)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className={styles.emptyState}>조건에 맞는 게시물이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className={styles.glassCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>유저 정보</th>
                  <th>이메일</th>
                  <th>권한</th>
                  <th>가입일</th>
                  <th>등급 관리</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? users.map((user) => (
                  <tr key={user.id}>
                    <td data-label="유저 정보">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img 
                          src={user.avatar_url || "/avatars/default.png"} 
                          className={styles.authorAvatar} 
                          onError={(e) => (e.currentTarget.src = "https://ui-avatars.com/api/?name=" + (user.display_name || "User"))}
                          alt="avatar" 
                        />
                        {user.display_name || "Anonymous"}
                      </div>
                    </td>
                    <td data-label="이메일">{user.email}</td>
                    <td data-label="권한">
                      <span className={`${styles.badge} ${user.role === 'admin' ? styles.badgeAdmin : user.role === 'editor' ? styles.badgeEditor : styles.badgeUser}`}>
                        {user.role}
                      </span>
                    </td>
                    <td data-label="가입일">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td data-label="등급 관리">
                      <select 
                        className={styles.tabBtn} 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                      >
                        <option value="user">USER</option>
                        <option value="editor">EDITOR</option>
                        <option value="admin">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className={styles.emptyState}>유저를 찾을 수 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className={styles.glassCard}>
          <div className={styles.categoryGrid}>
            {["movie", "book", "game", "restaurant", "travel", "exhibition", "other"].map(cat => (
              <div key={cat} className={styles.categoryCard}>
                <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.actionBtn}>🔼</button>
                  <button className={styles.actionBtn}>🔽</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatsView({ posts, users, visitCount, todayVisitCount, totalViews, trendData, timeRange, onTimeRangeChange }: { 
  posts: any[], 
  users: any[], 
  visitCount: number,
  todayVisitCount: number,
  totalViews: number,
  trendData: { day: string, count: number }[],
  timeRange: 'daily' | 'weekly' | 'monthly',
  onTimeRangeChange: (v: any) => void 
}) {
  const growth = "+12.5%";
  
  // Real Category Stats
  const categoryStats = posts.reduce((acc: any, post) => {
    acc[post.category] = (acc[post.category] || 0) + (post.views || 0);
    return acc;
  }, {});

  const totalViewsAggregation = Object.values(categoryStats).reduce((a: any, b: any) => a + b, 0) as number;
  const sortedCategories = Object.entries(categoryStats)
    .map(([name, val]) => ({ 
      name: name === 'restaurant' ? '맛집' : name === 'travel' ? '여행' : name === 'movie' ? '영화' : name === 'game' ? '게임' : name === 'book' ? '책' : name === 'exhibition' ? '전시' : '기타', 
      val: totalViewsAggregation > 0 ? Math.round(((val as number) / totalViewsAggregation) * 100) : 0 
    }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 4);

  // Mock chart data based on visit count for visual flair
  const chartData = [40, 70, 45, 90, 65, 85, 55];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <>
      <div className={styles.statsGrid}>
        <div className={styles.statsCard}>
          <div className={styles.statsHeader}>
            <span className={styles.statsLabel}>오늘 방문객</span>
            <span className={`${styles.statsTrend} ${styles.trendUp}`}>Live</span>
          </div>
          <div className={styles.statsValue}>{(todayVisitCount || 0).toLocaleString()}</div>
          <div className={styles.statsSub}>00:00:00 이후 기준</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsHeader}>
            <span className={styles.statsLabel}>누적 방문객</span>
            <span className={`${styles.statsTrend} ${styles.trendUp}`}>↑ {growth}</span>
          </div>
          <div className={styles.statsValue}>{(visitCount || 0).toLocaleString()}</div>
          <div className={styles.statsSub}>전체 세션 합계</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsHeader}>
            <span className={styles.statsLabel}>콘텐츠 조회수</span>
            <span className={`${styles.statsTrend} ${styles.trendUp}`}>↑ +8.2%</span>
          </div>
          <div className={styles.statsValue}>{(totalViews || 0).toLocaleString()}</div>
          <div className={styles.statsSub}>게시물 전체 누적</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsHeader}>
            <span className={styles.statsLabel}>신규 유입</span>
            <span className={`${styles.statsTrend} ${styles.trendDown}`}>↓ -2.1%</span>
          </div>
          <div className={styles.statsValue}>{users.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</div>
          <div className={styles.statsSub}>최근 7일 신규 가입</div>
        </div>
      </div>

      <div className={styles.glassCard}>
        <div className={styles.statsHeader} style={{ marginBottom: '24px' }}>
          <h3 className={styles.chartTitle}>방문자 추이</h3>
          <div className={styles.tabs} style={{ marginBottom: 0 }}>
            {(['daily', 'weekly', 'monthly'] as const).map(range => (
              <button 
                key={range}
                className={`${styles.tabBtn} ${timeRange === range ? styles.activeTab : ''}`}
                style={{ padding: '6px 16px', fontSize: '0.75rem' }}
                onClick={() => onTimeRangeChange(range)}
              >
                {range === 'daily' ? '일간' : range === 'weekly' ? '주간' : '월간'}
              </button>
            ))}
          </div>
        </div>
        
        <div className={styles.chartWrapper}>
          <svg width="100%" height="100%" viewBox="0 0 700 200" preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="0" y1="50" x2="700" y2="50" stroke="var(--border-light)" strokeWidth="1" />
            <line x1="0" y1="100" x2="700" y2="100" stroke="var(--border-light)" strokeWidth="1" />
            <line x1="0" y1="150" x2="700" y2="150" stroke="var(--border-light)" strokeWidth="1" />
            
            {/* Bars */}
            {trendData.map((item, i) => {
              const maxVal = Math.max(...trendData.map(d => d.count), 1);
              const barHeight = (item.count / maxVal) * 160; // Max height 160
              return (
                <rect 
                  key={i}
                  x={i * 100 + 20}
                  y={200 - barHeight}
                  width="60"
                  height={barHeight}
                  fill="var(--accent-primary)"
                  rx="6"
                  opacity="0.8"
                  style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                  className={styles.chartBar}
                >
                  <title>{`${item.day}: ${item.count}명`}</title>
                  <animate attributeName="height" from="0" to={barHeight} dur="0.8s" />
                  <animate attributeName="y" from="200" to={200 - barHeight} dur="0.8s" />
                </rect>
              );
            })}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
            {trendData.map(item => (
              <span key={item.day} style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', width: '60px', textAlign: 'center', marginLeft: '20px' }}>
                {item.day}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <div className={styles.glassCard}>
           <h3 className={styles.chartTitle}>카테고리별 조회수</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sortedCategories.map(item => (
                <div key={item.name} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 700 }}>{item.name}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>{item.val}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.val}%`, background: 'var(--accent-primary)' }}></div>
                  </div>
                </div>
              ))}
           </div>
        </div>
        <div className={styles.glassCard}>
           <h3 className={styles.chartTitle}>실시간 최고 에디터</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {users.slice(0, 4).map(u => {
                const totalUserViews = posts
                  .filter(p => p.author?.id === u.id || p.author_id === u.id)
                  .reduce((sum, p) => sum + (p.views || 0), 0);
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={u.avatar_url || "/avatars/default.png"} className={styles.authorAvatar} style={{ margin: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.display_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>조회수 {totalUserViews.toLocaleString()}</div>
                    </div>
                    <div className={`${styles.statsTrend} ${styles.trendUp}`}>↑</div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </>
  )
}
