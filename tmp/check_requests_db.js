const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'review_requests' });
  
  if (error) {
    // If RPC doesn't exist, try a simple query
    console.log('RPC failed, trying direct select...');
    const { data: sample, error: selectError } = await supabase
      .from('review_requests')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('Select error:', selectError.message);
    } else {
      console.log('Columns found:', Object.keys(sample[0] || {}));
    }
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
