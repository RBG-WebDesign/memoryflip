import { neon } from '@netlify/neon';

const sql = neon();

export default async () => {
  try {
    const rows = await sql`
      SELECT name, score, round, created_at
      FROM leaderboard
      ORDER BY score DESC
      LIMIT 500
    `;
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = { path: '/api/leaderboard' };
