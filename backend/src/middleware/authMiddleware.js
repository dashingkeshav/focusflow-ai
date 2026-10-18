const jwt = require("jsonwebtoken");

const { getValidatedJwtSecret } = require("../utils/jwtSecurity");
const JWT_SECRET = getValidatedJwtSecret();



function authMiddleware(
  req,
  res,
  next
) {

  try {

    // =================================================
    // GET AUTHORIZATION HEADER
    // =================================================

    const authHeader =
      req.headers.authorization;


    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {

      return res.status(401).json({
        success: false,
        message:
          "Authorization required.",
      });
    }


    // =================================================
    // GET TOKEN
    // =================================================

    const token =
      authHeader.substring(7).trim();


    if (!token) {

      return res.status(401).json({
        success: false,
        message:
          "Authentication token is missing.",
      });
    }


    // =================================================
    // VERIFY JWT
    // =================================================

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );


    // =================================================
    // VALIDATE USER ID
    // =================================================

    if (!decoded || !decoded.id) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token.",
      });
    }


    // =================================================
    // ATTACH AUTHENTICATED USER
    // =================================================

    req.user = {
      id: decoded.id,
      email: decoded.email || null,
    };


    next();

  } catch (error) {

    console.error(
      "Authentication error:",
      error.message
    );


    if (
      error.name === "TokenExpiredError"
    ) {

      return res.status(401).json({
        success: false,
        message:
          "Authentication token has expired.",
      });
    }


    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired authentication token.",
    });
  }
}


module.exports =
  authMiddleware;