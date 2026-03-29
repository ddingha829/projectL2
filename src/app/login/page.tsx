"use client"

import { useTransition } from 'react'
import { login, signup, resetPassword } from './actions'
import styles from './page.module.css'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  
  const error = searchParams.get('error')
  const message = searchParams.get('message')
  const isSignupSuccess = message === 'signup_success'
  const isResetSent = message === 'reset_sent'

  const handleAction = (action: Function) => async (formData: FormData) => {
    startTransition(async () => {
      await action(formData)
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Login / Sign up</h1>
        <p className={styles.subtitle}>Welcome to Adze Review Site</p>

        {/* 에러 메시지 */}
        {error && (
          <div className={styles.errorAlert}>
            ❌ {error}
          </div>
        )}

        {/* 회원가입 성공 */}
        {isSignupSuccess && (
          <div className={styles.successAlert}>
            ✅ 회원가입이 완료되었습니다.<br />
            아래에서 다시 로그인해 주세요.
          </div>
        )}

        {/* 비밀번호 재설정 이메일 발송 완료 */}
        {isResetSent && (
          <div className={styles.successAlert}>
            📧 비밀번호 재설정 링크를 이메일로 발송했습니다.<br />
            메일함을 확인해 주세요.
          </div>
        )}

        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email address</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="you@example.com"
              className={styles.input}
              disabled={isPending}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              placeholder="••••••••"
              className={styles.input}
              disabled={isPending}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="displayName">Display Name (Signup only)</label>
            <input 
              id="displayName" 
              name="displayName" 
              type="text" 
              placeholder="Nickname"
              className={styles.input}
              disabled={isPending}
            />
          </div>

          <div className={styles.actionButtons}>
            <button 
              formAction={handleAction(login)} 
              className={styles.loginBtn}
              disabled={isPending}
            >
              {isPending ? "⏳ 로그인 중..." : "Log in"}
            </button>
            <button 
              formAction={handleAction(signup)} 
              className={styles.signupBtn}
              disabled={isPending}
            >
              {isPending ? "⏳ 가입 중..." : "Sign up"}
            </button>
          </div>

          {/* 비밀번호 재설정 */}
          <div className={styles.resetRow}>
            <span className={styles.resetHint}>비밀번호를 잊으셨나요?</span>
            <button 
              formAction={handleAction(resetPassword)} 
              className={styles.resetBtn}
              disabled={isPending}
            >
              이메일로 재설정 링크 받기
            </button>
          </div>
        </form>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
