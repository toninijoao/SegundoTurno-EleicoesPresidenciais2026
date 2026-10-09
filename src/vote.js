const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export async function fetchTally() {
  const r = await fetch(`${URL}/rest/v1/tally?select=candidate,total`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!r.ok) throw new Error('tally')
  const rows = await r.json()
  const out = { lula: 0, flavio: 0 }
  rows.forEach((x) => {
    out[x.candidate] = Number(x.total)
  })
  return out
}

function googleToken() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('google_unavailable'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'openid',
      callback: (res) => (res.access_token ? resolve(res.access_token) : reject(new Error(res.error || 'google'))),
      error_callback: (err) => reject(new Error(err.type || 'google')),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

export async function castVote(candidate) {
  const token = await googleToken()
  const r = await fetch(`${URL}/functions/v1/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ token, candidate }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.result || 'error')
  return data.result
}