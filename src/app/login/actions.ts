'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=' + encodeURIComponent('이메일 또는 비밀번호가 일치하지 않습니다.'))
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const origin = (await headers()).get('origin')
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string

  if (!displayName || displayName.trim().length === 0) {
    redirect('/signup?error=' + encodeURIComponent('닉네임을 입력해 주세요.'))
  }

  if (password.length < 6) {
    redirect('/signup?error=' + encodeURIComponent('비밀번호는 최소 6자 이상이어야 합니다.'))
  }

  const signUpParams = {
    email,
    password,
    options: {
      data: {
        full_name: displayName.trim(),
      },
      emailRedirectTo: `${origin}/auth/callback`,
    }
  }

  const { data, error } = await supabase.auth.signUp(signUpParams)

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')

  // 이메일 인증 OFF면 session이 자동 생성되므로 로그아웃 후 안내 메시지 표시
  if (data.session) {
    await supabase.auth.signOut()
  }

  redirect('/login?message=signup_success')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  const email = formData.get('email') as string

  if (!email) {
    redirect('/login?error=' + encodeURIComponent('비밀번호 재설정을 위해 이메일을 입력해 주세요.'))
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent('비밀번호 재설정 이메일 발송에 실패했습니다: ' + error.message))
  }

  redirect('/login?message=reset_sent')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent('구글 로그인에 실패했습니다.'))
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signInWithKakao() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent('카카오 로그인에 실패했습니다.'))
  }

  if (data.url) {
    redirect(data.url)
  }
}
