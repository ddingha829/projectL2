'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getGalleryImages } from '@/app/actions/gallery'
import styles from './gallery.module.css'
import Link from 'next/link'

export default function GalleryPage() {
  const [images, setImages] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const newImages = await getGalleryImages(page)
    
    if (newImages.length === 0) {
      setHasMore(false)
    } else {
      setImages(prev => [...prev, ...newImages])
      setPage(prev => prev + 1)
    }
    setLoading(false)
  }, [page, loading, hasMore])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [loadMore, hasMore])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}><span>티끌</span> 갤러리</h1>
        <p className={styles.subtitle}>티끌러들이 남긴 생생한 순간들을 한눈에 만나보세요.</p>
      </header>

      <div className={styles.galleryGrid}>
        {images.map((img, idx) => (
          <Link 
            key={`${img.id}-${idx}`} 
            href={`/post/${img.serialId || `db-${img.id}`}`}
            className={styles.galleryItem}
          >
            <div className={styles.imageWrapper}>
              <img 
                src={img.imageUrl} 
                alt={img.title} 
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.overlay}>
                <h3 className={styles.itemTitle}>{img.title}</h3>
                <span className={styles.itemAuthor}>by {img.authorName}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} className={styles.sentinel}>
        {loading && <div className={styles.loader} />}
        {!hasMore && <p className={styles.subtitle}>모든 사진을 다 불러왔습니다.</p>}
      </div>
    </div>
  )
}
