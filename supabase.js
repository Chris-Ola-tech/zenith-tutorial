// ============================================================
//  SUPABASE CONFIGURATION
//  Paste your Supabase Project URL and Anon Key here.
//  You get these from: supabase.com → Your Project → Settings → API
// ============================================================

const SUPABASE_URL  = 'https://dzcmvgngpfwoueehowub.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Y212Z25ncGZ3b3VlZWhvd3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDMzOTUsImV4cCI6MjA5MDIxOTM5NX0.ouKaKTLSQOhrHq_9R1RDXD3dvnURtSk8xB4WdXAOn78';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
