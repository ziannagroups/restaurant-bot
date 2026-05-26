// ─────────────────────────────────────────────────────────
//  bot.js — Conversation engine
//  Handles every incoming WhatsApp message and routes
//  the customer through the ordering flow
// ─────────────────────────────────────────────────────────
const { v4: uuidv4 } = require("uuid");
const { Order, Session } = require("./models");
const wa = require("./whatsapp");
const { MENU, getAvailableRider, getItemById } = require("./menu");

// Short order ID (6 uppercase chars)
const makeOrderId = () => uuidv4().replace(/-/g, "").toUpperCase().slice(0, 6);

// ── Get or create a session for a customer ────────────────
async function getSession(phone) {
  let session = await Session.findOne({ phone });
  if (!session) {
    session = new Session({ phone, stage: "welcome", cart: [] });
    await session.save();
  }
  session.lastActivity = new Date();
  return session;
}

// ── Save session ──────────────────────────────────────────
async function saveSession(session) {
  session.lastActivity = new Date();
  await session.save();
}

// ── Format cart total ─────────────────────────────────────
function cartTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

// ── Main message handler ──────────────────────────────────
// Called by the webhook for every incoming message
async function handleMessage(from, body) {
  const text = (body || "").trim().toLowerCase();
  const session = await getSession(from);

  console.log(`📩 [${from}] Stage: ${session.stage} | Message: "${body}"`);

  // ── Global commands (work from any stage) ──────────────
  if (text === "menu" || text === "hi" || text === "hello" || text === "start") {
    session.stage = "browsing_categories";
    session.cart = [];
    await saveSession(session);
    await wa.sendWelcome(from);
    return;
  }

  if (text === "status") {
    const order = await Order.findOne({ customerPhone: from }).sort({ createdAt: -1 });
    if (order) {
      await wa.sendOrderStatus(from, order);
    } else {
      await wa.send(from, `❌ No recent orders found.\n\nReply *menu* to place a new order!`);
    }
    return;
  }

  if (text === "cancel" || text === "❌") {
    session.stage = "welcome";
    session.cart = [];
    await saveSession(session);
    await wa.send(from, `✅ Order cancelled.\n\nReply *menu* whenever you're ready to order again! 🍽️`);
    return;
  }

  // ── Stage-based routing ────────────────────────────────
  switch (session.stage) {

    // ── Welcome / Main Menu ─────────────────────────────
    case "welcome": {
      await wa.sendWelcome(from);
      session.stage = "browsing_categories";
      await saveSession(session);
      break;
    }

    // ── Browsing Categories ─────────────────────────────
    case "browsing_categories": {
      if (text === "1") {
        // View Menu
        await wa.sendCategoryList(from, MENU.categories);
      } else if (text === "2") {
        // Track Order
        const order = await Order.findOne({ customerPhone: from }).sort({ createdAt: -1 });
        if (order) {
          await wa.sendOrderStatus(from, order);
        } else {
          await wa.send(from, `📦 No orders found.\n\nReply *1* to place your first order!`);
        }
      } else if (text === "3") {
        await wa.send(from, `📞 *${process.env.RESTAURANT_NAME}*\nCall us: ${process.env.RESTAURANT_PHONE}\n\nWe're open 10am–11pm daily!`);
      } else if (["1","2","3","4"].includes(text)) {
        // Direct category selection (1=pizza, 2=burgers, 3=salads, 4=drinks)
        const catIndex = parseInt(text) - 1;
        const category = MENU.categories[catIndex];
        if (category) {
          session.activeCategory = category.id;
          session.stage = "browsing_items";
          await saveSession(session);
          const items = MENU.items[category.id];
          await wa.sendItemList(from, `${category.emoji} *${category.name}*`, items);
        }
      } else {
        // Unrecognized input — show menu
        await wa.sendCategoryList(from, MENU.categories);
        session.stage = "browsing_categories";
        await saveSession(session);
      }
      break;
    }

    // ── Browsing Items in a Category ────────────────────
    case "browsing_items": {
      const items = MENU.items[session.activeCategory];

      if (text === "0") {
        // Back to categories
        session.stage = "browsing_categories";
        await saveSession(session);
        await wa.sendCategoryList(from, MENU.categories);
        break;
      }

      const itemIndex = parseInt(text) - 1;
      if (!isNaN(itemIndex) && items && items[itemIndex]) {
        const item = items[itemIndex];

        // Add to cart (or increment qty if already there)
        const existing = session.cart.find((i) => i.id === item.id);
        if (existing) {
          existing.qty += 1;
        } else {
          session.cart.push({ id: item.id, name: item.name, price: item.price, emoji: item.emoji, qty: 1 });
        }

        const totalItems = session.cart.reduce((s, i) => s + i.qty, 0);
        await saveSession(session);
        await wa.sendItemAdded(from, item, totalItems);
        session.stage = "cart_review";
        await saveSession(session);
      } else {
        await wa.send(from, `⚠️ Invalid choice. Please reply with a number from the list.`);
        // Re-show items
        if (items) await wa.sendItemList(from, session.activeCategory, items);
      }
      break;
    }

    // ── Cart Review ─────────────────────────────────────
    case "cart_review": {
      if (text === "1") {
        // Confirm & proceed to address
        session.stage = "awaiting_address";
        await saveSession(session);
        await wa.sendCartSummary(from, session.cart);
        await wa.sendAddressRequest(from);
      } else if (text === "2") {
        // Add more items
        session.stage = "browsing_categories";
        await saveSession(session);
        await wa.sendCategoryList(from, MENU.categories);
      } else if (text === "3") {
        // Clear cart
        session.cart = [];
        session.stage = "browsing_categories";
        await saveSession(session);
        await wa.send(from, `🗑️ Cart cleared!\n\nReply *1* to browse the menu again.`);
      } else if (text === "cart" || text === "0") {
        await wa.sendCartSummary(from, session.cart);
      } else {
        await wa.sendCartSummary(from, session.cart);
      }
      break;
    }

    // ── Awaiting Delivery Address ───────────────────────
    case "awaiting_address": {
      if (!body || body.trim().length < 5) {
        await wa.send(from, `⚠️ Please enter a valid delivery address (at least 5 characters).`);
        break;
      }

      const address = body.trim();
      const total = cartTotal(session.cart);
      const orderId = makeOrderId();
      const rider = getAvailableRider();

      // Create order in database
      const order = new Order({
        orderId,
        customerPhone: from,
        items: session.cart,
        total,
        address,
        status: "Order Received",
        rider: {
          id: rider.id,
          name: rider.name,
          phone: rider.phone,
          bike: rider.bike,
          rating: rider.rating,
        },
        statusHistory: [{ status: "Order Received" }],
      });
      await order.save();

      // Reset session
      session.cart = [];
      session.stage = "order_placed";
      await saveSession(session);

      // Confirm to customer
      await wa.sendOrderConfirmed(from, order);

      console.log(`🎉 New order #${orderId} from ${from} — $${total.toFixed(2)}`);
      break;
    }

    // ── Post-Order Stage ────────────────────────────────
    case "order_placed": {
      // Handle rating replies
      if (["5", "4", "3", "bad"].includes(text)) {
        await wa.sendRatingThankYou(from, text);
        session.stage = "welcome";
        await saveSession(session);
      } else if (text === "status") {
        const order = await Order.findOne({ customerPhone: from }).sort({ createdAt: -1 });
        if (order) await wa.sendOrderStatus(from, order);
      } else {
        await wa.send(
          from,
          `👋 Your order has been placed! Reply *status* to track it, or *menu* to order again.`
        );
      }
      break;
    }

    default: {
      session.stage = "welcome";
      await saveSession(session);
      await wa.sendWelcome(from);
    }
  }
}

module.exports = { handleMessage };
