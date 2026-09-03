import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabasePublicKey } from './supabase-public';
let client: ReturnType<typeof createClient> | undefined;
export function browserDatabase() {
 return client ??= createClient(supabaseUrl,supabasePublicKey);
}
