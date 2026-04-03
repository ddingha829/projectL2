import styles from './about.module.css';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <img 
          src="/about-prep.png" 
          alt="사이트 소개 준비중" 
          className={styles.image}
        />
        <h1 className={styles.title}>사이트 소개 준비중</h1>
        <p className={styles.description}>
          졸라맨이 선사시대 고인돌 옆에서 열심히 돌도끼질을 하며 페이지를 제작하고 있습니다.<br />
          조금만 더 기다려 주세요!
        </p>
        <Link href="/" className={styles.backBtn}>홈으로 돌아가기</Link>
      </div>
    </div>
  );
}
