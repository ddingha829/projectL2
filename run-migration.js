// featured_videos 테이블 생성 스크립트
// node run-migration.js 로 실행

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runMigration() {
  console.log('Running featured_videos migration...');
  
  // Check if table already exists by attempting a query
  const { error: checkError } = await supabase
    .from('featured_videos')
    .select('id')
    .limit(1);
  
  if (!checkError) {
    console.log('✅ Table featured_videos already exists, skipping creation.');
    process.exit(0);
  }
  
  console.log('Table does not exist, creating via Supabase REST API...');
  console.log('Error was:', checkError.message);
  
  // We need service role key for DDL; instruct user to run in Supabase dashboard
  console.log('\n📋 Please run the following SQL in your Supabase dashboard:');
  console.log('   https://supabase.com/dashboard/project/tcsdhfkicbbxizurdfrd/sql/new\n');
  console.log(`
CREATE TABLE IF NOT EXISTS featured_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_url TEXT NOT NULL,
  title TEXT,
  video_type TEXT NOT NULL DEFAULT 'long' CHECK (video_type IN ('short', 'long')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE featured_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active featured videos"
  ON featured_videos FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage featured videos"
  ON featured_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_featured_videos_order ON featured_videos(display_order ASC, created_at DESC);
  `);
}

runMigration().catch(console.error);
