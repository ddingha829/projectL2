import { GoogleGenerativeAI } from '@google/generative-ai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ API 키를 찾을 수 없습니다.");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("--- 사용 가능한 Gemini 모델 목록 조회 중 ---");
    // [참고] SDK의 v1beta 혹은 v1 인터페이스를 통해 모델 목록을 가져옵니다.
    // fetch를 직접 사용하여 더 낮은 수준에서 확인합니다.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ API 에러:", data.error.message);
      return;
    }

    if (data.models) {
      console.log(`✅ 총 ${data.models.length}개의 모델을 찾았습니다:`);
      data.models.forEach(m => {
        console.log(`- ${m.name} (지원 기능: ${m.supportedGenerationMethods.join(', ')})`);
      });
      
      const visionModels = data.models.filter(m => m.name.includes('vision') || m.name.includes('1.5'));
      if (visionModels.length > 0) {
        console.log("\n💡 비전(Vision) 지원 모델을 발견했습니다! 이 이름들을 사용해야 합니다.");
      } else {
        console.log("\n⚠️ 비전 지원 모델이 하나도 없습니다. API 키의 권한 설정을 확인해야 합니다.");
      }
    } else {
      console.log("ℹ️ 검색된 모델이 없습니다.");
    }
  } catch (e) {
    console.error("❌ 조회 실패:", e);
  }
}

listModels();
