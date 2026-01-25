import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: any = null;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase configuration missing in environmental variables. Realtime features will be disabled.');
} else {
    try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
    }
}

export const supabase = supabaseClient;

