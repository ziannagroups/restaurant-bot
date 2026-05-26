// ─────────────────────────────────────────────────────────
//  dashboard.js — REST API for the Restaurant Dashboard
//  These endpoints are used by the dashboard UI to:
//    • List all orders
//    • Update order status (triggers WhatsApp notification)
//    • View order details
//    • Get stats
// ─────────────────────────────────────────────────────────
const express = require("express");
const router = express.Router();
const { Order } = require("./models");
const wa = require("./whatsapp");

// ── Simple auth middleware ────────────────────────────────
// Add ?secret=YOUR_DASHBOARD_SECRET to all API calls
// Or set Authorization: Bearer YOUR_DASHBOARD_SECRET header
function auth(req, res, next) {
  const secret = process.env.DASHBOARD_SECRET;
  const provided =
    req.query.secret ||
    (req.headers.authorization || "").replace("Bearer ", "");

  if (secret && provided !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── GET /api/orders — List all orders ────────────────────
router.get("/orders", auth, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = status ? { status } : {};

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders/:id — Single order ───────────────────
router.get("/orders/:orderId", auth, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/orders/:id/status — Update order status ───
// This is the KEY endpoint — called when you click buttons
// in your dashboard, and automatically sends WhatsApp message
router.patch("/orders/:orderId/status", auth, async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = [
      "Order Received",
      "Preparing",
      "Ready",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const prevStatus = order.status;
    order.status = status;
    if (note) order.statusHistory[order.statusHistory.length - 1].note = note;
    await order.save();

    console.log(`📦 Order #${order.orderId}: ${prevStatus} → ${status}`);

    // ── Send WhatsApp notification to customer ────────────
    const customerPhone = order.customerPhone;
    let notificationSent = false;

    try {
      if (status === "Preparing") {
        await wa.sendPreparingUpdate(customerPhone, order.orderId);
        notificationSent = true;
      } else if (status === "Ready") {
        await wa.sendReadyUpdate(customerPhone, order.orderId);
        notificationSent = true;
      } else if (status === "Out for Delivery") {
        await wa.sendOutForDelivery(customerPhone, order);
        notificationSent = true;
      } else if (status === "Delivered") {
        await wa.sendDeliveredUpdate(customerPhone, order.orderId);
        notificationSent = true;
      } else if (status === "Cancelled") {
        await wa.send(
          customerPhone,
          `❌ *Order #${order.orderId} has been cancelled.*\n\nWe're sorry for the inconvenience. Please call ${process.env.RESTAURANT_PHONE} for more information.`
        );
        notificationSent = true;
      }
    } catch (waErr) {
      // Don't fail the whole request if WhatsApp send fails
      console.error(`⚠️ WhatsApp notification failed:`, waErr.message);
    }

    res.json({
      success: true,
      order,
      notificationSent,
      message: `Order status updated to "${status}"`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/orders/:id/rider — Assign a rider ─────────
router.patch("/orders/:orderId/rider", auth, async (req, res) => {
  try {
    const { name, phone, bike, rating } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.rider = { name, phone, bike, rating: rating || 5.0 };
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stats — Dashboard statistics ────────────────
router.get("/stats", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      activeOrders,
      deliveredOrders,
      revenue,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ status: { $in: ["Order Received", "Preparing", "Ready", "Out for Delivery"] } }),
      Order.countDocuments({ status: "Delivered" }),
      Order.aggregate([
        { $match: { status: "Delivered" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    const todayRevenue = await Order.aggregate([
      { $match: { status: "Delivered", createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        todayOrders,
        activeOrders,
        deliveredOrders,
        totalRevenue: revenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/orders/:id — Cancel/delete order ─────────
router.delete("/orders/:orderId", auth, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status: "Cancelled" },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    await wa.send(
      order.customerPhone,
      `❌ Your order #${order.orderId} has been cancelled. We apologize!\nCall us: ${process.env.RESTAURANT_PHONE}`
    );

    res.json({ success: true, message: "Order cancelled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
