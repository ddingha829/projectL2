import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. 유저 인증 체크 (서버 부하 감소를 위해 핵심 경로만 세션 체크)
  // 중요:getUser() 호출 시 생기는 딜레이나 에러가 페이지 로딩을 막지 않도록 함
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // /write 나 /admin 같은 보호된 경로는 여기서 미리 가드 가능 (선택 사항)
    if (request.nextUrl.pathname.startsWith('/write') && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch (e) {
    // 인증 실패 시 크래시 방지
    console.error('Middleware auth error:', e)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청에 대해 미들웨어 실행:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public 폴더 안의 정적 파일들
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
