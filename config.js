// Optional: connect a free Supabase project so the leaderboard is shared
// across every device instead of staying local to the one it was played on.
// Leave both values blank to keep the leaderboard on-device only (no setup
// required, works immediately).
//
// To enable syncing:
//   1. Create a free project at https://supabase.com
//   2. Open the SQL editor and run the snippet from the "Leaderboard setup"
//      section of README.md to create the `leaderboard` table
//   3. Go to Project Settings -> API and copy the "Project URL" and the
//      "anon public" key into the two fields below
window.TAPPLE_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};
