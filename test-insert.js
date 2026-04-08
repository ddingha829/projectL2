const { createClient } = require('@supabase/supabase-js')

const NEXT_PUBLIC_SUPABASE_URL = "https://tcsdhfkicbbxizurdfrd.supabase.co"
const NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc2RoZmtpY2JieGl6dXJkZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzQ5MjMsImV4cCI6MjA4OTc1MDkyM30.YFs0Sr7uoMZ4DDd_NQ0uXNjahDjW6bRlkOVjxonEw0M"

async function testInsert() {
  const supabase = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  console.log('Attempting to insert into site_visits...')
  const { data, error } = await supabase.from('site_visits').insert({}).select()

  if (error) {
    console.error('Insert failed:', error)
  } else {
    console.log('Insert success:', data)
  }
}

testInsert()
