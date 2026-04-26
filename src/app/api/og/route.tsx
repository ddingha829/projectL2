import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get('title') || '티끌 ticgle';
    const author = searchParams.get('author') || '티끌러';
    const category = searchParams.get('category') || '매거진';
    const imageUrl = searchParams.get('imageUrl');

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            backgroundColor: '#fff',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #f1f5f9 2%, transparent 0%), radial-gradient(circle at 75px 75px, #f1f5f9 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            padding: '60px',
          }}
        >
          {/* Logo / Brand */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ backgroundColor: '#ff4804', width: '32px', height: '32px', borderRadius: '8px', marginRight: '12px' }} />
            <span style={{ fontSize: '24px', fontWeight: 900, color: '#000', letterSpacing: '-0.05em' }}>TICGLE.</span>
          </div>

          <div style={{ display: 'flex', width: '100%', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', marginBottom: '20px' }}>
                <span style={{ backgroundColor: '#000', color: '#fff', padding: '4px 12px', fontSize: '18px', fontWeight: 800, borderRadius: '4px' }}>
                  {category}
                </span>
              </div>
              
              <h1 style={{ fontSize: '64px', fontWeight: 900, color: '#000', lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.02em', display: 'flex' }}>
                {title}
              </h1>
              
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginRight: '12px' }}>👤</div>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#64748b' }}>{author}</span>
              </div>
            </div>

            {imageUrl && (
              <div style={{ display: 'flex', flex: 1, height: '400px' }}>
                <img 
                  src={imageUrl} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} 
                />
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
