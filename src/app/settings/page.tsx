import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'
import styles from './page.module.css'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=Please login to access settings')
  }

  // Get current user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>MY PROFILE</h1>
        <p className={styles.subtitle}>계정 정보를 수정하고 프로필을 관리하세요.</p>
      </header>
      <div className={styles.content}>
        <SettingsForm user={user} profile={profile} />
      </div>
    </div>
  )
}
