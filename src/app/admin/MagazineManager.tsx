'use client'

import { useState, useEffect } from 'react'
import styles from './admin.module.css'
import Image from 'next/image'
import { getNextIssueNumber, publishMagazineIssue } from '../actions/magazine'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  title: string
  image_url: string
  category: string
  created_at: string
  author?: {
    display_name: string
  }
}

interface MagazineManagerProps {
  posts: Post[]
}

export default function MagazineManager({ posts }: MagazineManagerProps) {
  const [issueNumber, setIssueNumber] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<'A' | 'B1' | 'B2' | 'B3' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [slots, setSlots] = useState<{
    A: Post | null
    B1: Post | null
    B2: Post | null
    B3: Post | null
  }>({
    A: null,
    B1: null,
    B2: null,
    B3: null
  })

  useEffect(() => {
    async function loadInitial() {
      const next = await getNextIssueNumber()
      setIssueNumber(next)
    }
    loadInitial()
  }, [])

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAssign = (post: Post) => {
    if (!selectedSlot) return
    setSlots(prev => ({ ...prev, [selectedSlot]: post }))
    setSelectedSlot(null)
  }

  const handleRemove = (slot: keyof typeof slots) => {
    setSlots(prev => ({ ...prev, [slot]: null }))
  }

  const handlePublish = async () => {
    if (!slots.A || !slots.B1 || !slots.B2 || !slots.B3) {
      alert('모든 슬롯(A, B1, B2, B3)을 채워주세요.')
      return
    }

    if (!confirm(`${issueNumber} 회차를 발행하시겠습니까?`)) return

    setIsSubmitting(true)
    const res = await publishMagazineIssue({
      issue_number: issueNumber,
      post_a_id: slots.A.id,
      post_b1_id: slots.B1.id,
      post_b2_id: slots.B2.id,
      post_b3_id: slots.B3.id
    })

    if (res.success) {
      alert('매거진이 성공적으로 발행되었습니다.')
      router.refresh()
    } else {
      alert('발행 실패: ' + res.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className={styles.magazineLayout}>
      <div className={styles.magazineSetup}>
        <div className={styles.issueHeader}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-tertiary)' }}>발행 회차</label>
            <input 
              type="text" 
              className={styles.issueInput} 
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              placeholder="2026-1"
            />
          </div>
          <button 
            className={styles.publishBtn} 
            disabled={isSubmitting || !slots.A || !slots.B1 || !slots.B2 || !slots.B3}
            onClick={handlePublish}
          >
            {isSubmitting ? '발행 중...' : '매거진 발행하기'}
          </button>
        </div>

        <div className={styles.slotGrid}>
          {/* Main A Slot */}
          <div 
            className={`${styles.slotBox} ${styles.slotLarge} ${selectedSlot === 'A' ? styles.slotBoxActive : ''}`}
            onClick={() => setSelectedSlot('A')}
          >
            <span className={styles.slotLabel}>Main A (큰 카드)</span>
            {slots.A ? (
              <>
                <img src={slots.A.image_url} className={styles.slotPoster} alt="A" />
                <div className={styles.slotInfo}>
                  <div className={styles.slotTitle}>{slots.A.title}</div>
                </div>
                <button className={styles.slotRemove} onClick={(e) => { e.stopPropagation(); handleRemove('A'); }}>✕</button>
              </>
            ) : (
              <div className={styles.slotInfo}>클릭하여 게시물 선택</div>
            )}
          </div>

          {/* B Slots */}
          <div className={styles.slotColumn}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(['B1', 'B2', 'B3'] as const).map(s => (
                <div 
                  key={s}
                  className={`${styles.slotBox} ${selectedSlot === s ? styles.slotBoxActive : ''}`}
                  onClick={() => setSelectedSlot(s)}
                  style={{ minHeight: '100px' }}
                >
                  <span className={styles.slotLabel}>Main {s}</span>
                  {slots[s] ? (
                    <>
                      <img src={slots[s]!.image_url} className={styles.slotPoster} alt={s} />
                      <div className={styles.slotInfo}>
                        <div className={styles.slotTitle}>{slots[s]!.title}</div>
                      </div>
                      <button className={styles.slotRemove} onClick={(e) => { e.stopPropagation(); handleRemove(s); }}>✕</button>
                    </>
                  ) : (
                    <div className={styles.slotInfo}>선택</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.magazinePool}>
        <h3 className={styles.chartTitle} style={{ margin: 0 }}>게시물 목록</h3>
        <div className={styles.searchBar} style={{ marginBottom: 0 }}>
          <span className={styles.searchIcon}>🔍</span>
          <input 
            type="text" 
            placeholder="제목 또는 카테고리 검색..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.poolList}>
          {filteredPosts.map(post => (
            <div 
              key={post.id} 
              className={styles.poolItem}
              onClick={() => handleAssign(post)}
              style={{ opacity: selectedSlot ? 1 : 0.6, cursor: selectedSlot ? 'pointer' : 'default' }}
            >
              <img src={post.image_url} className={styles.poolThumb} alt="thumb" />
              <div className={styles.poolInfo}>
                <div className={styles.poolTitle}>{post.title}</div>
                <div className={styles.poolMeta}>
                  {post.category} · {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          {filteredPosts.length === 0 && (
            <div className={styles.emptyState}>검색 결과가 없습니다.</div>
          )}
        </div>
        {!selectedSlot && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            위 슬롯 중 하나를 먼저 선택한 후 게시물을 클릭하세요.
          </p>
        )}
      </div>
    </div>
  )
}
