import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://owdblekgugkdcoqaeldd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NWEbLSDD9_taFAqj3S4FYw_bMHQjWL0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
