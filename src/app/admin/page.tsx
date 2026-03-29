import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
import AdminDashboard from '@/app/admin/AdminDashboard'
import styles from './admin.module.css'
import Link from 'next/link'

export const metadata = {
  title: 'Admin Dashboard | Review Site',
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
  const [postsRes, profilesRes] = await Promise.all([
    supabase.from('posts').select('*, author:profiles!author_id(display_name, avatar_url)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
  ])

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
      />
    </div>
  )
}
