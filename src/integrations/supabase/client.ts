import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = 'https://itdihklxnfycbouotuad.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZGloa2x4bmZ5Y2JvdW90dWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTkzMTksImV4cCI6MjA2ODE5NTMxOX0.v1jk7nCtgihpYM6E7B9mnB5Qkybal-xdCYLTy-TQ0M0'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)