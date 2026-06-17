# Tappr 🍺

Tappr is a **Event & Bar Ordering System** designed to streamline operations for bars, festivals, and private events. Built with React (Vite) and Express (Node.js), it offers a seamless ordering experience for guests and a powerful real-time admin control panel for organizers.

---

## ✨ Features

### 🛒 Guest Ordering App
- **Live Menu Browsing:** Beautiful, responsive grid of products with high-quality imagery.
- **Custom Specifications:** Support for multiple option types (e.g., size, toppings, sweet/dry preferences) with custom pricing.
- **Dynamic Out-of-Stock Status:** Products automatically lock or show "Out of Stock" when inventory runs low.
- **Seamless Cart & Checkout:** Quick add/remove features with live calculation of totals.

### 🔞 18+ Age Verification
- **Safety Prompts:** Guests ordering restricted items (e.g., alcoholic beverages) are automatically prompted to request age verification.
- **Admin Approval Queue:** Real-time push requests sent to the admin dashboard.
- **Quick Approvals:** Admins can approve or reject age verification requests in one click, instantly unlocking the checkout for the guest.

### 📊 Admin Control Panel
- **Real-Time Order Monitoring:** Live incoming order feed with order statuses (Pending, Preparing, Completed, Cancelled).
- **Guest Management:** Comprehensive list of active guests with live filters, order counts, total spent, and quick-action drawers.
- **Product Management:** Add, edit, or delete items via slide-over drawers with drag-and-drop image uploading.
- **System Notification Bell:** Centrally placed notification badge alerting admins about pending age verifications and active alerts.

### 🧪 Recipe & Stock Inventory Management
- **Flexible Stock Units:** Track raw materials in pieces (`stuks`), volume (`ml`), or weight (`gram`).
- **Composite Recipes (Cocktails):** Create complex products (like a Moscow Mule) made from multiple stock ingredients (e.g., 150ml Ginger Beer, 50ml Vodka, 1 Lime).
- **Automatic Stock Deduction:** Placing an order automatically deducts the correct quantities from all constituent ingredients.
- **Live Inventory Tab:** Interactive admin interface to quickly check, adjust, and add stock items.

### 🎨 Theme & Styling
- **Simple & Straightforward Design:** Curated dark/light colors with seamless transition animations and premium glassmorphism accents.
- **Responsive Layouts:** Tailored for mobile screens (guests ordering at the bar) and large desktop monitors (admins at the backend).

---

## 🛠️ Tech Stack

### Frontend
- **React (v19) + Vite** (Ultra-fast build and development)
- **Tailwind CSS** (Utility-first styling with custom dark-mode extension)
- **Axios** (HTTP Client for API requests)
- **React Router DOM** (Single-page app routing)

### Backend
- **Node.js + Express** (Fast, unopinionated REST API server)
- **SQLite (`better-sqlite3`)** (Zero-configuration relational database)
- **Multer** (File uploads for product images)
- **JSON Web Tokens (JWT) & Bcryptjs** (Secure admin authentication)

---

## 📁 Project Structure

```
ordersystem/
├── backend/
│   ├── uploads/            # Uploaded product images
│   ├── database.js         # SQLite database setup and migration scripts
│   ├── server.js           # Express API endpoints and business logic
│   ├── package.json        # Backend dependencies
│   └── ordersystem.db      # SQLite database file
└── frontend/
    ├── public/             # Static public assets
    ├── src/
    │   ├── admin/          # Admin Dashboard components (Products, Inventory, Orders, Guests)
    │   ├── store/          # Guest Store interface and ordering flow
    │   ├── App.jsx         # App router and theme provider
    │   └── index.css       # Core styling & Tailwind configuration
    ├── package.json        # Frontend dependencies
    └── vite.config.js      # Vite configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- npm (Node Package Manager)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Rocco-Br/Tappr.git
   cd Tappr
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```
   *The database schema will automatically initialize in SQLite on the first server start.*

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running Locally

To start both servers in development mode, open two terminal windows:

- **Terminal 1: Start Backend**
  ```bash
  cd backend
  node server.js
  ```
  The API will run on `http://localhost:5000`.

- **Terminal 2: Start Frontend**
  ```bash
  cd frontend
  npm run dev
  ```
  The app will run on `http://localhost:5173`.

---

## 🔒 Admin Credentials
To access the admin control panel (`/admin`), you can log in with:
- **Email:** `admin@tappr.com`
- **Password:** `admin123` *(Remember to update this in a production environment)*

---

## 📄 License
This project is licensed under the ISC License.
