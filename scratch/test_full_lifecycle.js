const fetch = global.fetch;

const TOKEN1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3N2UzYWExLTBmMjAtNDgwMi1hOTk4LWJjZjdhNWI1ZGIyYiIsImVtYWlsIjoidmVyaWZ5XzE3OTMyNTY0NTYxMzlAZ21haWwuY29tIiwiaWF0IjoxNzkzMjU2NDU3LCJleHAiOjE3OTM4NjEyNTd9.k9wusxt0PVyvdjuWJzqs_r0cYYB5nNtR-R0EHqcpW3I';

async function testFullCollabLifecycle() {
  console.log('--- 1. VERIFY INITIAL DB CLEAN STATE ---');
  const initialRooms = await fetch('https://focusflow-ai-api.onrender.com/api/collaboration/rooms', {
    headers: { Authorization: 'Bearer ' + TOKEN1 }
  }).then(r => r.json());
  console.log('Initial rooms count:', initialRooms.rooms.length);

  const initialCircles = await fetch('https://focusflow-ai-api.onrender.com/api/collaboration/circles', {
    headers: { Authorization: 'Bearer ' + TOKEN1 }
  }).then(r => r.json());
  console.log('Initial circles count:', initialCircles.circles.length);

  console.log('--- 2. CREATE A FRESH CIRCLE ---');
  const createCircleRes = await fetch('https://focusflow-ai-api.onrender.com/api/collaboration/circles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + TOKEN1
    },
    body: JSON.stringify({
      name: 'Test Algorithms Cohort',
      category: 'Coding',
      description: 'Daily LeetCode practice'
    })
  }).then(r => r.json());
  console.log('Created circle:', createCircleRes.success, 'Invite Code:', createCircleRes.circle?.invite_code);
  const inviteCode = createCircleRes.circle?.invite_code;

  console.log('--- 3. CREATE A FRESH FOCUS ROOM ---');
  const createRoomRes = await fetch('https://focusflow-ai-api.onrender.com/api/collaboration/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + TOKEN1
    },
    body: JSON.stringify({
      title: '25m Deep Work Sprint',
      category: 'Coding',
      session_duration: 25,
      is_private: false
    })
  }).then(r => r.json());
  console.log('Created room:', createRoomRes.success, 'Room Invite Code:', createRoomRes.room?.invite_code);

  console.log('--- 4. CLEAN RESET AFTER VERIFICATION ---');
  // Wipe test records as user requested fresh database
  const resetRes = await fetch('https://focusflow-ai-api.onrender.com/api/collaboration/reset-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + TOKEN1
    }
  }).then(r => r.json());
  console.log('Reset all response:', resetRes);

  const finalRooms = await fetch('https://focusflow-ai-api.onrender.com/api/collaboration/rooms', {
    headers: { Authorization: 'Bearer ' + TOKEN1 }
  }).then(r => r.json());
  console.log('Final rooms count in DB:', finalRooms.rooms.length);

  const finalCircles = await fetch('https://focusflow-ai-api.onrender.com/api/collaboration/circles', {
    headers: { Authorization: 'Bearer ' + TOKEN1 }
  }).then(r => r.json());
  console.log('Final circles count in DB:', finalCircles.circles.length);
}

testFullCollabLifecycle().catch(console.error);
