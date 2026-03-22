import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createPost } from './actions';
import styles from './page.module.css';

export default async function WritePostPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h2>Access Denied</h2>
          <p>글쓰기 권한(Admin)이 없습니다. 데이터베이스에서 권한을 변경해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>새로운 글 작성</h1>
      </header>

      <form action={createPost} className={styles.formContainer}>
        <div className={styles.inputGroup}>
          <label htmlFor="category">카테고리</label>
          <select id="category" name="category" required className={styles.input}>
            <option value="movie">영화 (Movie)</option>
            <option value="book">책 (Book)</option>
            <option value="game">게임 (Game)</option>
            <option value="restaurant">맛집 (Restaurant)</option>
            <option value="other">기타 (Other)</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="title">제목</label>
          <input type="text" id="title" name="title" required placeholder="글 제목을 입력하세요" className={styles.input} />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="imageUrl">대표 이미지 URL</label>
          <input type="url" id="imageUrl" name="imageUrl" required placeholder="https://..." className={styles.input} />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="content">내용</label>
          <textarea id="content" name="content" required rows={10} placeholder="자유롭게 리뷰를 작성해 보세요!" className={styles.textarea}></textarea>
        </div>

        <button type="submit" className={styles.submitBtn}>출간하기</button>
      </form>
    </div>
  );
}
