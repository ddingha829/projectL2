"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./LeftSidebar.module.css";

// Mock submenus based on the path
export default function LeftSidebar() {
  const pathname = usePathname();
  
  let submenus = [
    { name: "All", path: "/" },
    { name: "Trending", path: "/#trending" },
    { name: "Latest", path: "/#latest" },
  ];

  if (pathname.startsWith("/movie")) {
    submenus = [
      { name: "All Movies", path: "/movie" },
      { name: "Action", path: "/movie/action" },
      { name: "Drama", path: "/movie/drama" },
      { name: "Sci-Fi", path: "/movie/scifi" },
    ];
  } else if (pathname.startsWith("/book")) {
    submenus = [
      { name: "All Books", path: "/book" },
      { name: "Fiction", path: "/book/fiction" },
      { name: "Non-Fiction", path: "/book/non-fiction" },
    ];
  } else if (pathname.startsWith("/restaurant")) {
    submenus = [
      { name: "All Restaurants", path: "/restaurant" },
      { name: "Korean", path: "/restaurant/korean" },
      { name: "Western", path: "/restaurant/western" },
    ];
  }

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <ul className={styles.menuList}>
          {submenus.map((menu) => (
            <li key={menu.name} className={styles.menuItem}>
              <Link 
                href={menu.path} 
                className={`${styles.menuLink} ${pathname === menu.path ? styles.active : ""}`}
              >
                {menu.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
