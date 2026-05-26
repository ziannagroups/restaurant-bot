# 🍽️ WhatsApp Restaurant Order Management System

A complete WhatsApp ordering bot for restaurants. Customers order via WhatsApp,
you manage everything from a dashboard, and status updates are sent automatically.

---

## 🌟 What It Does

| Feature | Description |
|---|---|
| 📋 Smart Menu Bot | Customers browse menu categories & items via WhatsApp |
| 🛒 Cart System | Add multiple items, review cart, confirm order |
| 📍 Address Collection | Type address or share live location |
| 📦 Order Tracking | Real-time status updates sent to customer's WhatsApp |
| 🛵 Rider Info | Customer gets rider name, phone & bike details automatically |
| ⭐ Ratings | Post-delivery rating system |
| 🖥️ Dashboard API | Full REST API for your restaurant management panel |

---

## 🚀 Quick Start (Free in 15 Minutes)

### Step 1: Get Your Free WhatsApp Sandbox (Twilio)

1. Go to [twilio.com](https://twilio.com) → Sign up free
2. Go to **Messaging → Try it out → Send a WhatsApp message**
3. Follow the instructions to join the sandbox (send a message from your phone)
4. Note your:
   - **Account SID** (starts with `AC`)
   - **Auth Token**
   - **Sandbox number** (usually `+14155238886`)

### Step 2: Set Up MongoDB (Free)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Sign up free
2. Create a **free M0 cluster** (512MB, enough for thousands of orders)
3. Create a database user (username + password)
4. Click **Connect → Connect your application**
5. Copy the connection string (looks like `mongodb+srv://...`)

### Step 3: Deploy to Railway (Free)

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Push this code to a GitHub repo first, then connect it
4. In Railway, go to **Variables** tab and add all variables from `.env.example`
5. Railway auto-detects Node.js and deploys. You'll get a URL like:
   `https://your-app.railway.app`

### Step 4: Connect Twilio to Your Server

1. Go to Twilio Console → **Messaging → WhatsApp Sandbox Settings**
2. Set **"When a message comes in"** webhook to:
   ```
   https://your-app.railway.app/webhook
   ```
3. Method: `HTTP POST`
4. Save!

### Step 5: Test It!

Send `hello` to your Twilio sandbox number on WhatsApp.
The bot should reply instantly with the welcome message! 🎉

---

## 📁 Project Structure

```
whatsapp-restaurant/
├── server.js           ← Main entry point (Express server + webhook)
├── src/
│   ├── bot.js          ← Conversation engine (message routing logic)
│   ├── whatsapp.js     ← All outgoing WhatsApp message templates
│   ├── models.js       ← MongoDB schemas (Order, Session)
│   ├── dashboard.js    ← REST API for restaurant dashboard
│   └── menu.js         ← Your menu data (edit this!)
├── package.json
├── .env.example        ← Copy to .env and fill in
└── README.md
```

---

## 🛠️ Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
TWILIO_ACCOUNT_SID=AC61532c14e8e4922e90ec13c07f7fac33
TWILIO_AUTH_TOKEN=850a8f1471bbe20e0fba9670295c7499
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
MONGODB_URI=mongodb+srv://restaurantuser:Admin@7860##@cluster0.gknd5lf.mongodb.net/?appName=Cluster0
RESTAURANT_NAME=King Of China
RESTAURANT_PHONE=+919082813528
DASHBOARD_SECRET=wX3fT9qL2pR7nY5vB8mC1kA4dG6hJ9sQ
PORT=3000
```

---

## 🖥️ Dashboard API Reference

All endpoints require `?secret=YwX3fT9qL2pR7nY5vB8mC1kA4dG6hJ9sQ` or
`Authorization: Bearer YOUR_DASHBOARD_SECRET` header.

### List All Orders
```
GET /api/orders
GET /api/orders?status=Preparing
GET /api/orders?limit=20
```

### Get Single Order
```
GET /api/orders/ABC123
```

### Update Order Status ← THIS SENDS WHATSAPP NOTIFICATION
```
PATCH /api/orders/ABC123/status
Content-Type: application/json

{
  "status": "Preparing"
}
```

**Status values** (must follow this order):
1. `Order Received` — auto-set when customer confirms
2. `Preparing` → customer gets: "Your order is being prepared 👨‍🍳"
3. `Ready` → customer gets: "Your order is ready ✅"
4. `Out for Delivery` → customer gets rider name, phone, bike details 🛵
5. `Delivered` → customer gets delivery confirmation + rating prompt 🎉
6. `Cancelled` → customer gets cancellation notice ❌

### Get Stats
```
GET /api/stats
```
Returns: today's orders, revenue, active orders, total delivered.

### Assign Rider
```
PATCH /api/orders/ABC123/rider
Content-Type: application/json

{
  "name": "Ahmed Hassan",
  "phone": "+923012345678",
  "bike": "Honda 125 • ABC-1234",
  "rating": 4.9
}
```

---

## 📱 Customer Conversation Flow

```
Customer: "hello"
    ↓
Bot: Welcome message with 3 options (1=Menu, 2=Track, 3=Call)
    ↓
Customer: "1"
    ↓
Bot: Category list (Pizza, Burgers, Salads, Drinks)
    ↓
Customer: "1"  (picks Pizza)
    ↓
Bot: Pizza items with prices
    ↓
Customer: "2"  (picks BBQ Chicken)
    ↓
Bot: "Added to cart! Add more or checkout?"
    ↓
Customer: "1"  (confirms → checkout)
    ↓
Bot: Cart summary + ask for address
    ↓
Customer: "House 12, Street 5, Karachi"
    ↓
Bot: "🎉 Order #ABC123 confirmed! $15.00 · Cash on Delivery"
    ↓
[You click "Start Preparing" in dashboard]
    ↓
Bot → Customer: "👨‍🍳 Your order is being prepared!"
    ↓
[You click "Mark Ready"]
    ↓
Bot → Customer: "✅ Your order is ready!"
    ↓
[You click "Dispatch Rider"]
    ↓
Bot → Customer: "🛵 Ahmed Hassan is on the way! +923012345678"
    ↓
[You click "Mark Delivered"]
    ↓
Bot → Customer: "🎉 Delivered! Rate your experience: reply 5/4/3/bad"
```

---

## 🔧 Customize Your Menu

Edit `src/menu.js` to add your own items:

```javascript
items: {
  pizza: [
    {
      id: "p1",
      name: "Your Pizza Name",
      price: 12.00,
      emoji: "🍕",
      desc: "Your description here"
    },
    // add more...
  ],
  // add more categories...
}
```

---

## 💰 Cost Breakdown

| Service | Free Tier | Paid |
|---|---|---|
| Twilio WhatsApp | Sandbox free | ~$0.005/message |
| Railway.app | $5 credit/month | $5+/month |
| MongoDB Atlas | 512MB free | $57+/month |
| **Total to start** | **FREE** | ~$10/month for small restaurant |

---

## 🔐 Going to Production (WhatsApp Business API)

When you're ready for a real business number:

1. Go to [business.facebook.com/whatsapp](https://business.facebook.com/whatsapp)
2. Apply for WhatsApp Business API
3. Verify your business (takes 2-7 days)
4. Get your own WhatsApp number
5. Update `TWILIO_WHATSAPP_NUMBER` in your `.env`
6. Upgrade your Twilio account for production sending

For interactive buttons & list messages (native WhatsApp UI), you'll also need to
create **message templates** in Meta Business Manager.

---

## 🆘 Troubleshooting

**Bot not responding?**
- Check Twilio webhook URL is correct
- Check server logs on Railway
- Make sure MongoDB is connected (check logs)

**Messages not sending?**
- Verify Twilio credentials in `.env`
- Check you joined the sandbox (send the join code first)
- Sandbox sessions expire — customer must rejoin every 72 hours

**Database errors?**
- Make sure MongoDB connection string is correct
- Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access

---

## 📞 Need Help?

Feel free to ask Claude to help you customize, debug, or extend this system!
