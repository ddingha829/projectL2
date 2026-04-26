const { createClient } = require('@supabase/supabase-js');
// Hardcoded keys for internal diagnosis (retrieved from environment if available)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Keys not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('review_requests').select('*').limit(1);
  if (error) {
    console.error('Error fetching review_requests:', error.message);
  } else {
    console.log('Success, found review_requests data:', data);
  }
}

check();
