const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const collaborationController = require("../controllers/collaborationController");

// All collaboration routes require authentication
router.use(authMiddleware);

/*
=====================================================
1. FOCUS ROOMS
=====================================================
*/
router.get("/rooms", collaborationController.listRooms);
router.post("/rooms", collaborationController.createRoom);
router.get("/rooms/code/:code", collaborationController.getRoomByCode);
router.get("/rooms/:id", collaborationController.getRoomDetails);
router.post("/rooms/:id/join", collaborationController.joinRoom);
router.post("/rooms/:id/leave", collaborationController.leaveRoom);
router.patch("/rooms/:id", collaborationController.updateRoom);
router.post("/rooms/:id/remove-member", collaborationController.removeMember);
router.post("/rooms/:id/timer", collaborationController.controlRoomTimer);
router.post("/rooms/:id/session/start", collaborationController.startRoomSession);
router.post("/rooms/:id/session/complete", collaborationController.completeRoomSession);
router.get("/rooms/:id/messages", collaborationController.getRoomMessages);
router.post("/rooms/:id/messages", collaborationController.postRoomMessage);

/*
=====================================================
2. FOCUS CIRCLES
=====================================================
*/
router.get("/circles", collaborationController.listCircles);
router.post("/circles", collaborationController.createCircle);
router.get("/circles/code/:code", collaborationController.getCircleByCode);
router.post("/circles/code/:code/accept", collaborationController.acceptCircleInvite);
router.get("/circles/:id", collaborationController.getCircleDetails);
router.get("/circles/:id/history", collaborationController.getCircleHistory);
router.post("/circles/:id/members/remove", collaborationController.removeCircleMember);
router.post("/circles/:id/commitments", collaborationController.setCircleCommitment);
router.post("/circles/:id/commitments/check-in", collaborationController.checkInCircleCommitment);
router.post("/circles/:id/archive", collaborationController.archiveCircle);

/*
=====================================================
3. PROJECT PODS
=====================================================
*/
router.get("/pods", collaborationController.listPods);
router.post("/pods", collaborationController.createPod);
router.get("/pods/code/:code", collaborationController.getPodByCode);
router.post("/pods/code/:code/accept", collaborationController.acceptPodInvite);
router.get("/pods/:id", collaborationController.getPodDetails);
router.post("/pods/:id/milestones", collaborationController.createPodMilestone);
router.patch("/pods/:id/milestones/:milestoneId", collaborationController.updatePodMilestone);
router.delete("/pods/:id/milestones/:milestoneId", collaborationController.deletePodMilestone);
router.post("/pods/:id/tasks", collaborationController.createPodTask);
router.patch("/pods/:id/tasks/:taskId", collaborationController.updatePodTask);
router.delete("/pods/:id/tasks/:taskId", collaborationController.deletePodTask);
router.post("/pods/:id/members/remove", collaborationController.removePodMember);
router.post("/pods/:id/archive", collaborationController.archivePod);
router.post("/pods/:id/launch-room", collaborationController.launchRoomFromPod);

/*
=====================================================
4. UNBLOCK EXCHANGE
=====================================================
*/
router.get("/unblock", collaborationController.listUnblockRequests);
router.post("/unblock", collaborationController.createUnblockRequest);
router.get("/unblock/:id", collaborationController.getUnblockDetails);
router.post("/unblock/:id/offer", collaborationController.offerHelp);
router.delete("/unblock/:id/offers/:offerId", collaborationController.deleteOffer);
router.post("/unblock/:id/accept-offer", collaborationController.acceptOffer);
router.post("/unblock/:id/resolve", collaborationController.resolveUnblockRequest);
router.post("/unblock/:id/cancel", collaborationController.cancelUnblockRequest);
router.post("/unblock/:id/launch-room", collaborationController.launchRoomFromUnblock);

module.exports = router;
