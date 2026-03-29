import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WritePostForm from './WritePostForm';
import styles from './page.module.css';

export default async function WritePostPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || 'user';

  if (role !== 'admin' && role !== 'editor') {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h2>Access Denied</h2>
          <p>글쓰기 권한(Editor 이상)이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>새로운 글 작성</h1>
      </header>
      <WritePostForm role={role} />
    </div>
  );
}
