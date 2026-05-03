"use client"

import { useTransition, useState, useEffect } from 'react'
import { login, resetPassword, signInWithGoogle, signInWithKakao } from './actions'
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

  // [신규] 인앱 브라우저 체크 (구글 로그인 차단 대응)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isInApp = /kakaotalk|instagram|fban|fbav|line|naver|whale/.test(ua);
    setIsInAppBrowser(isInApp);
  }, []);

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

  const handleKakaoLogin = () => {
    startTransition(async () => {
      await signInWithKakao()
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>로그인</h1>
        <p className={styles.subtitle}>티끌 모아 반짝이는, 일상 매거진</p>

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
            아래에서 로그인해 주세요.
          </div>
        )}

        {/* 비밀번호 재설정 이메일 발송 완료 */}
        {isResetSent && (
          <div className={styles.successAlert}>
            📧 비밀번호 재설정 링크를 이메일로 발송했습니다.<br />
            메일함을 확인해 주세요.
          </div>
        )}

        {/* 인앱 브라우저 경고 */}
        {isInAppBrowser && (
          <div className={styles.warningAlert}>
            ⚠️ <strong>인앱 브라우저 안내</strong><br />
            카카오톡/인스타그램 등에서는 구글 로그인이 차단될 수 있습니다. <br />
            <strong>오른쪽 상단 점 3개(⋮)</strong>를 눌러 <strong>'브라우저에서 열기'</strong> 또는 <strong>'기본 브라우저로 열기'</strong>를 선택해 주세요.
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
            {isPending ? "연결 중..." : "Google 계정으로 로그인"}
          </button>

          {/* 카카오톡 로그인 잠시 비활성화
          <button 
            type="button"
            className={styles.kakaoBtn}
            onClick={handleKakaoLogin}
            disabled={isPending}
          >
            <svg className={styles.kakaoIcon} viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 3c-4.97 0-9 3.18-9 7.11 0 2.55 1.7 4.79 4.26 6.07l-.82 3.03c-.04.14.04.29.17.34.05.02.1.02.15 0l3.56-2.37c.54.08 1.1.12 1.68.12 4.97 0 9-3.18 9-7.11S16.97 3 12 3z" fill="#3C1E1E"/>
            </svg>
            {isPending ? "연결 중..." : "카카오톡으로 로그인"}
          </button>
          */}
        </div>

        <div className={styles.divider}>
          <span>또는 이메일로 로그인</span>
        </div>

        {/* 이메일 로그인 폼 */}
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
              placeholder="••••••••"
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
              {isPending ? "⏳ 로그인 중..." : "로그인"}
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

        {/* 회원가입 링크 */}
        <div className={styles.signupRow}>
          <span>아직 계정이 없으신가요?</span>
          <Link href="/signup" className={styles.signupLink}>회원가입</Link>
        </div>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
