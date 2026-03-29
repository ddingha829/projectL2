import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

// 타입 오류 상쇄를 위해 'any' 캐스팅을 사용한 dynamic import (빌드 시 타입을 확실하게 무시하게 함)
const WritePostForm = dynamic(() => import('./WritePostForm') as any, { 
  ssr: false,
  loading: () => <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-hover)', borderRadius: '12px' }}>글쓰기 페이지 준비 중...</div>
});

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

  const role: string = profile?.role || 'user';

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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>새로운 글 작성</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>권한: {role} 작가</p>
      </header>
      {/* 컴포넌트 전체를 클라이언트로 격리하여 렌더링 충돌 방지 */}
      <WritePostForm role={role} />
    </div>
  );
}
