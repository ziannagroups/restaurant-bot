// ─────────────────────────────────────────────────────────
//  models.js — MongoDB schemas for Orders and Sessions
// ─────────────────────────────────────────────────────────
const mongoose = require("mongoose");

// ── Cart Item ─────────────────────────────────────────────
const CartItemSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  name:  { type: String, required: true },
  price: { type: Number, required: true },
  qty:   { type: Number, required: true, default: 1 },
  emoji: { type: String, default: "🍽️" },
});

// ── Order ─────────────────────────────────────────────────
const OrderSchema = new mongoose.Schema(
  {
    orderId:       { type: String, required: true, unique: true },
    customerPhone: { type: String, required: true },   // e.g. whatsapp:+923001234567
    customerName:  { type: String, default: "Customer" },
    items:         [CartItemSchema],
    total:         { type: Number, required: true },
    address:       { type: String, required: true },
    status: {
      type: String,
      enum: ["Order Received", "Preparing", "Ready", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Order Received",
    },
    rider: {
      id:    String,
      name:  String,
      phone: String,
      bike:  String,
      rating: Number,
    },
    statusHistory: [
      {
        status:    String,
        timestamp: { type: Date, default: Date.now },
        note:      String,
      },
    ],
  },
  { timestamps: true }
);

// Auto-push to statusHistory whenever status changes
OrderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});

const Order = mongoose.model("Order", OrderSchema);

// ── Conversation Session ──────────────────────────────────
// Tracks where each customer is in the ordering flow
const SessionSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    stage: {
      type: String,
      enum: [
        "welcome",
        "browsing_categories",
        "browsing_items",
        "cart_review",
        "awaiting_address",
        "order_placed",
      ],
      default: "welcome",
    },
    activeCategory: { type: String, default: null },
    cart:           { type: [CartItemSchema], default: [] },
    lastActivity:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Sessions expire after 30 minutes of inactivity
SessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 1800 });

const Session = mongoose.model("Session", SessionSchema);

module.exports = { Order, Session };
