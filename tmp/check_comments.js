const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'comments' });
  if (error) {
    // Fallback if rpc doesn't exist
    const { data: cols, error: err2 } = await supabase.from('comments').select('*').limit(1);
    if (err2) {
      console.error(err2);
    } else if (cols && cols.length > 0) {
      console.log('Columns:', Object.keys(cols[0]));
    } else {
        console.log('No data to infer columns');
    }
  } else {
    console.log(data);
  }
}

checkSchema();
