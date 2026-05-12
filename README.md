# 🚗 CampusRide — Smart Campus Transportation Network

**CampusRide** is a premium, intelligent carpooling platform designed specifically for the college community in Visakhapatnam. It connects students heading to the same campus, allowing them to share rides, split costs, and reduce their carbon footprint.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-emerald?style=flat-square&logo=supabase)
![Leaflet](https://img.shields.io/badge/Leaflet-Maps-green?style=flat-square&logo=leaflet)
![CSS3](https://img.shields.io/badge/CSS3-Modern%20UI-blue?style=flat-square&logo=css3)

---

## ✨ Key Features

- **🎯 Smart Ride Matching**: Real-time filtering by College destination and Vehicle type (Bike/Car).
- **🗺️ Interactive Maps**: Built with Leaflet.js to visualize pickup points and routes.
- **🌊 Cinematic UI**: Features a custom dark mode with a ripple transition effect and modern glassmorphism design.
- **📱 Direct Communication**: One-click WhatsApp and Phone call integration with riders.
- **🛡️ Safe & Verified**: Designed for a closed network of verified students.

## 🚀 Tech Stack

- **Frontend**: Next.js (App Router), React, Vanilla CSS3.
- **Backend**: Supabase (PostgreSQL, Row Level Security).
- **Maps**: Leaflet.js with CartoDB Voyager tiles.
- **Animations**: CSS Keyframes & ClickSpark.js.

---

## 🛠️ Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/jagadeshpudi07/Campus-Ride.git
cd Campus-Ride
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Database Setup
Run the following SQL command in your Supabase SQL Editor to create the `rides` table:

```sql
CREATE TABLE rides (
  id bigint primary key generated always as identity,
  created_at timestamptz default now(),
  rider_name text,
  phone text,
  from_location text,
  to_college text,
  departure_time text,
  vehicle_type text,
  available_seats int,
  price int,
  rating float8 default 5.0,
  lat float8,
  lng float8
);
```

### 5. Security (RLS)
Enable Row Level Security (RLS) and create two policies:
- **Allow Select**: Allow `public` access for `SELECT`.
- **Allow Insert**: Allow `public` access for `INSERT`.

---

## 💻 Run Locally

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🌐 Deployment

This project is optimized for **Vercel**. Simply connect your GitHub repository to Vercel and add your environment variables in the dashboard.

---

Created with ❤️ for Visakhapatnam's Students.
