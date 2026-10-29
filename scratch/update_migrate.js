const fs = require('fs');
let c = fs.readFileSync('backend/src/config/migrate.js', 'utf8');

const target = `    -- Safe forward-only additions
    ALTER TABLE focus_rooms ADD COLUMN IF NOT EXISTS description text;`;

const replacement = `    -- Safe forward-only additions
    ALTER TABLE focus_rooms ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE focus_room_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    ALTER TABLE focus_circle_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

    CREATE INDEX IF NOT EXISTS idx_focus_room_members_presence
      ON focus_room_members (room_id, presence_status);

    CREATE INDEX IF NOT EXISTS idx_focus_room_members_active_session
      ON focus_room_members (active_session_id)
      WHERE active_session_id IS NOT NULL;`;

if (!c.includes('ALTER TABLE focus_room_members ADD COLUMN IF NOT EXISTS updated_at')) {
  c = c.replace(target, replacement);
  fs.writeFileSync('backend/src/config/migrate.js', c);
  console.log('Updated migrate.js');
} else {
  console.log('Already updated');
}

