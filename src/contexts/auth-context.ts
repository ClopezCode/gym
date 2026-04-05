import { createContext } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'

export type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<AuthError | null>
  signUp: (email: string, password: string) => Promise<{
    error: AuthError | null
    needsEmailConfirmation: boolean
  }>
  signOut: () => Promise<AuthError | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
