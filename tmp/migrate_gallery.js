const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Migrating gallery_image_labels table...');
  const { data, error } = await supabase.rpc('run_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS gallery_image_labels (
        image_url TEXT PRIMARY KEY,
        labels TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (error) {
    if (error.message.includes('function "run_sql" does not exist')) {
      console.log('Note: run_sql function not found. Skipping SQL execution via RPC.');
      console.log('You might need to create the table manually in Supabase Dashboard.');
    } else {
      console.error('Migration error:', error);
    }
  } else {
    console.log('Table created successfully!');
  }
}

migrate();
