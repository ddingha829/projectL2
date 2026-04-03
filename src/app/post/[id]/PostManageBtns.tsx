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
      await deletePost(postId)
      router.push('/')
    })
  }

  return (
    <div className={styles.manageBar}>
      {canEdit && (
        <button
          className={styles.editBtn}
          onClick={() => router.push(`/post/db-${postId}/edit`)}
          disabled={isPending}
        >
          ✏️ 수정
        </button>
      )}
      {canDelete && (
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? '삭제 중...' : '🗑️ 삭제'}
        </button>
      )}
    </div>
  )
}
