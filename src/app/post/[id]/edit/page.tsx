import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditPostForm from './EditPostForm'
import styles from '@/app/write/page.module.css'
import Link from 'next/link'

const CATEGORY_MAP: Record<string, string> = {
  movie: '영화', book: '책', game: '게임',
  restaurant: '맛집', other: '기타', travel: '여행', exhibition: '전시회'
}

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isDbPost = id.startsWith('db-');
  const actualId = isDbPost ? id.replace('db-', '') : id;
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', actualId)
    .single()

  if (error || !post) notFound()

  const isAuthor = post.author_id === user.id
  const canAccess = profile?.role === 'admin' || isAuthor

  if (!canAccess) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h2>Access Denied</h2>
          <p>수정 권한이 없습니다.</p>
        </div>
      </div>
    )
  }

  // editor는 본인 글만 수정 가능
  if (profile?.role === 'editor' && post.author_id !== user.id) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h2>Access Denied</h2>
          <p>본인이 작성한 글만 수정할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/post/db-${id}`} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'inline-block' }}>
          ← 돌아가기
        </Link>
        <h1 className={styles.title}>글 수정</h1>
      </header>
      <EditPostForm
        postId={actualId}
        initialTitle={post.title}
        initialContent={post.content}
        initialCategory={post.category}
        initialImageUrl={post.image_url || ''}
        initialIsEditorsPick={post.is_editors_pick || false}
        initialReviewSubject={post.review_subject || ''}
        initialReviewRating={post.review_rating || 0}
        initialReviewComment={post.review_comment || ''}
        isAdmin={profile?.role === 'admin'}
        initialIsPublic={post.is_public !== false}
        initialShowMainImage={post.show_main_image !== false}
      />
    </div>
  )
}
