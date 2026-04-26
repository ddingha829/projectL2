const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tcsdhfkicbbxizurdfrd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc2RoZmtpY2JieGl6dXJkZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzQ5MjMsImV4cCI6MjA4OTc1MDkyM30.YFs0Sr7uoMZ4DDd_NQ0uXNjahDjW6bRlkOVjxonEw0M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: cols, error: err2 } = await supabase.from('likes').select('*').limit(1);
  if (err2) {
    console.error(err2);
  } else if (cols && cols.length > 0) {
    console.log('Columns:', Object.keys(cols[0]));
  } else {
      console.log('No data to infer columns in likes');
  }
}

checkSchema();
