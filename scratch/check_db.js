const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { query } = require('../backend/src/config/db');

async function check() {
  try {
    const rooms = await query('SELECT count(*) FROM focus_rooms');
    const circles = await query('SELECT count(*) FROM focus_circles');
    const roomMembers = await query('SELECT count(*) FROM focus_room_members');
    const circleMembers = await query('SELECT count(*) FROM focus_circle_members');
    console.log('DB COUNTS:', JSON.stringify({
      rooms: rooms.rows[0].count,
      circles: circles.rows[0].count,
      roomMembers: roomMembers.rows[0].count,
      circleMembers: circleMembers.rows[0].count
    }));
    process.exit(0);
  } catch (err) {
    console.error('DB error:', err.message);
    process.exit(1);
  }
}
check();

