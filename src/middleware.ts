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

  // 1. 유저 인증 체크 최적화
  const { pathname } = request.nextUrl
  const protectedRoutes = ['/write', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isLoginPage = pathname.startsWith('/login')

  try {
    if (isProtectedRoute || isLoginPage) {
      const { data: { user } } = await supabase.auth.getUser()
      if (isProtectedRoute && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      if (isLoginPage && user) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } else {
      // 일반 페이지는 가벼운 세션 정보 확인만 수행하여 응답 속도 확보
      await supabase.auth.getSession()
    }
  } catch (e) {
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
