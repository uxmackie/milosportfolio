// Shared, atomic page-view total. Credentials stay on the server.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ status: 'method_not_allowed' });
  }
  const { SITE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
  let origin, storage;
  try {
    origin = new URL(SITE_URL).origin;
    storage = new URL(UPSTASH_REDIS_REST_URL);
    if (!UPSTASH_REDIS_REST_TOKEN || storage.protocol !== 'https:') throw new Error();
  } catch {
    return res.status(503).json({ status: 'not_configured' });
  }
  // Browser writes must originate from this site. The counter is not unique visitors.
  if (req.method === 'POST' && req.headers?.origin !== origin) {
    return res.status(403).json({ status: 'forbidden' });
  }
  const key = `milo:views:${origin}`;
  try {
    const response = await fetch(storage.href, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([req.method === 'POST' ? 'INCR' : 'GET', key]),
      signal: AbortSignal.timeout(6000),
    });
    const body = await response.json();
    if (!response.ok || body.error) throw new Error();
    const raw = body.result;
    const views = raw === null && req.method === 'GET' ? 0
      : typeof raw === 'number' ? raw
      : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isSafeInteger(views) || views < 0) throw new Error();
    return res.status(200).json({ views });
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  }
};
