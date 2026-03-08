# SRPP Polytechnic Institute — Full-Stack Website

A complete Node.js/Express/MongoDB/EJS full-stack website for SRPP Polytechnic Institute.

---

## 🚀 Tech Stack

| Layer       | Technology                      |
|-------------|----------------------------------|
| Backend     | Node.js + Express.js             |
| Templates   | EJS (Embedded JavaScript)        |
| Database    | MongoDB + Mongoose ODM           |
| Sessions    | express-session + connect-flash  |
| Auth        | bcryptjs (password hashing)      |
| Forms       | express-validator                |
| HTTP Utils  | method-override, morgan          |
| Frontend    | Vanilla JS, CSS3, Google Fonts   |

---

## 📁 Project Structure

```
srpp-college/
├── app.js                  # Main Express server entry point
├── package.json
├── .env                    # Environment variables
├── seed.js                 # Database seeder (admin + sample data)
│
├── models/
│   ├── Admin.js            # Admin user model (bcrypt hashed password)
│   ├── Enquiry.js          # Admission enquiry submissions
│   ├── Contact.js          # Contact form messages
│   └── Notice.js           # Notices & announcements
│
├── routes/
│   ├── index.js            # Public routes (home, contact, enquiry)
│   ├── admin.js            # Admin panel routes (auth required)
│   └── api.js              # REST API endpoints (AJAX)
│
├── views/
│   ├── index.ejs           # Homepage (all sections)
│   ├── notices.ejs         # Notices listing page
│   ├── 404.ejs             # 404 page
│   ├── partials/
│   │   ├── head.ejs        # HTML head + fonts
│   │   ├── navbar.ejs      # Top bar + sticky header + mobile nav
│   │   └── footer.ejs      # Footer + modal + back-to-top
│   └── admin/
│       ├── login.ejs       # Admin login page
│       ├── layout-top.ejs  # Admin layout header + sidebar
│       ├── layout-bottom.ejs
│       ├── dashboard.ejs   # Stats + recent activity
│       ├── enquiries.ejs   # Manage enquiries (status updates)
│       ├── contacts.ejs    # View contact messages
│       ├── notices.ejs     # List all notices
│       └── notice-form.ejs # Create/edit notice form
│
└── public/
    ├── css/
    │   ├── main.css        # Full public site styles
    │   └── admin.css       # Admin panel styles
    ├── js/
    │   ├── main.js         # AJAX forms, counters, gallery, nav
    │   └── admin.js        # Admin JS helpers
    └── images/             # Campus photos (add your own)
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/srpp_college
SESSION_SECRET=your_secret_key_here
NODE_ENV=development
```

### 3. Seed the database
```bash
node seed.js
```
This creates:
- Admin user: `admin` / `srpp@2024`
- 6 sample notices

### 4. Run the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Open in browser
- **Website:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/login

---

## 🔐 Admin Panel

| Feature             | URL                         |
|---------------------|-----------------------------|
| Login               | /admin/login                |
| Dashboard           | /admin/dashboard            |
| Enquiries           | /admin/enquiries            |
| Contact Messages    | /admin/contacts             |
| Notices             | /admin/notices              |
| New Notice          | /admin/notices/new          |

**Default credentials:** `admin` / `srpp@2024`
> ⚠️ Change the password after first login!

---

## 🌐 Public Pages & API

| Route           | Description                          |
|-----------------|--------------------------------------|
| GET /           | Homepage with all sections           |
| GET /notices    | All notices (filterable by category) |
| POST /enquiry   | Submit admission enquiry (form POST) |
| POST /contact   | Submit contact message (form POST)   |
| POST /api/enquiry | Submit enquiry via AJAX            |
| POST /api/contact | Submit contact message via AJAX    |
| GET /api/notices  | JSON list of recent notices         |

---

## 🎨 Features

- **Fully responsive** design (mobile-first)
- **AJAX form submissions** — no page reload on submit
- **Live ticker** powered by MongoDB notices
- **Gallery filter** (Campus, Labs, Events, Sports)
- **Animated counters** on scroll
- **Sticky header** with scroll-aware nav highlighting
- **Admin dashboard** with enquiry status management
- **Flash messages** for form feedback
- **MongoDB models** for Enquiries, Contacts, Notices
- **bcrypt** password hashing for admin security
- **Method override** for PUT/DELETE in HTML forms

---

## 📸 Adding Real Images

Place images in `public/images/` and reference them in `views/index.ejs`:
```html
<img src="/images/campus.jpg" alt="Campus">
<img src="/images/lab-computer.jpg" alt="Computer Lab">
```

---

## 🚀 Deploying to Production

1. Set `NODE_ENV=production` in `.env`
2. Use [MongoDB Atlas](https://atlas.mongodb.com) for cloud DB
3. Deploy to Render, Railway, Heroku, or a VPS
4. Set environment variables on the host platform

---

*Built for SRPP Polytechnic Institute, Parbhani — Est. 2008*
