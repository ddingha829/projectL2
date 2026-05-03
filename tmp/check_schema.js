import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkSchema() {
  const { data, error } = await supabase
    .from('post_reviews')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching post_reviews:', error);
  } else {
    console.log('Columns in post_reviews:', data.length > 0 ? Object.keys(data[0]) : 'No data to inspect');
  }
}

checkSchema();
