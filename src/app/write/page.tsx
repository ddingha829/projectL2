import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

// [중요] 에러 방지를 위해 폼 전체를 클라이언트 전용으로 불러옴
const WritePostForm = dynamic(() => import('./WritePostForm'), { 
  ssr: false,
  loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-hover)', borderRadius: '12px' }}>페이지를 준비하는 중...</div>
});

export default async function WritePostPage() {
  const supabase = await createClient();
  
  // 1. 세션 체크
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. 권한 정보 조회
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Permission check failed:', error.message);
  }

  const role = profile?.role || 'user';

  // 3. 권한 로직 적용 (admin 또는 editor)
  if (role !== 'admin' && role !== 'editor') {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h2>Access Denied</h2>
          <p>글쓰기 권한(Editor 이상)이 없습니다.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>현재 권한: {role}</p>
        </div>
      </div>
    );
  }

  // [중요] 서버 단에서 렌더링하지 않고 클라이언트에서 폼을 띄우게 함하여 서버 크래시(Crash) 원천 차단
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>새로운 글 작성</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>권한: {role} 작가</p>
      </header>
      <WritePostForm role={role} />
    </div>
  );
}
