const fs = require('fs');
const path = require('path');
const files = [
  'src/app/layout.tsx',
  'src/components/layout/TopNavbar.tsx',
  'src/app/login/page.tsx',
  'src/lib/constants/notice.ts',
  'src/app/post/[id]/page.tsx',
  'src/app/admin/page.tsx',
  'src/app/notice/page.tsx',
  'src/app/features/page.tsx',
  'src/components/layout/LeftSidebar.tsx',
  'src/app/about/page.tsx',
  'src/app/admin/AdminDashboard.tsx',
  'src/app/HomeContent.tsx',
  'src/app/page.tsx',
  'src/app/reviews/page.tsx',
  'src/app/settings/SettingsForm.tsx',
  'src/app/write/WritePostForm.tsx',
  'src/components/common/IntroAnimation.tsx'
];

files.forEach(f => {
  const p = path.join('c:\\Users\\User\\Documents\\ProjectL2', f);
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/Ticgle 티끌 \\| 일상 리뷰 매거진/g, '티끌 Ticgle | 티끌 모아 반짝이는, 일상 매거진')
         .replace(/Ticgle 티끌/g, '티끌 Ticgle')
         .replace(/티끌 모아 반짝이는, 일상 매거진, 티끌/g, '티끌 모아 반짝이는, 일상 매거진')
         .replace(/"영화 리뷰", "맛집 추천", "도서 리뷰", "게임 리뷰"/g, '"일상", "에세이"');
    fs.writeFileSync(p, Buffer.from(c), 'utf8');
  }
});
