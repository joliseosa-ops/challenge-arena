export default async function handler(req, res) {
  try {
    const r = await fetch(
      'https://fplchallenge.premierleague.com/api/bootstrap-static/',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!r.ok) { res.status(r.status).json({ error: r.statusText }); return; }
    const data = await r.json();
    const events = data.events || [];
    const pick = e => e ? { id: e.id, name: e.name, deadline_time: e.deadline_time, finished: !!e.finished } : null;
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({
      current_event: pick(events.find(e => e.is_current)),
      next_event:    pick(events.find(e => e.is_next)),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
