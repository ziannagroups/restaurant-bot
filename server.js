// ═════════════════════════════════════════════════════════
//  server.js — Main Entry Point
//  WhatsApp Restaurant Order Management System
//  Built with Express, Twilio, MongoDB
// ═════════════════════════════════════════════════════════
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { handleMessage } = require("./src/bot");
const dashboardRoutes = require("./src/dashboard");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Required for Twilio webhooks

// ── Database Connection ───────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err.message));

// ── Health Check ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: `${process.env.RESTAURANT_NAME} WhatsApp Bot`,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ── WhatsApp Webhook ──────────────────────────────────────
// Twilio sends POST requests here when a customer messages you
// Set this URL in your Twilio Console:
// https://console.twilio.com → Messaging → WhatsApp Sandbox → Webhook
app.post("/webhook", async (req, res) => {
  // Respond immediately with 200 OK so Twilio doesn't retry
  res.status(200).send("OK");

  // Extract message details from Twilio's request body
  const from = req.body.From;    // e.g. "whatsapp:+923001234567"
  const body = req.body.Body;    // the message text

  if (!from || !body) {
    console.log("⚠️ Webhook received without From or Body");
    return;
  }

  // Handle the message asynchronously
  try {
    await handleMessage(from, body);
  } catch (err) {
    console.error(`❌ Error handling message from ${from}:`, err);
  }
});

// ── Dashboard API ─────────────────────────────────────────
// REST API for your restaurant dashboard
// All routes require ?secret=YOUR_DASHBOARD_SECRET
app.use("/api", dashboardRoutes);

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍽️  ══════════════════════════════════════`);
  console.log(`🔥  ${process.env.RESTAURANT_NAME}`);
  console.log(`🚀  Server running on port ${PORT}`);
  console.log(`📡  Webhook: POST /webhook`);
  console.log(`🖥️   Dashboard API: GET /api/orders`);
  console.log(`🌐  Health: GET /`);
  console.log(`🍽️  ══════════════════════════════════════\n`);
});

module.exports = app;
