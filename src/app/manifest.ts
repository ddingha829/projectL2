import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '티끌 ticgle',
    short_name: '티끌',
    description: '티끌 모아 반짝이는, 일상 매거진',
    start_url: '/',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#ff4804',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
