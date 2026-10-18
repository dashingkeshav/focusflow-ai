/**
 * Socket.IO Real-time Hub for Collaboration Features
 * Provides authenticated, room-scoped broadcasting for Focus Rooms, Focus Circles, Project Pods, and Unblock Exchange.
 */

function broadcastToRoom(io, roomId, event, data) {
  if (!io || !roomId) return;
  try {
    io.to(`collab_room:${roomId}`).emit(event, data);
  } catch (err) {
    console.warn(`[SocketHub] Failed to broadcast to room ${roomId}:`, err.message);
  }
}

function broadcastToPod(io, podId, event, data) {
  if (!io || !podId) return;
  try {
    io.to(`collab_pod:${podId}`).emit(event, data);
  } catch (err) {
    console.warn(`[SocketHub] Failed to broadcast to pod ${podId}:`, err.message);
  }
}

function broadcastToCircle(io, circleId, event, data) {
  if (!io || !circleId) return;
  try {
    io.to(`collab_circle:${circleId}`).emit(event, data);
  } catch (err) {
    console.warn(`[SocketHub] Failed to broadcast to circle ${circleId}:`, err.message);
  }
}

function broadcastToUnblock(io, requestId, event, data) {
  if (!io || !requestId) return;
  try {
    io.to(`collab_unblock:${requestId}`).emit(event, data);
  } catch (err) {
    console.warn(`[SocketHub] Failed to broadcast to unblock ${requestId}:`, err.message);
  }
}

function notifyUser(io, userId, event, data) {
  if (!io || !userId) return;
  try {
    io.to(`user:${userId}`).emit(event, data);
  } catch (err) {
    console.warn(`[SocketHub] Failed to notify user ${userId}:`, err.message);
  }
}

module.exports = {
  broadcastToRoom,
  broadcastToPod,
  broadcastToCircle,
  broadcastToUnblock,
  notifyUser,
};
