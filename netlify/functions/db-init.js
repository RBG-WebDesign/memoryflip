import { neon } from '@netlify/neon';

const sql = neon();

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Create leaderboard table
    await sql`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        name VARCHAR(32) NOT NULL DEFAULT 'Anonymous',
        score INTEGER NOT NULL DEFAULT 0,
        round INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Create grand_prize_winners table
    await sql`
      CREATE TABLE IF NOT EXISTS grand_prize_winners (
        id SERIAL PRIMARY KEY,
        name VARCHAR(32) NOT NULL DEFAULT 'Anonymous',
        won_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Index for fast leaderboard queries
    await sql`CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gp_won_at ON grand_prize_winners (won_at)`;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config = { path: '/api/db-init' };
