# Zenith Tutorial — Fee Management System
## Setup Guide (5 Steps)

---

### YOUR FILES:
- `login.html`        — Login page
- `index.html`        — Main dashboard
- `style.css`         — Styling (don't change)
- `script.js`         — All logic (don't change)
- `supabase.js`       — Your Supabase keys go HERE
- `database-setup.sql`— Run this in Supabase once

---

## STEP 1 — Create Supabase Account
1. Go to **supabase.com**
2. Click **"Start your project"**
3. Sign up with GitHub or Google (it's free)
4. Click **"New project"**
5. Name it: `zenith-fee-system`
6. Set a database password (save it!)
7. Choose region: **West EU** (closest to Nigeria)
8. Click **"Create new project"** — wait 2 minutes

---

## STEP 2 — Run the Database Setup
1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `database-setup.sql` and copy ALL the text inside
4. Paste it into the SQL editor
5. Click **"Run"** (green button)
6. You should see "Success" — your tables are created!

---

## STEP 3 — Create Your Admin Account
1. In Supabase, click **"Authentication"** in the left sidebar
2. Click **"Add user"** → **"Create new user"**
3. Enter your email and a strong password
4. Click **"Create user"**
5. This is the email/password you'll use to log in

---

## STEP 4 — Get Your API Keys and Paste Them
1. In Supabase, click **"Settings"** (gear icon, bottom left)
2. Click **"API"**
3. You'll see two things — copy them:
   - **Project URL** (looks like: https://xxxx.supabase.co)
   - **anon public key** (long string of letters)
4. Open `supabase.js` in Notepad
5. Replace:
   - `PASTE_YOUR_PROJECT_URL_HERE` → paste your Project URL
   - `PASTE_YOUR_ANON_KEY_HERE`   → paste your anon key
6. Save the file

---

## STEP 5 — Set Up Storage (for photos)
1. In Supabase, click **"Storage"** in the left sidebar
2. Click **"New bucket"**
3. Name it exactly: `student-photos`
4. Check **"Public bucket"** ✓
5. Click **"Create bucket"**

---

## UPLOAD TO GITHUB PAGES
1. Push all your files to GitHub
2. Go to your repo → **Settings** → **Pages**
3. Set source to **main branch**
4. Your link will be: `https://yourusername.github.io/your-repo-name/login.html`

---

## DONE! ✓
Open `login.html` in your browser, log in with the admin account you created, and you're ready to add students!

1paOMl8U0aMKfHsK
Olawale231
olawale@311