import Link from "next/link";
import styles from "./TopNavbar.module.css";

export default function TopNavbar() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">ReviewSite.</Link>
      </div>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          <li>
            <Link href="/movie" className={styles.navLink}>Movie</Link>
          </li>
          <li>
            <Link href="/book" className={styles.navLink}>Book</Link>
          </li>
          <li>
            <Link href="/restaurant" className={styles.navLink}>Restaurant</Link>
          </li>
        </ul>
      </nav>
      <div className={styles.auth}>
        <button className={styles.loginBtn}>Login</button>
      </div>
    </header>
  );
}
