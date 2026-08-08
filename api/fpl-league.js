export default async function handler(req, res) {
  const { league = '318', page = '1' } = req.query;
  try {
    const r = await fetch(
      `https://fplchallenge.premierleague.com/api/leagues-classic/${league}/standings/?page_standings=${page}`,
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
