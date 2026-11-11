/* global process */
// Ping quotidien (cron Vercel) : une lecture légère en base suffit
// à éviter la mise en pause automatique du projet Supabase gratuit.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return res.status(500).json({ ok: false, error: 'Variables Supabase manquantes' })

  try {
    const r = await fetch(`${url}/rest/v1/game_state?select=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() })
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message })
  }
}
