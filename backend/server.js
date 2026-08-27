require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const {
  testDatabaseConnection,
} = require("./src/config/db");

const authRoutes =
  require("./src/routes/authRoutes");

const sessionRoutes =
  require("./src/routes/sessionRoutes");

const focusRoutes =
  require("./src/routes/focusRoutes");

const analyticsRoutes =
  require("./src/routes/analyticsRoutes");


const app = express();

const server =
  http.createServer(app);


const PORT =
  Number(process.env.PORT) ||
  5001;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:3000";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "change_this_secret_in_environment";


/* =====================================================
   CORS
===================================================== */

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);


/* =====================================================
   BODY
===================================================== */

app.use(
  express.json({
    limit: "2mb",
  })
);


/* =====================================================
   SOCKET.IO
===================================================== */

const io =
  new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: [
        "GET",
        "POST",
      ],
      credentials: true,
    },
  });


app.set("io", io);


/* =====================================================
   SOCKET AUTH
===================================================== */

io.use(
  (socket, next) => {

    try {

      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization
          ?.split(" ")[1];


      if (!token) {
        return next(
          new Error(
            "Authentication required"
          )
        );
      }


      const decoded =
        jwt.verify(
          token,
          JWT_SECRET
        );


      if (!decoded.id) {
        return next(
          new Error(
            "Invalid authentication token"
          )
        );
      }


      socket.userId =
        decoded.id;

      socket.userEmail =
        decoded.email;


      next();

    } catch (error) {

      console.error(
        "[Socket auth]",
        error.message
      );

      next(
        new Error(
          "Invalid or expired token"
        )
      );
    }
  }
);


/* =====================================================
   SOCKET CONNECTION
===================================================== */

io.on(
  "connection",
  (socket) => {

    const userId =
      socket.userId;


    console.log(
      `[Socket.io] User ${userId} connected`
    );


    socket.join(
      `user:${userId}`
    );


    socket.on(
      "telemetry_signal",
      (data = {}) => {

        const tabSwitches =
          Math.max(
            0,
            Number(data.tabSwitches) || 0
          );


        const idleTimeSeconds =
          Math.max(
            0,
            Number(
              data.idleTimeSeconds
            ) || 0
          );


        const keyboardRate =
          Math.max(
            0,
            Number(
              data.keyboardRate
            ) || 0
          );


        const mouseRate =
          Math.max(
            0,
            Number(
              data.mouseRate
            ) || 0
          );


        const cameraDistractions =
          Math.max(
            0,
            Number(
              data.cameraDistractions
            ) || 0
          );


        const sessionId =
          typeof data.sessionId === "string"
            ? data.sessionId
            : null;


        let score = 100;


        score -=
          tabSwitches * 4;


        score -=
          cameraDistractions * 10;


        score -=
          Math.floor(
            idleTimeSeconds / 10
          ) * 1.5;


        if (
          keyboardRate > 15 &&
          keyboardRate < 120
        ) {
          score += 5;
        }


        if (
          mouseRate > 5 &&
          mouseRate < 60
        ) {
          score += 3;
        }


        score = Math.max(
          0,
          Math.min(
            100,
            Math.round(score)
          )
        );


        const isDistracted =
          tabSwitches >= 5 ||
          cameraDistractions >= 2 ||
          idleTimeSeconds >= 120 ||
          score < 65;


        let alertMessage =
          null;


        if (
          cameraDistractions >= 2
        ) {

          alertMessage =
            `Camera alert: ${cameraDistractions} look-away events detected.`;

        } else if (
          tabSwitches >= 5
        ) {

          alertMessage =
            `High tab-switching rate detected (${tabSwitches} switches).`;

        } else if (
          idleTimeSeconds >= 120
        ) {

          alertMessage =
            `Inactivity detected for ${Math.floor(
              idleTimeSeconds / 60
            )} minutes.`;

        } else if (
          score < 65
        ) {

          alertMessage =
            `Focus score dropped to ${score}. Return to your study task.`;
        }


        io
          .to(`user:${userId}`)
          .emit(
            "focus_score_update",
            {
              timestamp: Date.now(),
              userId,
              sessionId,
              score,
              isDistracted,
              alertMessage,
              tabSwitches,
              idleTimeSeconds,
              cameraDistractions,
            }
          );
      }
    );


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
                data.sessionId ||
                null,

              warningNumber:
                Number(
                  data.warningNumber
                ) || 1,

              reason:
                data.reason ||
                "Distraction detected",

              timestamp:
                Date.now(),
            }
          );
      }
    );


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
                data.sessionId ||
                null,

              domain:
                data.domain ||
                null,

              timestamp:
                Date.now(),
            }
          );
      }
    );


    socket.on(
      "disconnect",
      (reason) => {

        console.log(
          `[Socket.io] User ${userId} disconnected: ${reason}`
        );
      }
    );
  }
);


/* =====================================================
   DATABASE
===================================================== */

async function startServer() {

  try {

    await testDatabaseConnection();


    /* =================================================
       API ROUTES
    ================================================= */

    app.use(
      "/api/auth",
      authRoutes
    );


    app.use(
      "/api/sessions",
      sessionRoutes
    );


    app.use(
      "/api/focus",
      focusRoutes
    );


    app.use(
      "/api/analytics",
      analyticsRoutes
    );


    /* =================================================
       HEALTH
    ================================================= */

    app.get(
      "/api/health",
      async (req, res) => {

        res.json({
          status: "healthy",

          system:
            "FocusFlow AI Backend",

          database:
            "Supabase PostgreSQL",

          timestamp:
            new Date().toISOString(),

          version:
            "3.0.0",
        });
      }
    );


    /* =================================================
       404
    ================================================= */

    app.use(
      (req, res) => {

        res.status(404).json({
          success: false,

          message:
            `Route not found: ${req.method} ${req.originalUrl}`,
        });
      }
    );


    /* =================================================
       SERVER
    ================================================= */

    server.listen(
      PORT,
      () => {

        console.log(
          "================================================="
        );

        console.log(
          `🚀 FocusFlow AI Backend running on port ${PORT}`
        );

        console.log(
          `🌐 API: http://localhost:${PORT}/api`
        );

        console.log(
          `❤️ Health: http://localhost:${PORT}/api/health`
        );

        console.log(
          `🌐 Frontend: ${FRONTEND_URL}`
        );

        console.log(
          "🗄️ Database: Supabase PostgreSQL"
        );

        console.log(
          "🔐 JWT authentication: enabled"
        );

        console.log(
          "🔌 Socket.io: enabled"
        );

        console.log(
          "================================================="
        );
      }
    );

  } catch (error) {

    console.error(
      "❌ Backend startup failed:"
    );

    console.error(
      error
    );

    process.exit(1);
  }
}


server.on(
  "error",
  (error) => {

    console.error(
      "Server error:",
      error
    );

    process.exit(1);
  }
);


process.on(
  "SIGINT",
  () => {

    console.log(
      "\nShutting down..."
    );

    server.close(
      () => process.exit(0)
    );
  }
);


process.on(
  "SIGTERM",
  () => {

    server.close(
      () => process.exit(0)
    );
  }
);


startServer();