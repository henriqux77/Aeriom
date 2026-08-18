const SUPABASE_URL = "https://xrofkyinattalxmirwdq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CM4mEo6GOLZvsKTKLiMU9A_N1bOjqAH";

window.supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

console.log("Aerion conectado ao Supabase!");