import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function requireViteEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `Variable de entorno requerida ausente o vacía: ${String(key)}. ` +
        'Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.',
    )
  }
  return value
}

/**
 * Cliente de Supabase para el navegador (anon key).
 * Cuando generes tipos con la CLI, usa: createClient<Database>(...)
 */
export const supabase: SupabaseClient = createClient(
  requireViteEnv('VITE_SUPABASE_URL'),
  requireViteEnv('VITE_SUPABASE_ANON_KEY'),
)
