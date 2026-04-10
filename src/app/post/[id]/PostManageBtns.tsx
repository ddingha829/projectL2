"use client"

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePost } from '@/app/actions/postManage'
import styles from './page.module.css'

interface PostManageBtnsProps {
  postId: string       // DB uuid (prefix 없는 것)
  authorId: string
  currentUserId: string
  role: string
}

export default function PostManageBtns({ postId, authorId, currentUserId, role }: PostManageBtnsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isAuthor = currentUserId === authorId
  const canEdit = role === 'admin' || isAuthor
  const canDelete = role === 'admin' || isAuthor

  if (!canEdit && !canDelete) return null

  const handleDelete = () => {
    if (!confirm('정말 이 게시물을 삭제하시겠습니까?')) return
    startTransition(async () => {
      try {
        await deletePost(postId)
        // 서버 액션(deletePost) 내부에서 redirect('/')가 실행되므로 
        // 클라이언트에서 별도의 router.push('/')는 생략합니다.
      } catch (err) {
        // Next.js의 redirect는 에러를 던지므로, 실제 에러인지 리다이렉트인지 체크가 필요할 수 있으나 
        // 보통은 서버 액션의 redirect가 우선권을 갖습니다.
        console.error("Delete access error:", err);
      }
    })
  }


  return (
    <div className={styles.manageBar}>
      {canEdit && (
        <button
          className={styles.editBtn}
          onClick={() => router.push(`/post/db-${postId}/edit`)}
          disabled={isPending}
          title="게시물 수정"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          <span className={styles.btnText}>수정</span>
        </button>
      )}
      {canDelete && (
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          disabled={isPending}
          title="게시물 삭제"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          <span className={styles.btnText}>{isPending ? '삭제 중...' : '삭제'}</span>
        </button>

      )}
    </div>
  )
}
