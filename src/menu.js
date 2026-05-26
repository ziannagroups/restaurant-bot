// ─────────────────────────────────────────────────────────
//  menu.js — Edit this file to customize your restaurant menu
//  Add/remove categories and items as needed
// ─────────────────────────────────────────────────────────

const MENU = {
  categories: [
    { id: "pizza",   emoji: "🍕", name: "Pizza"   },
    { id: "burgers", emoji: "🍔", name: "Burgers" },
    { id: "salads",  emoji: "🥗", name: "Salads"  },
    { id: "drinks",  emoji: "🧃", name: "Drinks"  },
  ],

  items: {
    pizza: [
      { id: "p1", name: "Margherita",   price: 12.00, emoji: "🍕", desc: "Tomato, mozzarella, fresh basil" },
      { id: "p2", name: "BBQ Chicken",  price: 15.00, emoji: "🍗", desc: "BBQ sauce, grilled chicken, red onions" },
      { id: "p3", name: "Pepperoni",    price: 14.00, emoji: "🌶️", desc: "Classic pepperoni with extra cheese" },
      { id: "p4", name: "Veggie Feast", price: 13.00, emoji: "🥦", desc: "Bell peppers, mushrooms, olives, onions" },
    ],
    burgers: [
      { id: "b1", name: "Classic Smash",    price: 10.00, emoji: "🍔", desc: "Double smash patty, special sauce, pickles" },
      { id: "b2", name: "Crispy Chicken",   price: 11.00, emoji: "🐔", desc: "Crispy fried fillet, coleslaw, mayo" },
      { id: "b3", name: "Mushroom Swiss",   price: 12.00, emoji: "🍄", desc: "Beef patty, sautéed mushrooms, Swiss cheese" },
    ],
    salads: [
      { id: "s1", name: "Caesar Salad", price: 8.00, emoji: "🥗", desc: "Romaine, croutons, parmesan, Caesar dressing" },
      { id: "s2", name: "Greek Salad",  price: 9.00, emoji: "🫒", desc: "Feta, olives, cucumber, cherry tomatoes" },
    ],
    drinks: [
      { id: "d1", name: "Fresh Lemonade",  price: 4.00, emoji: "🍋", desc: "Freshly squeezed, mint, light sugar" },
      { id: "d2", name: "Mango Smoothie",  price: 5.00, emoji: "🥭", desc: "Real mango pulp, no added sugar" },
      { id: "d3", name: "Sparkling Water", price: 2.00, emoji: "💧", desc: "Chilled, served with lime slice" },
      { id: "d4", name: "Iced Coffee",     price: 4.50, emoji: "☕", desc: "Cold brew over ice, milk on side" },
    ],
  },
};

// ── Delivery Boys ──────────────────────────────────────────
// Add your delivery staff here
const RIDERS = [
  {
    id: "r1",
    name: "Ahmed Hassan",
    phone: "+923012345678",
    whatsapp: "whatsapp:+923012345678",
    bike: "Honda 125 • ABC-1234",
    rating: 4.9,
    available: true,
  },
  {
    id: "r2",
    name: "Usman Ali",
    phone: "+923128765432",
    whatsapp: "whatsapp:+923128765432",
    bike: "Suzuki GS150 • XYZ-9988",
    rating: 4.7,
    available: true,
  },
];

// Get first available rider
function getAvailableRider() {
  return RIDERS.find((r) => r.available) || RIDERS[0];
}

// Get item by id
function getItemById(id) {
  for (const cat of Object.values(MENU.items)) {
    const item = cat.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}

// Format menu category list (numbered for WhatsApp text)
function formatCategoryList() {
  return MENU.categories
    .map((cat, i) => `  ${i + 1}. ${cat.emoji} ${cat.name}`)
    .join("\n");
}

// Format items in a category (numbered)
function formatItemList(categoryId) {
  const items = MENU.items[categoryId];
  if (!items) return null;
  return items
    .map((item, i) => `  ${i + 1}. ${item.emoji} *${item.name}* — $${item.price.toFixed(2)}\n     _${item.desc}_`)
    .join("\n\n");
}

module.exports = { MENU, RIDERS, getAvailableRider, getItemById, formatCategoryList, formatItemList };
