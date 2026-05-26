// ─────────────────────────────────────────────────────────
//  whatsapp.js — All outgoing WhatsApp message helpers
//  Uses Twilio to send messages to customers
// ─────────────────────────────────────────────────────────
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_NUMBER;
const RESTAURANT = process.env.RESTAURANT_NAME || "Our Restaurant";
const CURRENCY = process.env.CURRENCY_SYMBOL || "$";

// ── Core send function ────────────────────────────────────
async function send(to, body) {
  try {
    const msg = await client.messages.create({ from: FROM, to, body });
    console.log(`📤 Sent to ${to}: ${body.substring(0, 60)}...`);
    return msg;
  } catch (err) {
    console.error(`❌ Failed to send to ${to}:`, err.message);
    throw err;
  }
}

// ── Welcome Message ───────────────────────────────────────
async function sendWelcome(to) {
  const body =
    `👋 Welcome to *${RESTAURANT}!*\n\n` +
    `I'm your smart order assistant 🤖\n\n` +
    `What would you like to do?\n\n` +
    `  1️⃣  🍽️ View Menu & Order\n` +
    `  2️⃣  📦 Track My Order\n` +
    `  3️⃣  📞 Call Restaurant\n\n` +
    `_Reply with a number (1, 2, or 3)_`;
  return send(to, body);
}

// ── Category List ─────────────────────────────────────────
async function sendCategoryList(to, categories) {
  const list = categories
    .map((cat, i) => `  ${i + 1}. ${cat.emoji} ${cat.name}`)
    .join("\n");

  const body =
    `🗂️ *Choose a Category:*\n\n${list}\n\n` +
    `  0️⃣  🛒 View Cart\n` +
    `  ❌  Cancel Order\n\n` +
    `_Reply with a number_`;
  return send(to, body);
}

// ── Item List for a Category ──────────────────────────────
async function sendItemList(to, categoryName, items) {
  const list = items
    .map(
      (item, i) =>
        `  ${i + 1}. ${item.emoji} *${item.name}* — ${CURRENCY}${item.price.toFixed(2)}\n     _${item.desc}_`
    )
    .join("\n\n");

  const body =
    `${categoryName}\n\n${list}\n\n` +
    `  0️⃣  ◀️ Back to Categories\n\n` +
    `_Reply with a number to add to cart_`;
  return send(to, body);
}

// ── Item Added Confirmation ───────────────────────────────
async function sendItemAdded(to, item, cartCount) {
  const body =
    `✅ *${item.emoji} ${item.name}* added to cart!\n\n` +
    `🛒 You have *${cartCount} item(s)* in your cart.\n\n` +
    `What's next?\n` +
    `  1️⃣  ➕ Add More Items\n` +
    `  2️⃣  🛒 View Cart & Checkout`;
  return send(to, body);
}

// ── Cart Summary ──────────────────────────────────────────
async function sendCartSummary(to, cart) {
  if (cart.length === 0) {
    return send(to, `🛒 Your cart is empty!\n\nReply *menu* to start ordering.`);
  }

  const lines = cart
    .map((i) => `  ${i.emoji} ${i.name} ×${i.qty} — ${CURRENCY}${(i.price * i.qty).toFixed(2)}`)
    .join("\n");
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const body =
    `🛒 *Your Order Summary*\n` +
    `─────────────────────\n` +
    `${lines}\n` +
    `─────────────────────\n` +
    `💰 *Total: ${CURRENCY}${total.toFixed(2)}*\n\n` +
    `What would you like to do?\n` +
    `  1️⃣  ✅ Confirm & Enter Address\n` +
    `  2️⃣  ➕ Add More Items\n` +
    `  3️⃣  🗑️ Clear Cart`;
  return send(to, body);
}

// ── Ask for Delivery Address ──────────────────────────────
async function sendAddressRequest(to) {
  const body =
    `📍 *Delivery Address*\n\n` +
    `Please type your full delivery address, or reply with:\n\n` +
    `  📌 *LOCATION* — to share your saved address\n\n` +
    `_Example: House 12, Street 5, Gulshan-e-Iqbal, Karachi_`;
  return send(to, body);
}

// ── Order Confirmed ───────────────────────────────────────
async function sendOrderConfirmed(to, order) {
  const lines = order.items
    .map((i) => `  ${i.emoji} ${i.name} ×${i.qty}`)
    .join("\n");

  const body =
    `🎉 *Order Confirmed!*\n\n` +
    `📋 *Order ID: #${order.orderId}*\n` +
    `─────────────────────\n` +
    `${lines}\n` +
    `─────────────────────\n` +
    `💰 Total: *${CURRENCY}${order.total.toFixed(2)}*\n` +
    `📍 Delivery to: ${order.address}\n` +
    `💵 Payment: Cash on Delivery\n\n` +
    `⏱️ Estimated time: *25-35 minutes*\n\n` +
    `We'll send you updates on WhatsApp!\n` +
    `_Reply *status* anytime to check your order_`;
  return send(to, body);
}

// ── Status: Preparing ─────────────────────────────────────
async function sendPreparingUpdate(to, orderId) {
  const body =
    `👨‍🍳 *Your order is being prepared!*\n\n` +
    `📋 Order #${orderId}\n\n` +
    `🔄 Status: *Preparing*\n\n` +
    `Our chef is working on your delicious meal right now. ` +
    `We'll notify you when it's ready!\n\n` +
    `⏱️ Estimated: 15-20 minutes`;
  return send(to, body);
}

// ── Status: Ready ─────────────────────────────────────────
async function sendReadyUpdate(to, orderId) {
  const body =
    `✅ *Your order is ready!*\n\n` +
    `📋 Order #${orderId}\n\n` +
    `🔄 Status: *Ready for Pickup by Rider*\n\n` +
    `Your food is freshly prepared and waiting for our delivery rider.\n` +
    `You'll receive rider details shortly! 🛵`;
  return send(to, body);
}

// ── Status: Out for Delivery ──────────────────────────────
async function sendOutForDelivery(to, order) {
  const rider = order.rider;
  const stars = "⭐".repeat(Math.round(rider.rating || 5));

  const body =
    `🛵 *Your order is on the way!*\n\n` +
    `📋 Order #${order.orderId}\n\n` +
    `🔄 Status: *Out for Delivery*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🧑 *Rider: ${rider.name}*\n` +
    `📱 Phone: ${rider.phone}\n` +
    `🏍️ Vehicle: ${rider.bike}\n` +
    `${stars} Rating: ${rider.rating}/5\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📞 You can call your rider directly!\n` +
    `⏱️ Arriving in approximately *10-15 minutes*`;
  return send(to, body);
}

// ── Status: Delivered ─────────────────────────────────────
async function sendDeliveredUpdate(to, orderId) {
  const body =
    `🎉 *Order Delivered!*\n\n` +
    `📋 Order #${orderId}\n\n` +
    `✅ Your order has been delivered. Enjoy your meal!\n\n` +
    `─────────────────────\n` +
    `How was your experience?\n\n` +
    `  ⭐⭐⭐⭐⭐ Reply *5* — Excellent!\n` +
    `  ⭐⭐⭐⭐  Reply *4* — Good\n` +
    `  ⭐⭐⭐   Reply *3* — Average\n` +
    `  👎       Reply *bad* — Had issues\n\n` +
    `_Thank you for ordering from ${process.env.RESTAURANT_NAME}!_\n` +
    `_Reply *menu* to order again 🍽️_`;
  return send(to, body);
}

// ── Track Order Status ────────────────────────────────────
async function sendOrderStatus(to, order) {
  const statusEmojis = {
    "Order Received":    "📋",
    "Preparing":         "👨‍🍳",
    "Ready":             "✅",
    "Out for Delivery":  "🛵",
    "Delivered":         "🎉",
    "Cancelled":         "❌",
  };
  const emoji = statusEmojis[order.status] || "📋";

  const body =
    `${emoji} *Order Status*\n\n` +
    `📋 Order #${order.orderId}\n` +
    `🔄 Status: *${order.status}*\n` +
    `💰 Total: ${CURRENCY}${order.total.toFixed(2)}\n` +
    `📍 Delivering to: ${order.address}`;
  return send(to, body);
}

// ── Rating Thank You ──────────────────────────────────────
async function sendRatingThankYou(to, rating) {
  const messages = {
    "5": `💚 Thank you so much! Your 5-star rating means the world to us! See you next time! 🍽️`,
    "4": `😊 Thanks for the 4 stars! We'll keep working to make it perfect next time!`,
    "3": `🙏 Thanks for your feedback. We'll strive to do better!`,
    "bad": `😔 We're really sorry about that. Please call ${process.env.RESTAURANT_PHONE} and we'll make it right!`,
  };
  const msg = messages[rating] || `Thank you for your feedback! 🙏`;
  return send(to, msg);
}

module.exports = {
  send,
  sendWelcome,
  sendCategoryList,
  sendItemList,
  sendItemAdded,
  sendCartSummary,
  sendAddressRequest,
  sendOrderConfirmed,
  sendPreparingUpdate,
  sendReadyUpdate,
  sendOutForDelivery,
  sendDeliveredUpdate,
  sendOrderStatus,
  sendRatingThankYou,
};
