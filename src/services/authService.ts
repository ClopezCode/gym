import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type SignUpResult = {
  user: User | null
  session: Session | null
  error: AuthError | null
}

export type SignInResult = {
  user: User | null
  session: Session | null
  error: AuthError | null
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return {
    user: data.user,
    session: data.session,
    error,
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return {
    user: data.user,
    session: data.session,
    error,
  }
}

/**
 * Envía el correo con el enlace de recuperación. `redirectTo` debe estar dado
 * de alta en Supabase (Authentication → URL Configuration → Redirect URLs).
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  return { error }
}

/** Cambia la contraseña del usuario con sesión activa. */
export async function updatePassword(
  password: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password })
  return { error }
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('[auth] getSession', error.message)
    return null
  }
  return data.session
}

export function subscribeToAuthChanges(
  onChange: (session: Session | null) => void,
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session)
  })
  return subscription
}
