const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tcsdhfkicbbxizurdfrd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc2RoZmtpY2JieGl6dXJkZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzQ5MjMsImV4cCI6MjA4OTc1MDkyM30.YFs0Sr7uoMZ4DDd_NQ0uXNjahDjW6bRlkOVjxonEw0M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from('notifications').select('id').limit(1);
  if (error) {
    console.log('Error or table not found:', error.message);
  } else {
    console.log('Table "notifications" exists.');
  }
}

checkTable();
