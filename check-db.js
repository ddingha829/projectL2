const { createClient } = require('@supabase/supabase-js')

const NEXT_PUBLIC_SUPABASE_URL = "https://tcsdhfkicbbxizurdfrd.supabase.co"
const NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc2RoZmtpY2JieGl6dXJkZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzQ5MjMsImV4cCI6MjA4OTc1MDkyM30.YFs0Sr7uoMZ4DDd_NQ0uXNjahDjW6bRlkOVjxonEw0M"

async function checkVisits() {
  const supabase = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { count, error } = await supabase
    .from('site_visits')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Error fetching visits:', error)
  } else {
    console.log('Total visits in DB:', count)
  }

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('views')

  if (postsError) {
    console.error('Error fetching posts:', postsError)
  } else {
    const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0)
    console.log('Total views in DB:', totalViews)
  }
}

checkVisits()
