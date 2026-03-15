import { neon } from '@netlify/neon';

const sql = neon();

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { name } = await req.json();
    const safeName = String(name || 'Anonymous').slice(0, 32);

    const [row] = await sql`
      INSERT INTO grand_prize_winners (name)
      VALUES (${safeName})
      RETURNING id, name, won_at
    `;

    return new Response(JSON.stringify(row), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = { path: '/api/grandprize/add' };
