"use client"

import { useState } from 'react'
import styles from './page.module.css'

export default function CopyUrlBtn() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('URL 복사 실패:', err)
      alert('URL 복사에 실패했습니다.')
    }
  }

  return (
    <button 
      className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
      onClick={handleCopy}
      title="주소 복사"
    >
      {copied ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
          <span className={styles.btnText}>복사됨!</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          <span className={styles.btnText}>주소 복사</span>
        </>
      )}
    </button>
  )
}
