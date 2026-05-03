export const CATEGORY_MAP: Record<string, string> = {
  restaurant: "맛집",
  movie: "영화",
  travel: "여행",
  book: "책",
  goodies: "꿀템",
  exhibition: "이벤트/전시회",
  finance: "재테크",
  game: "게임",
  other: "기타",
  notice: "공지사항"
};

export const CATEGORY_LIST = [
  { id: 'restaurant', name: '맛집' },
  { id: 'movie', name: '영화' },
  { id: 'travel', name: '여행' },
  { id: 'book', name: '책' },
  { id: 'goodies', name: '꿀템' },
  { id: 'exhibition', name: '이벤트/전시회' },
  { id: 'finance', name: '재테크' },
  { id: 'game', name: '게임' },
  { id: 'other', name: '기타' }
];

export const SCHEMA_TYPE_MAP: Record<string, string> = {
  movie: "Movie",
  book: "Book",
  game: "VideoGame",
  restaurant: "Restaurant",
  exhibition: "Event",
  travel: "LocalBusiness",
  other: "Product",
  goodies: "Product",
  finance: "Service",
  // 한글 키 대응 (Legacy fallback)
  "영화": "Movie",
  "책": "Book",
  "게임": "VideoGame",
  "맛집": "Restaurant",
  "전시회": "Event",
  "여행": "LocalBusiness",
  "기타": "Product"
};
