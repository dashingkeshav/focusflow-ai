require('dotenv').config();
const { pool } = require('./src/config/db');

async function check() {
  try {
    const rooms = await pool.query('SELECT count(*) FROM focus_rooms');
    const circles = await pool.query('SELECT count(*) FROM focus_circles');
    const roomMembers = await pool.query('SELECT count(*) FROM focus_room_members');
    const circleMembers = await pool.query('SELECT count(*) FROM focus_circle_members');
    console.log('DB COUNTS:', JSON.stringify({
      rooms: rooms.rows[0].count,
      circles: circles.rows[0].count,
      roomMembers: roomMembers.rows[0].count,
      circleMembers: circleMembers.rows[0].count
    }));
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('DB error:', err.message);
    process.exit(1);
  }
}
check();
