const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const TMDB_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MGJmYzBhMGNkNGZjMzZjNTcyYWY2ODI3MzU0N2Y0MiIsIm5iZiI6MTc3NzgwNjU3MS4zNTgsInN1YiI6IjY5ZjcyY2ViOWNiMzc2MTI2MjkxNzQ5NyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.DiwTWzgHnEsX5mA-T7fQanB5A9LVAEOPvns4Nz08V-4";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!query.trim()) return [];

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&language=ko-KR&include_adult=false`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('TMDB API request failed');
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("TMDB Search Error:", error);
    return [];
  }
}

export function getTMDBImageUrl(path: string | null) {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}${path}`;
}
