import { neon } from '@netlify/neon';

const sql = neon();

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { name, score, round } = await req.json();

    if (typeof score !== 'number' || score < 0) {
      return new Response(JSON.stringify({ error: 'Invalid score' }), { status: 400 });
    }

    const safeName = String(name || 'Anonymous').slice(0, 32);
    const safeRound = Math.max(1, Math.min(8, Number(round) || 1));

    const [row] = await sql`
      INSERT INTO leaderboard (name, score, round)
      VALUES (${safeName}, ${score}, ${safeRound})
      RETURNING id, name, score, round, created_at
    `;

    return new Response(JSON.stringify(row), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = { path: '/api/leaderboard/add' };
