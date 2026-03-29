import { login, signup } from './actions'
import styles from './page.module.css'
import Link from 'next/link'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string, message?: string }
}) {
  const isSignupSuccess = searchParams.message === 'signup_success'

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Login / Sign up</h1>
        <p className={styles.subtitle}>Welcome to Adze Review Site</p>

        {searchParams.error && (
          <div className={styles.errorAlert}>{searchParams.error}</div>
        )}

        {isSignupSuccess && (
          <div className={styles.successAlert}>
            회원가입이 완료되었습니다. 작성하신 메일로 인증 메일이 발송되었으니 확인해 주시기 바랍니다.
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
        </form>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
