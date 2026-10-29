const fs = require('fs');
let code = fs.readFileSync('frontend/app/dashboard/focus-rooms/[id]/page.tsx', 'utf8');

// 1. Import getSocketUrl
code = code.replace(
  "  getApiBaseUrl,\n  type FocusRoom,",
  "  getApiBaseUrl,\n  getSocketUrl,\n  type FocusRoom,"
);

// 2. Change socketIO(getApiBaseUrl(), ...) to socketIO(getSocketUrl(), ...)
code = code.replace(
  "const socket = socketIO(getApiBaseUrl(), {",
  "const socket = socketIO(getSocketUrl(), {"
);

// 3. Add reconnect listener & room_session_state listener
const oldSocketBlock = `    socket.on('connect', () => {
      socket.emit('join_focus_room', { roomId });
    });`;

const newSocketBlock = `    socket.on('connect', () => {
      socket.emit('join_focus_room', { roomId });
    });

    socket.on('reconnect', () => {
      socket.emit('join_focus_room', { roomId });
      fetchCollaborationRoomDetails(roomId).then((res) => {
        if (res.success && res.room) {
          setTimerStatus(res.room.timer_status);
          setTimerStartTime(res.room.timer_start_time || null);
          setTimerElapsed(res.room.timer_elapsed_seconds || 0);
          setTimerDuration(res.room.timer_duration_seconds || 1500);
          setParticipants(res.participants || []);
        }
      }).catch(() => {});
    });

    socket.on('room_session_state', (payload: any) => {
      if (payload.roomId === roomId) {
        setTimerStatus(payload.status);
        setTimerStartTime(payload.timerStartTime);
        setTimerElapsed(payload.timerElapsedSeconds);
        setTimerDuration(payload.timerDurationSeconds);
        if (payload.status === 'completed') {
          setShowSummaryModal(true);
        }
      }
    });`;

code = code.replace(oldSocketBlock, newSocketBlock);

// 4. Add periodic synchronization fallback (every 4 seconds) to ensure real-time consistency
const oldLoadEffect = `  useEffect(() => {
    loadRoom();
    loadMessages();
  }, [roomId, user?.id]);`;

const newLoadEffect = `  useEffect(() => {
    loadRoom();
    loadMessages();

    // Background synchronization fallback to keep host and participants 100% in sync
    const interval = setInterval(() => {
      fetchCollaborationRoomDetails(roomId).then((res) => {
        if (res.success && res.room) {
          setTimerStatus(res.room.timer_status);
          setTimerStartTime(res.room.timer_start_time || null);
          setTimerElapsed(res.room.timer_elapsed_seconds || 0);
          setTimerDuration(res.room.timer_duration_seconds || 1500);
          setParticipants(res.participants || []);
          if (res.room.timer_status === 'completed') {
            setShowSummaryModal(true);
          }
        }
      }).catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [roomId, user?.id]);`;

code = code.replace(oldLoadEffect, newLoadEffect);

// 5. Update handleTimerAction signature & host buttons
code = code.replace(
  "const handleTimerAction = async (action: 'start' | 'pause' | 'resume' | 'reset') => {",
  "const handleTimerAction = async (action: 'start' | 'pause' | 'resume' | 'reset' | 'complete') => {"
);

// 6. Add End Session button for the host
const oldResetButton = `              <button
                onClick={() => handleTimerAction('reset')}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold px-4 py-3 rounded-2xl border border-white/10 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>`;

const newResetAndEndButtons = `              {(timerStatus === 'running' || timerStatus === 'paused') && (
                <button
                  onClick={() => handleTimerAction('complete')}
                  className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-bold px-5 py-3 rounded-2xl border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>End Session</span>
                </button>
              )}

              <button
                onClick={() => handleTimerAction('reset')}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold px-4 py-3 rounded-2xl border border-white/10 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>`;

code = code.replace(oldResetButton, newResetAndEndButtons);

fs.writeFileSync('frontend/app/dashboard/focus-rooms/[id]/page.tsx', code);
console.log('Successfully updated focus-rooms/[id]/page.tsx');

