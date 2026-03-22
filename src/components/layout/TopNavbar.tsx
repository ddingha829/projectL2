import Link from "next/link";
import styles from "./TopNavbar.module.css";

export default function TopNavbar() {
  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.logo}>
          <Link href="/">ReviewSite<span className={styles.dot}>.</span><span className={styles.accent}>DESIGN</span></Link>
        </div>
      </div>
      
      <div className={styles.centerSection}>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Search everything..." className={styles.searchInput} />
          <span className={styles.filterIcon}>⚙️</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconBtn}>📄</button>
        <button className={styles.iconBtn}>🔔</button>
        <div className={styles.profile}>
          <div className={styles.avatar}>👦</div>
        </div>
      </div>
    </header>
  );
}
