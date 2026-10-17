const express = require("express");
const router = express.Router();
const calendarController = require("../controllers/calendarController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/", calendarController.getEvents);
router.post("/", calendarController.createEvent);
router.post("/apply-plan", calendarController.applyPlanToCalendar);
router.delete("/:id", calendarController.deleteEvent);

module.exports = router;
