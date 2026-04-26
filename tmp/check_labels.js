import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkLabels() {
  const { data, error } = await supabase
    .from('gallery_image_labels')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error("❌ DB 에러:", error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("ℹ️ 저장된 라벨 데이터가 없습니다.");
    return;
  }
  
  console.log(`✅ 분석 완료 데이터(${data.length}건):`);
  data.forEach(item => {
    console.log(`- ${item.labels} (URL: ${item.image_url.substring(0, 30)}...)`);
  });
}

checkLabels();
