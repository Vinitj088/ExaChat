import { createClient } from '@supabase/supabase-js';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Helper function to check if we're on the client side
export const isClient = typeof window !== 'undefined';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Use implicit flow which works better with Next.js
    flowType: 'implicit',
    // Enable debug logging in development
    debug: process.env.NODE_ENV === 'development',
    // Callbacks for session events
    ...(isClient && {
      async onAuthStateChange(event: AuthChangeEvent, session: Session | null) {
        console.log('Supabase Auth State Change:', event, session?.user?.email);
      }
    })
  },
  // Global error handler
  global: {
    headers: {
      'x-client-info': 'exachat-web-app'
    }
  }
});

// For server-side operations with service role (admin)
export const getServiceSupabase = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseServiceKey);
}; 