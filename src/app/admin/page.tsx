import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import AdminDashboard from '@/app/admin/AdminDashboard'
import styles from './admin.module.css'
import Link from 'next/link'

export const metadata = {
  title: 'Admin Dashboard | WoogaWooga 우가우가',
  description: 'Manage posts, users, and categories.',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?returnTo=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return (
      <div className={styles.noPermission}>
        <h1>Access Denied</h1>
        <p>This area is restricted to administrators only.</p>
        <Link href="/" className={styles.backBtn}>Return Home</Link>
      </div>
    )
  }

  // Fetch initial data
  // Precise KST (UTC+9) calculation for "Today"
  const now = new Date();
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const kstTodayStart = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate());
  
  // Convert back to UTC for Supabase query
  const todayIso = new Date(kstTodayStart.getTime() - (9 * 60 * 60 * 1000)).toISOString();

  // Last 7 days for trend (KST based)
  const weekAgoKst = new Date(kstTodayStart);
  weekAgoKst.setDate(weekAgoKst.getDate() - 6);
  const weekAgoIso = new Date(weekAgoKst.getTime() - (9 * 60 * 60 * 1000)).toISOString();

  const [postsRes, profilesRes, visitRes, todayVisitRes, trendRes] = await Promise.all([
    supabase.from('posts').select('*, author:profiles!author_id(display_name, avatar_url)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('site_visits').select('*', { count: 'exact', head: true }),
    supabase.from('site_visits').select('*', { count: 'exact', head: true }).gte('visited_at', todayIso),
    supabase.from('site_visits').select('visited_at').gte('visited_at', weekAgoIso)
  ])

  // Aggregate total views from all posts
  const totalViewsAggregation = (postsRes.data || []).reduce((acc: number, post: any) => acc + (post.views || 0), 0);

  // Process trend data
  const trendMap: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgoKst);
    d.setDate(d.getDate() + i);
    trendMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
  }

  (trendRes.data || []).forEach(v => {
    const day = new Date(v.visited_at).toLocaleDateString('en-US', { weekday: 'short' });
    if (trendMap[day] !== undefined) trendMap[day]++;
  });

  const trendData = Object.entries(trendMap).map(([day, count]) => ({ day, count }));

  return (
    <div className={styles.adminContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>System Administration</h1>
        <div className={styles.userInfo}>
           <span>Admin: {user.email}</span>
        </div>
      </header>

      <AdminDashboard 
        initialPosts={postsRes.data || []} 
        initialProfiles={profilesRes.data || []} 
        visitCount={visitRes.count || 0}
        todayVisitCount={todayVisitRes.count || 0}
        trendData={trendData}
        totalViews={totalViewsAggregation}
      />
    </div>
  )
}
