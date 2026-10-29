const fs = require('fs');
let code = fs.readFileSync('frontend/app/dashboard/focus-circles/page.tsx', 'utf8');

// 1. Import getSocketUrl
code = code.replace(
  "  getApiBaseUrl,\n  type FocusCircle,",
  "  getApiBaseUrl,\n  getSocketUrl,\n  type FocusCircle,"
);

// 2. Change socketIO(getApiBaseUrl(), ...) to socketIO(getSocketUrl(), ...)
code = code.replace(
  "const socket = socketIO(getApiBaseUrl(), {",
  "const socket = socketIO(getSocketUrl(), {"
);

// 3. Add reconnect, member_joined, member_left listeners
const oldSocketCircleBlock = `    socket.on('connect', () => {
      socket.emit('join_focus_circle', { circleId: selectedCircleId });
    });

    socket.on('circle_commitment_updated', () => {
      loadCircleDetails(selectedCircleId);
    });

    socket.on('circle_checkin_updated', () => {
      loadCircleDetails(selectedCircleId);
    });`;

const newSocketCircleBlock = `    socket.on('connect', () => {
      socket.emit('join_focus_circle', { circleId: selectedCircleId });
    });

    socket.on('reconnect', () => {
      socket.emit('join_focus_circle', { circleId: selectedCircleId });
      loadCircleDetails(selectedCircleId);
    });

    socket.on('circle_commitment_updated', () => {
      loadCircleDetails(selectedCircleId);
    });

    socket.on('circle_checkin_updated', () => {
      loadCircleDetails(selectedCircleId);
    });

    socket.on('circle_member_joined', () => {
      loadCircleDetails(selectedCircleId);
    });

    socket.on('circle_member_left', () => {
      loadCircleDetails(selectedCircleId);
    });`;

code = code.replace(oldSocketCircleBlock, newSocketCircleBlock);

// 4. Add periodic polling fallback (every 5 seconds) for selected circle
const oldSelectedEffect = `  useEffect(() => {
    if (selectedCircleId) {
      loadCircleDetails(selectedCircleId);
    }
  }, [selectedCircleId]);`;

const newSelectedEffect = `  useEffect(() => {
    if (selectedCircleId) {
      loadCircleDetails(selectedCircleId);

      const interval = setInterval(() => {
        loadCircleDetails(selectedCircleId);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedCircleId]);`;

code = code.replace(oldSelectedEffect, newSelectedEffect);

fs.writeFileSync('frontend/app/dashboard/focus-circles/page.tsx', code);
console.log('Successfully updated focus-circles/page.tsx');

