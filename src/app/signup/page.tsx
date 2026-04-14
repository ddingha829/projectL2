"use client"

import { useTransition } from 'react'
import { signup, signInWithGoogle } from '../login/actions'
import styles from '../login/page.module.css'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function SignupPage() {
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleAction = (action: Function) => async (formData: FormData) => {
    startTransition(async () => {
      await action(formData)
    })
  }

  const handleGoogleLogin = () => {
    startTransition(async () => {
      await signInWithGoogle()
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>회원가입</h1>
        <p className={styles.subtitle}>티끌에 오신 것을 환영합니다</p>

        {/* 에러 메시지 */}
        {error && (
          <div className={styles.errorAlert}>
            ❌ {error}
          </div>
        )}

        {/* 소셜 로그인 */}
        <div className={styles.socialSection}>
          <button 
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogleLogin}
            disabled={isPending}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isPending ? "연결 중..." : "Google 계정으로 가입"}
          </button>
        </div>

        <div className={styles.divider}>
          <span>또는 이메일로 가입</span>
        </div>

        {/* 이메일 회원가입 폼 */}
        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">이메일 주소</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="example@email.com"
              className={styles.input}
              disabled={isPending}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">비밀번호</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              placeholder="6자 이상 입력"
              className={styles.input}
              disabled={isPending}
              minLength={6}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="displayName">닉네임</label>
            <input 
              id="displayName" 
              name="displayName" 
              type="text" 
              required
              placeholder="서비스에서 사용할 이름"
              className={styles.input}
              disabled={isPending}
            />
          </div>

          <div className={styles.actionButtons}>
            <button 
              formAction={handleAction(signup)} 
              className={styles.loginBtn}
              disabled={isPending}
            >
              {isPending ? "⏳ 가입 중..." : "가입하기"}
            </button>
          </div>
        </form>

        {/* 로그인 페이지 링크 */}
        <div className={styles.signupRow}>
          <span>이미 계정이 있으신가요?</span>
          <Link href="/login" className={styles.signupLink}>로그인</Link>
        </div>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
