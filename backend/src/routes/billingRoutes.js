const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const billingController = require("../controllers/billingController");

const router = express.Router();

router.use(authMiddleware);
router.post("/subscriptions", billingController.createSubscription);
router.post("/verify", billingController.verifyCheckout);
router.get("/subscription", billingController.getSubscription);
router.get("/entitlements", billingController.getEntitlements);
router.post("/subscription/cancel", billingController.cancelSubscription);
router.post("/subscription/sync", billingController.syncSubscription);

module.exports = router;
