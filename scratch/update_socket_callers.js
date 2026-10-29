const fs = require('fs');

// 1. AchievementManager.tsx
let ach = fs.readFileSync('frontend/components/AchievementManager.tsx', 'utf8');
ach = ach.replace('getApiBaseUrl,', 'getSocketUrl,');
ach = ach.replace('socketIO(getApiBaseUrl(),', 'socketIO(getSocketUrl(),');
fs.writeFileSync('frontend/components/AchievementManager.tsx', ach);

// 2. NotificationContext.tsx
let notif = fs.readFileSync('frontend/context/NotificationContext.tsx', 'utf8');
notif = notif.replace('getApiBaseUrl,', 'getSocketUrl,');
notif = notif.replace('socketIO(getApiBaseUrl(),', 'socketIO(getSocketUrl(),');
fs.writeFileSync('frontend/context/NotificationContext.tsx', notif);

console.log('Updated AchievementManager and NotificationContext successfully');

