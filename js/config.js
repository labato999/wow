const supabaseUrl = "https://udlkhxpgggozadbomxmk.supabase.co";
const supabaseAnonKey = "sb_publishable_1m9C5XBIjT57Cpg7XPiq9g_vWPq092-";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
window.supabaseClient = supabaseClient;