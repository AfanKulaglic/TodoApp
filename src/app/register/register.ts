import { supabase } from "../lib/supabaseClient"

export async function register(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) throw error
  return data
}