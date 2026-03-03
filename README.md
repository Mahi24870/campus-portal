# Campus Event & Registration Portal

A full-stack web application designed for academic campus events, allowing students and faculty to register, participate, and manage campus activities.

## Features
- **User Authentication:** Registered accounts with Student, Faculty, and Admin roles.
- **Event Management:** Faculty and Admins can create, edit, and delete events. They can also view attendee lists and export them as CSV.
- **QR Tickets:** Students receive a unique QR code for every event they register for, enabling contactless check-ins.
- **Attendance Scanner:** Built-in QR code scanner for Faculty/Admins to verify attendance in real-time.
- **Analytics Dashboard:** Visual charts (via Chart.js) showing registration trends and event capacities.
- **User Management:** Admins can manage user roles and accounts directly from the portal.
- **Registrations:** Students and Faculty can browse events, see real-time capacity and registration statuses, and sign up with one click.
- **Dashboard Hub:** A single-page application dashboard providing quick access to all relevant information depending on the logged-in role.
- **Modern UI:** Glassmorphism aesthetics with dynamic responsiveness for mobile devices and clean, accessible form inputs.

## Prerequisites
- Node.js (v18.x or newer strongly recommended)
- MySQL Server (e.g., via XAMPP)

## Setup Instructions

### 1. Database Configuration
Ensure your local MySQL server is running. Create a `.env` file at the root of the project with your MySQL connection details. You can copy the template provided:
```bash
cp .env.example .env
```
Fill in the `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` values (by default, `DB_NAME=campus_events` and `DB_USER=root` with no password works for default XAMPP).

### 2. Install Dependencies
Open a terminal in the project directory and install the necessary Node packages:
```bash
npm install
```

### 3. Initialize the Database
We have provided an initialization script that will automatically construct the database, tables, and a default admin user based on your `.env` configuration.
```bash
node initDB.js
```
*Note: If you prefer, you can manually import the `database/schema.sql` file into your MySQL client (e.g., phpMyAdmin).*

### 4. Run the Server
Start the development server:
```bash
npm run dev
```
Alternatively, for production:
```bash
npm start
```

### 5. Access the Platform
Open your browser and navigate to:
**http://localhost:3000**

You can use the default admin account:
- **Email:** `admin@campus.edu`
- **Password:** `Admin@123`

Or register a new account on the login page!

## Technology Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), FontAwesome
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Other:** `bcryptjs` (passwords), `multer` (file uploads), `express-session` (authentication), `Chart.js` (analytics), `html5-qrcode` (scanning)
