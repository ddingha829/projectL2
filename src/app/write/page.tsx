import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WritePostForm from './WritePostForm';
import styles from './page.module.css';

export default async function WritePostPage() {
  const supabase = await createClient();
  
  // 1. 세션 체크
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. 권한 정보 조회
  // .single() 대신 안전하게 조회하고 에러 로그 출력
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Permission check failed:', error.message);
    // [중요] DB 응답 에러로 인해 권한 확인이 불가능한 경우 가이드 페이지 출력
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⚠️</span>
          <h2>권한 확인 불가</h2>
          <p>서버에서 권한 정보를 읽어오는 데 실패했습니다.</p>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px' }}>
            에러 메시지: {error.message}<br/>
            (DB RLS 정책 설정이 필요할 수 있습니다.)
          </p>
        </div>
      </div>
    );
  }

  const role = profile?.role || 'user';

  // 3. 권한 로직 적용 (admin 또는 editor)
  if (role !== 'admin' && role !== 'editor') {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h2>Access Denied</h2>
          <p>글쓰기 권한(Editor)이 없습니다.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>현재 권한: {role}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>새로운 글 작성</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>권한: {role}</p>
      </header>
      <WritePostForm role={role} />
    </div>
  );
}
