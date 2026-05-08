# CoNetwork — Meeting Room Booking Platform

A production-ready meeting room booking system for CoNetwork coworking space. Replaces manual Google Sheets with a modern, real-time web platform.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14, React 18, TailwindCSS   |
| Backend     | Node.js, Express                    |
| Database    | PostgreSQL + Prisma ORM             |
| Auth        | JWT (Bearer tokens)                 |
| Calendar    | FullCalendar v6                     |
| Charts      | Recharts                            |
| Email       | Nodemailer (SMTP)                   |

---

## Project Structure

```
conetwork-booking-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.js             # Demo data seeder
│   └── src/
│       ├── controllers/        # Business logic
│       ├── middleware/         # Auth middleware
│       ├── routes/             # API routes
│       ├── services/           # Email service
│       └── index.js            # Express app
└── frontend/
    ├── components/
    │   ├── calendar/           # FullCalendar wrapper
    │   ├── layouts/            # AppLayout sidebar
    │   └── modals/             # BookingModal
    ├── contexts/               # AuthContext
    ├── lib/                    # Axios API client
    ├── pages/
    │   ├── admin/              # Admin pages
    │   ├── dashboard/          # Client pages
    │   ├── login.js
    │   └── reception.js        # Public board
    └── styles/                 # Global CSS + Tailwind
```

---

## Quick Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Clone and install

```bash
git clone <repo>
cd conetwork-booking-platform
npm install          # installs concurrently
npm run install:all  # installs backend + frontend deps
```

### 3. Configure environment

**Backend:**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/conetwork_bookings"
JWT_SECRET="change-this-to-a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Optional: email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=CoNetwork <noreply@conetwork.pk>
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Database setup

```bash
# Create PostgreSQL database
createdb conetwork_bookings

# Run migrations and seed demo data
npm run db:setup
```

### 5. Run development servers

```bash
npm run dev
# Backend:  http://localhost:5000
# Frontend: http://localhost:3000
```

---

## Demo Credentials

| Role   | Email                  | Password    |
|--------|------------------------|-------------|
| Admin  | admin@conetwork.pk     | admin123    |
| Client | demo@client.com        | client123   |

---

## Features

### Admin
- Dashboard with today's bookings, stats, upcoming schedule
- Full calendar (day/week/month) with all bookings
- Booking management: view, filter, search, cancel, export CSV/Excel
- Client management: create, edit, deactivate accounts
- Room management: add rooms, equipment, color, capacity
- Analytics: peak hours, top rooms, top users, booking trends
- Reception board link (public, auto-refreshes)

### Client
- Personal dashboard with monthly usage summary
- Book a room in 3 steps (select → pick time → confirm)
- Visual calendar showing only their own bookings
- Upcoming and history tabs
- Cancel bookings

### Reception Board
- `/reception` — public URL for reception TV/screen
- Shows all rooms, current status (Available/In Use), time slots
- Auto-refreshes every 60 seconds
- Live clock

### Email Notifications
- Booking confirmation (sent on create)
- Booking cancellation (sent on cancel)
- 30-minute reminder (cron job every 5 minutes)

---

## Production Deployment (cPanel / Node.js hosting)

### Backend

1. Upload `backend/` to server
2. Set environment variables in cPanel Node.js app settings
3. Set `NODE_ENV=production`
4. Run: `npm install && npx prisma generate && npx prisma migrate deploy && node prisma/seed.js`
5. Start app with `node src/index.js`

### Frontend

```bash
cd frontend
npm run build
npm start
```

Or export static files:
```bash
npm run build
npm run export
```
Upload the `out/` folder to public_html.

### Nginx reverse proxy (recommended)

```nginx
server {
    server_name app.conetwork.pk;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

---

## API Endpoints

| Method | Path                        | Auth    | Description              |
|--------|-----------------------------|---------|--------------------------|
| POST   | /api/auth/login             | None    | Login                    |
| GET    | /api/auth/me                | JWT     | Get current user         |
| GET    | /api/rooms                  | JWT     | List rooms               |
| POST   | /api/rooms                  | Admin   | Create room              |
| GET    | /api/rooms/:id/availability | JWT     | Get room availability    |
| GET    | /api/bookings               | JWT     | List bookings            |
| POST   | /api/bookings               | JWT     | Create booking           |
| DELETE | /api/bookings/:id           | JWT     | Cancel booking           |
| GET    | /api/bookings/calendar      | JWT     | Calendar events          |
| GET    | /api/bookings/today         | JWT     | Today's bookings         |
| GET    | /api/clients                | Admin   | List clients             |
| POST   | /api/clients                | Admin   | Create client            |
| GET    | /api/analytics/dashboard    | Admin   | Dashboard stats          |
| GET    | /api/analytics/reports      | Admin   | Analytics data           |
| GET    | /api/analytics/export       | Admin   | Export CSV/Excel         |

---

## Booking Rules

- Minimum duration: **30 minutes**
- Increments: **30 minutes** (30, 60, 90, 120...)
- Start times must be on the hour or half-hour
- No overlapping bookings (enforced at DB level)
- Past slots cannot be booked
- Business hours: 8:00 AM – 8:00 PM

---

## Support

Built for CoNetwork, Lahore, Pakistan.
TAMC (The Arfa Mall of Computers) & Regency locations.
