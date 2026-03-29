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
  
  const signUpParams = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('displayName') as string,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    }
  }

  const { data, error } = await supabase.auth.signUp(signUpParams)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
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
    redirect('/login?error=' + encodeURIComponent('비밀번호 재설정을 위해 위에 이메일을 먼저 입력해 주세요.'))
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent('비밀번호 재설정 이메일 발송에 실패했습니다: ' + error.message))
  }

  redirect('/login?message=reset_sent')
}
