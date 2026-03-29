import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WritePostForm from './WritePostForm';
import styles from './page.module.css';

export default async function WritePostPage() {
  const supabase = await createClient();
  
  // 1. 유저 인증
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 2. 권한 정보 (조금 더 보수적으로 조회)
  let role = 'user';
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
      
    if (profile) role = profile.role;
  } catch (err) {
    console.error('Role check system error:', err);
  }

  // 3. 권한 체크
  if (role !== 'admin' && role !== 'editor') {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h2>권한 없음</h2>
          <p>이 페이지에 접근하려면 작가(Editor) 이상의 권한이 있어야 합니다.</p>
        </div>
      </div>
    );
  }

  // 4. 컴포넌트 데이터 전달
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>새로운 글 작성</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>작성자 모드: {role}</p>
      </header>
      
      {/* 클라이언트 컴포넌트인 WritePostForm이 에러를 전파하지 않도록 함 */}
      <WritePostForm role={role} />
    </div>
  );
}
