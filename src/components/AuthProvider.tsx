import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '../contexts/auth-context'
import * as authService from '../services/authService'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void authService.getSession().then((initial) => {
      if (!cancelled) {
        setSession(initial)
        setIsLoading(false)
      }
    })

    const subscription = authService.subscribeToAuthChanges((next) => {
      setSession(next)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authService.signInWithEmail(email, password)
    return error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { user, session: nextSession, error } =
      await authService.signUpWithEmail(email, password)
    const needsEmailConfirmation = Boolean(user && !nextSession && !error)
    return { error, needsEmailConfirmation }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await authService.signOut()
    return error
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await authService.sendPasswordResetEmail(
      email,
      `${window.location.origin}/reset-password`,
    )
    return error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await authService.updatePassword(password)
    return error
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [
      session,
      isLoading,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
