import { neon } from '@netlify/neon';

const sql = neon();

const ADMIN_PIN = '1313';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { pin } = await req.json();
    if (pin !== ADMIN_PIN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await sql`DELETE FROM leaderboard`;

    return new Response(JSON.stringify({ ok: true, message: 'Leaderboard cleared' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = { path: '/api/leaderboard/clear' };
