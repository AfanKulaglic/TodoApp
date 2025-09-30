import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://kertmyfofotuwzozocdc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcnRteWZvZm90dXd6b3pvY2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzI2MDksImV4cCI6MjA3NDY0ODYwOX0.n1EdvOU9xI2MieYhUy0evvSz_Shkn-v5xHFKT5sWlqI'
)
