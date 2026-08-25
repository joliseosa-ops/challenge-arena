export default async function handler(req, res) {
  const { entry } = req.query;
  if (!entry) { res.status(400).json({ error: 'entry required' }); return; }
  try {
    const r = await fetch(
      `https://fplchallenge.premierleague.com/api/entry/${entry}/history/`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!r.ok) { res.status(r.status).json({ error: r.statusText }); return; }
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
