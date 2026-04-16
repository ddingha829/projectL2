const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tcsdhfkicbbxizurdfrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc2RoZmtpY2JieGl6dXJkZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzQ5MjMsImV4cCI6MjA4OTc1MDkyM30.YFs0Sr7uoMZ4DDd_NQ0uXNjahDjW6bRlkOVjxonEw0M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('post_reviews').select('*').limit(1);
    
    if (error) {
        console.log('❌ DB 조회 에러:', error.message);
    } else {
        console.log('✅ DB 연결 성공! 첫 번째 데이터 컬럼들:', data && data[0] ? Object.keys(data[0]) : '데이터 없음');
        
        // 컬럼 목록 강제 확인 (에러 유무로 판단)
        const { error: colError } = await supabase.from('post_reviews').select('lat, lng, place_id, embed_url').limit(1);
        if (colError) {
            console.log('🚨 누락된 컬럼 발견:', colError.message);
        } else {
            console.log('🌟 모든 필수 컬럼(lat, lng, place_id, embed_url)이 완벽하게 존재합니다!');
        }
    }
}

check();
