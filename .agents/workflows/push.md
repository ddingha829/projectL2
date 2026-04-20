---
description: 자동 깃 푸시 (승인 없이 실행)
---
// turbo-all
1. 변경 사항을 스테이징합니다.
```powershell
git add .
```
2. 커밋 메시지를 작성하여 커밋합니다.
```powershell
git commit -m "Auto-deploy via workflow"
```
3. 원격 저장소에 푸시합니다.
```powershell
git push origin main
```
