# Elite Event Planner

**Elite Event Planner** is a premium, full-stack event management and online booking web application. Featuring a gorgeous modern design, vibrant CSS animations, responsive mobile-first grids, and complete automation, this system enables clients to view thematic event packages and book services online.

When a client registers, submits a booking, or fills a contact form, the details are instantly stored in a **NeonDB PostgreSQL** database, and a beautifully formatted notification is sent automatically to the administrator's email using **Flask-Mail (SMTP)**.

---

## Technical Stack

* **Frontend**: HTML5, CSS3 (Custom Glassmorphism & Animations), JavaScript (ES6 Fetch API), Bootstrap 5, Bootstrap Icons, Animate On Scroll (AOS).
* **Backend**: Python Flask, Gunicorn (Production Server).
* **Database**: PostgreSQL (Hosted on **NeonDB**) with **Flask-SQLAlchemy ORM**.
* **Mailing**: Flask-Mail via secure Gmail SMTP.
* **Hosting Platforms**:
  * **Frontend**: Netlify (Static content served via decoupled AJAX pipelines) OR served natively by Flask.
  * **Backend**: Render (Python Web Service).
  * **Database**: Neon.tech.

---

## Repository Folder Structure

```text
d:\Event Planner\
├── app.py                  # Main Flask entrypoint & DB Seeding
├── config.py               # Core application configuration loading
├── models.py               # SQLAlchemy Database schemas (Users, Bookings, Services, etc.)
├── routes.py               # Flask Route Handlers (HTML templates & REST API endpoints)
├── requirements.txt        # Python backend library dependencies
├── Procfile                # WSGI command for Gunicorn production startup
├── render.yaml             # Render Blueprint configuration schema
├── .env.example            # Environment variables template
├── README.md               # Complete installation and deployment manual
├── static/                 # Static asset directories
│   ├── css/
│   │   └── style.css       # Design System tokens, animations, custom scrollbar
│   └── js/
│       ├── main.js         # Page loaders, Unsplash image sliders, contact/booking forms
│       └── auth.js         # Secure registration, logins, user & admin dashboards
└── templates/              # Production HTML Pages
    ├── index.html          # 1. Home Page
    ├── about.html          # 2. About Us Page
    ├── services.html       # 3. Our Services Page
    ├── events.html         # 4. Event Themes Page
    ├── contact.html        # 5. Contact Page
    ├── register.html       # 6. User Registration Page
    ├── login.html          # 7. Secure Login Page
    ├── dashboard.html      # 8. User Booking History Dashboard
    ├── booking.html        # 9. Interactive Booking Form (with auto-prefills)
    └── admin.html          # 10. Admin Command Center Dashboard (Status toggles & delete)
```

---

## 1. Local Setup Instructions

To run the application locally on your computer:

### Step A: Initialize Virtual Environment
Open PowerShell or Terminal in the `d:\Event Planner` workspace:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate

# Activate virtual environment (macOS / Linux)
source venv/bin/activate
```

### Step B: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step C: Configure Local Environment Variables
1. Copy the `.env.example` file and rename it to `.env`.
2. Fill in the keys:
   ```env
   SECRET_KEY=enter_any_random_string_here
   FLASK_ENV=development
   # Leave DATABASE_URL empty to fallback to a local SQLite database for instant testing!
   # Or paste your NeonDB PostgreSQL string here
   DATABASE_URL=
   
   # Flask-Mail config (Gmail)
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-gmail-app-password
   MAIL_DEFAULT_SENDER=your-email@gmail.com
   
   ADMIN_EMAIL=your-recipient-admin-email@gmail.com
   ```
   *Note: To generate `MAIL_PASSWORD`, you must enable 2-Step Verification in your Gmail account, navigate to Security -> App Passwords, and generate a 16-character code.*

### Step D: Run the Application
```bash
python app.py
```
The Flask server will start on `http://127.0.0.1:5000`. 
Open this address in your web browser. 
*Note: The system will automatically construct all database tables and seed them with Unsplash-enhanced Services and Event Themes on its very first launch!*

---

## 2. Backend Deployment on Render

Render runs Gunicorn persistent web services flawlessly.

### Step 1: Create a PostgreSQL Database on Neon
1. Register for free on [Neon.tech](https://neon.tech).
2. Create a new project named `EliteEventPlanner`.
3. Copy the primary **Connection String** shown in the dashboard. Ensure it looks like:
   `postgresql://neondb_owner:...@ep-cool-water-a5xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`

### Step 2: Deploy Backend on Render
1. Create a free account on [Render.com](https://render.com).
2. Connect your Git repository (containing the Flask code).
3. Select **New** -> **Web Service**.
4. Set configurations:
   * **Runtime**: `Python`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `gunicorn app:app`
5. Click **Advanced** and add the following **Environment Variables**:
   * `SECRET_KEY`: (Any random string)
   * `FLASK_ENV`: `production`
   * `DATABASE_URL`: (Your connection string from NeonDB copied in Step 1)
   * `MAIL_SERVER`: `smtp.gmail.com`
   * `MAIL_PORT`: `587`
   * `MAIL_USE_TLS`: `True`
   * `MAIL_USERNAME`: (Your Gmail email address)
   * `MAIL_PASSWORD`: (Your 16-character Google App Password)
   * `ADMIN_EMAIL`: (The admin email to receive notifications)
6. Click **Deploy Web Service**. Render will build the server, initialize the database tables automatically inside your Neon database, and seed the standard events and services!
7. Copy your backend service URL (e.g. `https://elite-event-planner-backend.onrender.com`).

---

## 3. Decoupled Frontend Deployment on Netlify

Netlify hosts static HTML, CSS, and JS files with high-speed global delivery.

### Step 1: Configure Frontend to Connect to Render API
Before uploading the static files, let's configure the JavaScript to call your live Render API rather than the local fallback server.

1. Open `static/js/main.js` and locate the `API_BASE` configuration at the top of the file:
   ```javascript
   const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
       ? '' 
       : 'https://elite-event-planner.onrender.com'; // REPLACE THIS WITH YOUR RENDER URL
   ```
2. Replace `https://elite-event-planner.onrender.com` with your active Render web service URL copied from Step 2 of the Render deployment.
3. Open `static/js/auth.js` and repeat the replacement for `AUTH_API_BASE` at the top:
   ```javascript
   const AUTH_API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
       ? '' 
       : 'https://elite-event-planner.onrender.com'; // REPLACE THIS WITH YOUR RENDER URL
   ```

### Step 2: Upload Files to Netlify
1. Create a free account on [Netlify.com](https://netlify.com).
2. Select **Add new site** -> **Deploy manually** (or connect your Git repository).
3. Create a deployment directory on your computer containing only:
   * The contents of `templates/` moved to the root of this folder (e.g. `index.html` is at the top level).
   * The `static/` directory copied into this folder.
4. Drag and drop this deployment directory into Netlify.
5. In Netlify Site Settings, enable **Pretty URLs** (Site Settings -> Build & Deploy -> Post Processing -> Asset Optimization -> Pretty URLs). This allows links like `/about` to load `about.html` automatically!
6. Done! Your frontend is fully hosted on Netlify, and your backend operates on Render!

---

## 4. Administrative Privileges

To access the **Admin Dashboard** (`/admin`):
1. Navigate to `/register` and register an account using an email containing `admin` (e.g., `admin@eliteeventplanner.com` or `admin@gmail.com`). 
2. The Flask backend automatically intercepts this and assigns the security role `admin` to this user profile.
3. Logging in with this email redirects you to the Admin Command Center where you can monitor real-time users, bookings, stats, confirm/cancel slot approvals, and delete requests!
