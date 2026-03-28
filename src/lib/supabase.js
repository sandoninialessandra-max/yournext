import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce'
  }
})

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ 
    provider: 'google', 
    options: { 
      redirectTo: window.location.origin,
      skipBrowserRedirect: false
    } 
  })

export const signOut = () => supabase.auth.signOut()
export const getUser = () => supabase.auth.getUser()