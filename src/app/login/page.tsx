import { login, signup, resetPassword } from './actions'
import styles from './page.module.css'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string, message?: string }>
}) {
  const params = await searchParams
  const isSignupSuccess = params.message === 'signup_success'
  const isResetSent = params.message === 'reset_sent'

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Login / Sign up</h1>
        <p className={styles.subtitle}>Welcome to Adze Review Site</p>

        {/* 에러 메시지 */}
        {params.error && (
          <div className={styles.errorAlert}>
            ❌ {params.error}
          </div>
        )}

        {/* 회원가입 성공 */}
        {isSignupSuccess && (
          <div className={styles.successAlert}>
            ✅ 회원가입이 완료되었습니다.<br />
            작성하신 메일로 인증 메일이 발송되었으니 확인해 주세요.
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
            />
          </div>

          <div className={styles.actionButtons}>
            <button formAction={login} className={styles.loginBtn}>
              Log in
            </button>
            <button formAction={signup} className={styles.signupBtn}>
              Sign up
            </button>
          </div>

          {/* 비밀번호 재설정 */}
          <div className={styles.resetRow}>
            <span className={styles.resetHint}>비밀번호를 잊으셨나요?</span>
            <button formAction={resetPassword} className={styles.resetBtn}>
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
