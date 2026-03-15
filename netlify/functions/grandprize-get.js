import { neon } from '@netlify/neon';

const sql = neon();

export default async () => {
  try {
    // Get today's winners (UTC-based day boundary)
    const rows = await sql`
      SELECT id, name, won_at
      FROM grand_prize_winners
      WHERE won_at::date = CURRENT_DATE
      ORDER BY won_at ASC
    `;
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = { path: '/api/grandprize' };
