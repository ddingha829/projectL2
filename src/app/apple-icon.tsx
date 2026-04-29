import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '티끌 ticgle';
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: '#ff4804',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '22%', 
          fontWeight: 900,
        }}
      >
        T
      </div>
    ),
    {
      ...size,
    }
  );
}
