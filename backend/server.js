const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const dns = require("dns");
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const {
  pool,
  testDatabaseConnection,
} = require("./src/config/db");

const Session = require("./src/models/Session");
const focusStateStore = require("./src/utils/focusStateStore");
const { computeSessionMetrics } = require("./src/utils/focusMetrics");

const { runMigrations } = require("./src/config/migrate");

const authRoutes = require("./src/routes/authRoutes");
const sessionRoutes = require("./src/routes/sessionRoutes");
const focusRoutes = require("./src/routes/focusRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const contactRoutes = require("./src/routes/contact");
const plannerRoutes = require("./src/routes/plannerRoutes");
const goalRoutes = require("./src/routes/goalRoutes");
const achievementRoutes = require("./src/routes/achievementRoutes");
const calendarRoutes = require("./src/routes/calendarRoutes");
const insightsRoutes = require("./src/routes/insightsRoutes");
const taskRoutes = require("./src/routes/taskRoutes");
const billingRoutes = require("./src/routes/billingRoutes");
const billingController = require("./src/controllers/billingController");
const notificationRoutes = require("./src/routes/notificationRoutes");
const collaborationRoutes = require("./src/routes/collaborationRoutes");

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 5001;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "change_this_secret_in_environment";

/*
=====================================================
CORS
=====================================================
*/

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin === FRONTEND_URL) return true;
  if (process.env.APP_URL && origin === process.env.APP_URL) return true;
  if (origin.startsWith("chrome-extension://")) return true;

  try {
    const url = new URL(origin);
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname.startsWith("192.168.") ||
      url.hostname.startsWith("10.")
    ) {
      return true;
    }
  } catch (_) {
    // Ignore invalid URL
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));


app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json", limit: "2mb" }),
  billingController.handleWebhook,
);

app.post(
  "/api/billing/razorpay/webhook",
  express.raw({ type: "application/json", limit: "2mb" }),
  billingController.handleWebhook,
);

/*
=====================================================
BODY PARSER
=====================================================
*/

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

/*
=====================================================
SOCKET.IO
=====================================================
*/

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

/*
=====================================================
SOCKET AUTHENTICATION
=====================================================
*/

io.use((socket, next) => {
  try {
    const authToken =
      socket.handshake.auth?.token;

    const authorizationHeader =
      socket.handshake.headers?.authorization;

    const headerToken =
      authorizationHeader?.startsWith("Bearer ")
        ? authorizationHeader.split(" ")[1]
        : null;

    const token =
      authToken || headerToken;

    if (!token) {
      return next(
        new Error("Authentication required"),
      );
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET,
    );

    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.id
    ) {
      return next(
        new Error(
          "Invalid authentication token",
        ),
      );
    }

    socket.userId = decoded.id;
    socket.userEmail = decoded.email || null;

    next();
  } catch (error) {
    console.error(
      "[Socket auth]",
      error.message,
    );

    next(
      new Error(
        "Invalid or expired token",
      ),
    );
  }
});

/*
=====================================================
SOCKET CONNECTION
=====================================================
*/

io.on("connection", (socket) => {
  const userId = socket.userId;

  console.log(
    `[Socket.io] User ${userId} connected`,
  );

  socket.join(`user:${userId}`);

  /*
  -----------------------------------------------
  Telemetry signal
  -----------------------------------------------
  */

  /*
  -----------------------------------------------
  Telemetry signal — responds with the REAL
  persisted metrics for the user's active session.
  Client-supplied numbers are never scored; when
  nothing has been measured the score is null
  ("Not available"), never a fabricated 100.
  -----------------------------------------------
  */

  socket.on(
    "telemetry_signal",
    async (data = {}) => {
      try {
        const state = focusStateStore.activeState(userId);
        const sessionId =
          typeof data.sessionId === "string"
            ? data.sessionId
            : state?.sessionId || null;

        let payload = {
          timestamp: Date.now(),
          userId,
          sessionId: null,
          score: null,
          hasTelemetry: false,
          isDistracted: false,
          alertMessage: null,
          metrics: null,
        };

        if (sessionId) {
          const session = await Session.findOne({
            id: sessionId,
            userId,
          });

          if (session) {
            const metrics =
              await computeSessionMetrics(session);

            payload = {
              timestamp: Date.now(),
              userId,
              sessionId,
              score: metrics.focusScore,
              hasTelemetry: metrics.hasTelemetry,
              isDistracted: metrics.isDistracted,
              alertMessage: metrics.alertMessage,
              metrics,
            };
          }
        }

        io
          .to(`user:${userId}`)
          .emit("focus_score_update", payload);
      } catch (error) {
        console.error(
          "[Socket.io] telemetry_signal failed:",
          error.message,
        );
      }
    },
  );

  /*
  -----------------------------------------------
  Distraction warning
  -----------------------------------------------
  */

  socket.on(
    "distraction_warning",
    (data = {}) => {
      io
        .to(`user:${userId}`)
        .emit(
          "distraction_warning",
          {
            userId,

            sessionId:
              data.sessionId || null,

            warningNumber:
              Number(data.warningNumber) || 1,

            reason:
              data.reason ||
              "Distraction detected",

            timestamp: Date.now(),
          },
        );
    },
  );

  /*
  -----------------------------------------------
  Blocking activated
  -----------------------------------------------
  */

  socket.on(
    "blocking_activated",
    (data = {}) => {
      io
        .to(`user:${userId}`)
        .emit(
          "blocking_activated",
          {
            userId,

            sessionId:
              data.sessionId || null,

            domain:
              data.domain || null,

            timestamp: Date.now(),
          },
        );
    },
  );

  /*
  -----------------------------------------------
  Collaboration Suite: Focus Rooms
  -----------------------------------------------
  */

  socket.on("join_focus_room", async (data = {}) => {
    try {
      const roomId = data.roomId;
      if (!roomId) return;

      socket.join(`collab_room:${roomId}`);

      await pool.query(
        `UPDATE focus_room_members
         SET presence_status = 'online', left_at = NULL, updated_at = now()
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      ).catch(() => {});

      io.to(`collab_room:${roomId}`).emit("room_presence_update", {
        roomId,
        userId,
        status: "online",
      });

      // Send current authoritative timer status to joining user
      const r = await pool.query(
        `SELECT timer_status, timer_start_time, timer_elapsed_seconds, timer_duration_seconds
         FROM focus_rooms WHERE id = $1`,
        [roomId]
      );
      if (r.rows[0]) {
        socket.emit("room_timer_sync", {
          roomId,
          timerStatus: r.rows[0].timer_status,
          timerStartTime: r.rows[0].timer_start_time,
          timerElapsedSeconds: Number(r.rows[0].timer_elapsed_seconds) || 0,
          timerDurationSeconds: Number(r.rows[0].timer_duration_seconds) || 1500,
          serverTime: Date.now(),
        });
      }

      // Send recent messages to joining user
      const recentMsgs = await pool.query(
        `SELECT m.*, u.name as user_name
         FROM focus_room_messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.room_id = $1
         ORDER BY m.created_at DESC
         LIMIT 40`,
        [roomId]
      ).catch(() => ({ rows: [] }));

      socket.emit("room_recent_messages", {
        roomId,
        messages: (recentMsgs.rows || []).reverse(),
      });
    } catch (err) {
      console.warn("[Socket.io] join_focus_room error:", err.message);
    }
  });

  socket.on("leave_focus_room", async (data = {}) => {
    try {
      const roomId = data.roomId;
      if (!roomId) return;

      socket.leave(`collab_room:${roomId}`);

      await pool.query(
        `UPDATE focus_room_members
         SET presence_status = 'offline', updated_at = now()
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      ).catch(() => {});

      io.to(`collab_room:${roomId}`).emit("room_presence_update", {
        roomId,
        userId,
        status: "offline",
      });
    } catch (err) {
      console.warn("[Socket.io] leave_focus_room error:", err.message);
    }
  });

  socket.on("room_timer_control", async (data = {}) => {
    try {
      const { roomId, action, durationSeconds } = data;
      if (!roomId || !action) return;

      const roomRes = await pool.query(`SELECT * FROM focus_rooms WHERE id = $1`, [roomId]);
      if (roomRes.rows.length === 0) return;
      const room = roomRes.rows[0];

      if (room.host_user_id !== userId) {
        socket.emit("room_error", { message: "Only the host can control the room timer." });
        return;
      }

      let timerStatus = room.timer_status;
      let timerStartTime = room.timer_start_time;
      let timerElapsedSeconds = Number(room.timer_elapsed_seconds) || 0;
      let timerDuration = Number(durationSeconds) || Number(room.timer_duration_seconds) || 1500;
      const now = new Date();

      if (action === "start") {
        timerStatus = "running";
        timerStartTime = now;
        timerElapsedSeconds = 0;
      } else if (action === "pause") {
        if (timerStatus === "running" && timerStartTime) {
          const added = Math.floor((now.getTime() - new Date(timerStartTime).getTime()) / 1000);
          timerElapsedSeconds += Math.max(0, added);
        }
        timerStatus = "paused";
        timerStartTime = null;
      } else if (action === "resume") {
        timerStatus = "running";
        timerStartTime = now;
      } else if (action === "reset") {
        timerStatus = "idle";
        timerStartTime = null;
        timerElapsedSeconds = 0;
      } else if (action === "complete") {
        timerStatus = "completed";
        timerStartTime = null;
        timerElapsedSeconds = timerDuration;
      }

      await pool.query(
        `UPDATE focus_rooms
         SET timer_status = $1, timer_start_time = $2, timer_elapsed_seconds = $3, timer_duration_seconds = $4, updated_at = now()
         WHERE id = $5`,
        [timerStatus, timerStartTime, timerElapsedSeconds, timerDuration, roomId]
      );

      io.to(`collab_room:${roomId}`).emit("room_timer_sync", {
        roomId,
        timerStatus,
        timerStartTime,
        timerElapsedSeconds,
        timerDurationSeconds: timerDuration,
        serverTime: Date.now(),
      });
    } catch (err) {
      console.warn("[Socket.io] room_timer_control error:", err.message);
    }
  });

  socket.on("send_room_message", async (data = {}) => {
    try {
      const { roomId, content, messageType = "chat" } = data;
      if (!roomId || !content || !content.trim()) return;

      const mCheck = await pool.query(
        `SELECT 1 FROM focus_room_members WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [roomId, userId]
      );
      if (mCheck.rows.length === 0) return;

      const msgRes = await pool.query(
        `INSERT INTO focus_room_messages (room_id, user_id, content, message_type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [roomId, userId, content.trim().slice(0, 500), messageType]
      );

      const userRes = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
      const message = {
        ...msgRes.rows[0],
        user_name: userRes.rows[0]?.name || "Collaborator",
      };

      io.to(`collab_room:${roomId}`).emit("room_message_broadcast", message);
    } catch (err) {
      console.warn("[Socket.io] send_room_message error:", err.message);
    }
  });

  socket.on("join_project_pod", async (data = {}) => {
    try {
      const podId = data.podId;
      if (!podId) return;

      const check = await pool.query(
        `SELECT 1 FROM project_pod_members WHERE pod_id = $1 AND user_id = $2 AND status = 'active'`,
        [podId, userId]
      );
      if (check.rows.length > 0) {
        socket.join(`collab_pod:${podId}`);
      }
    } catch (err) {
      console.warn("[Socket.io] join_project_pod error:", err.message);
    }
  });

  socket.on("leave_project_pod", (data = {}) => {
    if (data.podId) socket.leave(`collab_pod:${data.podId}`);
  });

  socket.on("join_focus_circle", async (data = {}) => {
    try {
      const circleId = data.circleId;
      if (!circleId) return;

      const check = await pool.query(
        `SELECT 1 FROM focus_circle_members WHERE circle_id = $1 AND user_id = $2 AND status = 'active'`,
        [circleId, userId]
      );
      if (check.rows.length > 0) {
        socket.join(`collab_circle:${circleId}`);
      }
    } catch (err) {
      console.warn("[Socket.io] join_focus_circle error:", err.message);
    }
  });

  socket.on("leave_focus_circle", (data = {}) => {
    if (data.circleId) socket.leave(`collab_circle:${data.circleId}`);
  });

  socket.on("join_unblock_exchange", async (data = {}) => {
    try {
      const requestId = data.requestId;
      if (!requestId) return;

      socket.join(`collab_unblock:${requestId}`);
    } catch (err) {
      console.warn("[Socket.io] join_unblock_exchange error:", err.message);
    }
  });

  socket.on("leave_unblock_exchange", (data = {}) => {
    if (data.requestId) socket.leave(`collab_unblock:${data.requestId}`);
  });

  /*
  -----------------------------------------------
  Disconnect
  -----------------------------------------------
  */

  socket.on(
    "disconnect",
    async (reason) => {
      console.log(
        `[Socket.io] User ${userId} disconnected: ${reason}`,
      );
      try {
        const rooms = await pool.query(
          `SELECT room_id FROM focus_room_members WHERE user_id = $1 AND presence_status = 'online'`,
          [userId]
        );
        for (const row of rooms.rows) {
          await pool.query(
            `UPDATE focus_room_members SET presence_status = 'offline', updated_at = now() WHERE room_id = $1 AND user_id = $2`,
            [row.room_id, userId]
          );
          io.to(`collab_room:${row.room_id}`).emit("room_presence_update", {
            roomId: row.room_id,
            userId,
            status: "offline",
          });
        }
      } catch (_) {}
    },
  );
});

/*
=====================================================
START SERVER
=====================================================
*/

function sanitizeError(err) {
  if (!err) return "Unknown startup error";
  const message = err.message || String(err);
  return message
    .replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:******@")
    .replace(/(?:password|jwt_secret|token|secret)\s*[:=]\s*['"]?[^'"\s&]+/gi, "******");
}

let cleanupPromise = null;

function cleanupResources() {
  if (cleanupPromise) {
    return cleanupPromise;
  }

  cleanupPromise = (async () => {
    // 1. Close Socket.io first and await it so open WebSocket connections do not block server.close()
    try {
      if (io) {
        await new Promise((resolve) => {
          try {
            io.close(() => resolve());
          } catch (_) {
            resolve();
          }
        });
      }
    } catch (_) {}

    // 2. Close HTTP server only if it is actually listening
    try {
      if (server.listening) {
        await new Promise((resolve) => {
          server.close(() => resolve());
        });
      }
    } catch (_) {}

    // 3. Drain and end PostgreSQL pool once
    try {
      if (pool && !pool.ending && !pool.ended) {
        await pool.end();
      }
    } catch (_) {}
  })();

  return cleanupPromise;
}

let shutdownPromise = null;

function coordinateShutdown(exitCode = 0) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    try {
      await cleanupResources();
    } finally {
      process.exit(exitCode);
    }
  })();

  return shutdownPromise;
}

let isStarting = false;

async function startServer() {
  if (isStarting || server.listening) {
    return;
  }
  isStarting = true;

  try {
    /*
    -----------------------------------------------
    API ROUTES
    -----------------------------------------------
    */

    app.use(
      "/api/auth",
      authRoutes,
    );

    app.use(
      "/api/billing",
      billingRoutes,
    );

    app.use(
      "/api/sessions",
      sessionRoutes,
    );

    app.use(
      "/api/focus",
      focusRoutes,
    );

    app.use(
      "/api/analytics",
      analyticsRoutes,
    );

    /*
    Contact API
    POST /api/contact
    */

    app.use(
      "/api/contact",
      contactRoutes,
    );

    app.use(
      "/api/planner",
      plannerRoutes,
    );

    app.use(
      "/api/goals",
      goalRoutes,
    );

    app.use(
      "/api/achievements",
      achievementRoutes,
    );

    app.use(
      "/api/tasks",
      taskRoutes,
    );

app.use(
  "/api/calendar",
  calendarRoutes,
);

app.use(
  "/api/insights",
  insightsRoutes,
);

app.use(
  "/api/notifications",
  notificationRoutes,
);

app.use(
  "/api/collaboration",
  collaborationRoutes,
);

    /*
    -----------------------------------------------
    Health
    -----------------------------------------------
    */

    app.get(
      "/api/health",
      async (_req, res) => {
        let dbStatus = "connected";
        try {
          // Bounded fast query with 2s timeout
          const dbPromise = pool.query("SELECT 1 AS alive");
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database check timeout")), 2000)
          );
          await Promise.race([dbPromise, timeoutPromise]);
        } catch (_) {
          dbStatus = "disconnected";
        }

        const isHealthy = dbStatus === "connected";
        res.status(isHealthy ? 200 : 503).json({
          success: isHealthy,
          status: isHealthy ? "healthy" : "degraded",
          system: "FocusFlow AI Backend",
          database: dbStatus,
          timestamp: new Date().toISOString(),
          version: "3.0.0",
        });
      },
    );

    /*
    -----------------------------------------------
    Root
    -----------------------------------------------
    */

    app.get("/", (_req, res) => {
      res.status(200).json({
        success: true,
        message:
          "FocusFlow AI backend is running.",
        api: `http://localhost:${PORT}/api`,
      });
    });

    /*
    -----------------------------------------------
    404
    -----------------------------------------------
    */

    app.use(
      (req, res) => {
        res.status(404).json({
          success: false,
          message:
            `Route not found: ${req.method} ${req.originalUrl}`,
        });
      },
    );

    /*
    -----------------------------------------------
    Global error handler — ALWAYS responds with JSON
    (Express's default handler returns HTML, which
    breaks clients expecting a JSON API)
    -----------------------------------------------
    */

    // eslint-disable-next-line no-unused-vars
    app.use(
      (err, req, res, _next) => {
        const status =
          err.status || err.statusCode || (err.name === "MulterError" ? 400 : 500);

        const message =
          err.type === "entity.too.large"
            ? "Request payload too large."
            : err.code === "LIMIT_FILE_SIZE"
              ? "File size exceeds the 10MB limit."
              : err.message || "Internal server error.";

        console.error(
          `[${req.method} ${req.originalUrl}] Error ${status}:`,
          err.message,
        );

        if (res.headersSent) {
          return;
        }

        res.status(status).json({
          success: false,
          message,
        });
      },
    );

    /*
    -----------------------------------------------
    Database connectivity & migrations
    Must succeed before accepting requests
    -----------------------------------------------
    */

    await testDatabaseConnection();
    await runMigrations();
    console.log("🗄️ Database & migrations ready");

    /*
    -----------------------------------------------
    Start HTTP server
    -----------------------------------------------
    */

    await new Promise((resolve, reject) => {
      const onError = (err) => {
        server.removeListener("listening", onListening);
        reject(err);
      };
      const onListening = () => {
        server.removeListener("error", onError);
        resolve();
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(PORT);
    });

    // Handle unexpected server errors after successful startup
    server.on("error", async (error) => {
      console.error(
        "Server error:",
        sanitizeError(error),
      );

      await coordinateShutdown(1);
    });

    console.log(
      "=================================================",
    );

    console.log(
      `🚀 FocusFlow AI Backend running on port ${PORT}`,
    );

    console.log(
      `🌐 API: http://localhost:${PORT}/api`,
    );

    console.log(
      `❤️ Health: http://localhost:${PORT}/api/health`,
    );

    console.log(
      `📨 Contact: http://localhost:${PORT}/api/contact`,
    );

    console.log(
      `🌐 Frontend: ${FRONTEND_URL}`,
    );

    console.log(
      "🔐 JWT authentication: enabled",
    );

    console.log(
      "🔌 Socket.io: enabled",
    );

    console.log(
      "=================================================",
    );
  } catch (error) {
    console.error(
      "❌ Backend startup failed:",
      sanitizeError(error),
    );

    await coordinateShutdown(1);
  }
}

/*
=====================================================
GRACEFUL SHUTDOWN
=====================================================
*/

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  coordinateShutdown(0);
});

process.on("SIGTERM", () => {
  coordinateShutdown(0);
});

/*
=====================================================
START
=====================================================
*/

startServer();
