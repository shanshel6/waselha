import { createClient } from '@supabase/supabase-js';

// For GitHub Pages (static hosting), we cannot rely on runtime env vars,
// so we use the known public URL and anon key directly.
const supabaseUrl = 'https://wqcmmjggxsducsbtyjaz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxY21tamdneHNkdWNzYnR5amF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzMzODgsImV4cCI6MjA4MDUwOTM4OH0.zXuyvjEmAswA9bDbRVbtrJZl1i9d-ZbRiufsTH4Idxo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);