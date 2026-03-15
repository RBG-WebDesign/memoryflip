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

    // Delete only today's winners
    await sql`DELETE FROM grand_prize_winners WHERE won_at::date = CURRENT_DATE`;

    return new Response(JSON.stringify({ ok: true, message: 'Today\'s grand prize winners reset' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = { path: '/api/grandprize/reset' };
