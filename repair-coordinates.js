const { createClient } = require('@supabase/supabase-js');
// Node.js 18+ 에서는 global fetch를 사용하므로 별도 require가 필요 없습니다.

// 환경 변수 설정 (사용자의 .env.local 데이터 활용)
const SUPABASE_URL = 'https://tcsdhfkicbbxizurdfrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc2RoZmtpY2JieGl6dXJkZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzQ5MjMsImV4cCI6MjA4OTc1MDkyM30.YFs0Sr7uoMZ4DDd_NQ0uXNjahDjW6bRlkOVjxonEw0M';
const GOOGLE_MAPS_API_KEY = 'AIzaSyCvYJN_gjITkKOF5se5MbmYVuknuYfkt3E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function repair() {
    console.log('🏁 기존 리뷰 좌표 복구 작업을 시작합니다...');

    // 1. 좌표가 없는 리뷰 가져오기
    const { data: reviews, error } = await supabase
        .from('post_reviews')
        .select('id, subject')
        .is('lat', null);

    if (error) {
        console.error('❌ 리뷰 데이터를 가져오는데 실패했습니다:', error);
        return;
    }

    console.log(`🧐 복구가 필요한 리뷰 ${reviews.length}개를 발견했습니다.`);

    for (const review of reviews) {
        console.log(`🔍 '${review.subject}'의 좌표를 찾는 중...`);

        try {
            // 2. Google Places API (Text Search) 호출 - 훨씬 검색 성공률이 높습니다.
            const query = encodeURIComponent(review.subject);
            const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_MAPS_API_KEY}`;
            
            const response = await fetch(googleUrl);
            const result = await response.json();
            console.log('DEBUG Google Result:', result);

            if (result.status === 'OK' && result.results && result.results.length > 0) {
                const loc = result.results[0].geometry.location;
                const pId = result.results[0].place_id;

                console.log(`✅ 좌표 발견! (lat: ${loc.lat}, lng: ${loc.lng})`);

                // 3. DB 업데이트
                const { error: updateError } = await supabase
                    .from('post_reviews')
                    .update({
                        lat: loc.lat,
                        lng: loc.lng,
                        place_id: pId
                    })
                    .eq('id', review.id);

                if (updateError) {
                    console.error(`❌ DB 업데이트 실패 (${review.subject}):`, updateError);
                }
            } else {
                console.warn(`⚠️ '${review.subject}'에 대한 검색 결과가 없습니다.`);
            }
        } catch (err) {
            console.error(`💥 처리 중 오류 발생 (${review.subject}):`, err);
        }
    }

    console.log('🎉 모든 복구 작업이 끝났습니다! 아카이브 지도를 확인해 보세요.');
}

repair();
