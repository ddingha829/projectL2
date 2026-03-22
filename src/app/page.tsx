import PostCard from "@/components/feed/PostCard";
import styles from "./page.module.css";

const MOCK_POSTS = [
  {
    id: "1",
    category: "Movie",
    title: "듄: 파트 2 (Dune: Part Two) - 압도적인 시각적 경험",
    content: "전작보다 훨씬 더 방대해진 스케일과 탄탄한 스토리텔링이 돋보입니다. 한스 짐머의 음악은 여전히 영화의 몰입도를 극대화합니다. 반드시 아이맥스에서 관람해야 하는 영화.",
    author: "Admin1",
    date: "2024-03-22",
    likes: 42,
    comments: 12
  },
  {
    id: "2",
    category: "Book",
    title: "사피엔스 - 인류의 기원을 추적하다",
    content: "유발 하라리의 통찰력이 돋보이는 명저. 역사, 과학, 철학을 넘나들며 인류가 어떻게 현재의 모습이 되었는지 설득력 있게 풀어냅니다. 생각할 거리를 많이 던져주는 책.",
    author: "Admin2",
    date: "2024-03-20",
    likes: 38,
    comments: 5
  },
  {
    id: "3",
    category: "Restaurant",
    title: "성수동 최현석의 쵸이닷 - 디너 테이스팅",
    content: "독창적인 프레젠테이션과 익숙한 듯 새로운 맛의 조화가 인상적입니다. 특히 분자요리 기법을 활용한 디저트 플레이팅은 시각적인 즐거움까지 선사합니다. 특별한 기념일에 추천.",
    author: "Admin1",
    date: "2024-03-18",
    likes: 56,
    comments: 8
  }
];

export default function Home() {
  return (
    <div className={styles.feed}>
      <h1 className={styles.pageTitle}>Latest Reviews</h1>
      <div className={styles.postList}>
        {MOCK_POSTS.map(post => (
          <PostCard key={post.id} {...post} />
        ))}
      </div>
    </div>
  );
}
