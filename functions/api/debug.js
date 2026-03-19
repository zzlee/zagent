// functions/api/debug.js
export async function onRequest(context) {
  const { env } = context;
  const db = env.zagent_db || env.DB; // Try both bindings just in case

  if (!db) {
    return new Response(JSON.stringify({ 
      error: "No database binding found. Check your wrangler.toml and dev command.",
      available_env: Object.keys(env)
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // 1. List all tables
    const { results: tables } = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    // 2. Check users table specifically
    let usersCount = null;
    let usersError = null;
    try {
      const result = await db.prepare("SELECT count(*) as count FROM users").first();
      usersCount = result.count;
    } catch (e) {
      usersError = e.message;
    }

    return new Response(JSON.stringify({
      status: "success",
      binding_used: env.zagent_db ? "zagent_db" : "DB",
      has_google_client_id: !!env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      tables: tables.map(t => t.name),
      users_table: {
        count: usersCount,
        error: usersError
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "Query failed", 
      message: err.message,
      stack: err.stack
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
