'use client'

import { useState } from 'react'
import styles from './admin.module.css'
import { deletePostAdmin, updateUserRole, toggleEditorsPick } from './actions'
import { useRouter } from 'next/navigation'

interface AdminDashboardProps {
  initialPosts: any[]
  initialProfiles: any[]
}

export default function AdminDashboard({ initialPosts, initialProfiles }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'categories'>('posts')
  const [searchQuery, setSearchQuery] = useState('')
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
    <div className={styles.glassCard}>
      <div className={styles.tabs}>
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
          👥 권한 및 에디터 관리
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'categories' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('categories'); setSearchQuery(''); }}
        >
          📂 카테고리 기획
        </button>
      </div>

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

      {activeTab === 'posts' && (
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
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
                    <div className={styles.postTitle} title={post.title}>{post.title}</div>
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
                      title="에디터 픽 토글"
                    >
                      {post.is_editors_pick ? "⭐" : "☆"}
                    </button>
                  </td>
                  <td data-label="날짜">{new Date(post.created_at).toLocaleDateString()}</td>
                  <td data-label="관리">
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => router.push(`/post/db-${post.id}`)}>👁️</button>
                      <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeletePost(post.id, post.title)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className={styles.emptyState}>조건에 맞는 게시물이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
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
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
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
      )}

      {activeTab === 'categories' && (
        <div className={styles.categoryGrid}>
          <p style={{ gridColumn: 'span 2', color: '#666', marginBottom: '10px' }}>
            * 현재 카테고리는 시스템 고정값입니다. DB 이관 후 편집이 가능해집니다.
          </p>
          {["movie", "book", "game", "restaurant", "travel", "exhibition", "other"].map(cat => (
            <div key={cat} className={styles.categoryCard}>
               <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
               <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.actionBtn}>🔼</button>
                  <button className={styles.actionBtn}>🔽</button>
                  <button className={styles.actionBtn} style={{ color: '#666', cursor: 'not-allowed' }}>🛠️</button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
