import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WritePostForm from './WritePostForm';
import styles from './page.module.css';

export default async function WritePostPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 1. 유저 인증 체크
  if (authError || !user) {
    redirect('/login');
  }

  // 2. 프로필 및 권한(Role) 체크
  // .single() 대신 .maybeSingle()을 사용하여 데이터가 없어도 에러 대신 null을 반환하게 함
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
  }

  const role = profile?.role || 'user';

  // editor 또는 admin만 접근 가능
  if (role !== 'admin' && role !== 'editor') {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h2>Access Denied</h2>
          <p>글쓰기 권한(Editor 이상)이 없습니다.</p>
          <p style={{ fontSize: '0.8rem', color: 'gray', marginTop: '10px' }}>
            현재 권한: {role} (권한이 editor로 설정되었는지 확인해 주세요.)
          </p>
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
