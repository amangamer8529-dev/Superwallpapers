# Superwallpapers

A responsive premium dark-blue wallpaper website with Supabase authentication, Google login, email/password accounts, favourites, a public gallery and an admin-only wallpaper uploader.

## Free setup

This version uses:
- **Supabase Free** for email/password + Google authentication, Postgres database, and image storage.
- **GitHub Pages** for free static hosting.

Supabase Free currently includes 1 GB file storage, 500 MB database, 50,000 monthly active users, and 5 GB cached + 5 GB uncached egress. Free projects can pause after one week of inactivity. Limits and terms can change; see https://supabase.com/pricing. This is a free-tier setup, not unlimited storage or bandwidth.

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a Free project.
2. Open Project Settings → API.
3. Copy the Project URL and the publishable/anon key.
4. Copy `supabase-config.example.js` to a new file named `supabase-config.js`.
5. Paste those two values into `supabase-config.js`. Keep the admin email as `amangamer8529@gmail.com`.
6. Never put a `service_role` or secret key in browser code or a public GitHub repository.

## 2. Create the database and secure image bucket

1. In Supabase, open SQL Editor → New query.
2. Paste the full contents of `supabase-schema.sql` and run it.
3. This creates the wallpaper and favourites tables, RLS policies, download counter function, and a public `wallpapers` Storage bucket.
4. The RLS policies allow anyone to view wallpapers, but only the exact admin email can insert, update or delete wallpaper records/files. Each signed-in user can only manage their own favourites.

## 3. Enable email and Google sign-in

### Email/password
In Authentication → Sign In / Providers, enable Email. Keep email confirmation enabled for safer accounts. Users create accounts with a username, email and password; the username is stored in their Supabase user metadata.

### Google
1. In Authentication → Sign In / Providers, open Google and follow Supabase's current Google provider setup instructions.
2. Create OAuth credentials in Google Cloud Console and add the Supabase callback URL shown in the provider setup.
3. Add your local and deployed website URLs in Authentication → URL Configuration (Site URL and Redirect URLs).
4. Add the Google OAuth client ID and secret to Supabase. Do not put the Google client secret in this website's files.

Official guide: https://supabase.com/docs/guides/auth/social-login/auth-google

## 4. Set up your admin account

Register or sign in using `amangamer8529@gmail.com`. For Google login, use that exact Google account. For email/password login, verify the email address using the confirmation email. The website displays the admin dashboard only for that email, and the database/storage policies independently enforce the same restriction.

If you ever change the admin email, update it in all three places:
- `supabase-config.js` (`ADMIN_EMAIL`)
- `supabase-schema.sql` (all policy occurrences)
- Re-run the updated policies in the Supabase SQL Editor

Never share your email password. Supabase handles account passwords; this site does not read or store them.

## 5. Preview the site

Create `supabase-config.js` first. Because this site uses JavaScript modules, run a local web server instead of opening `index.html` directly.

With Python installed, run this command from the project folder:

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## 6. Publish for free with GitHub Pages

1. Create a GitHub account and a new public repository (for example `superwallpapers`).
2. Upload the website files: `index.html`, `styles.css`, `app.js`, and your `supabase-config.js`. You may also upload `README.md` and `supabase-schema.sql`.
3. In the repository, open Settings → Pages.
4. Choose Deploy from a branch, select `main` and `/ (root)`, then Save.
5. Wait for GitHub Pages to publish your site. The address will look like `https://YOUR-USERNAME.github.io/superwallpapers/`.
6. Add that deployed address to Supabase Authentication → URL Configuration → Redirect URLs.

Important: `supabase-config.js` contains only the public anon/publishable key, which is designed for browser use when Row Level Security is correctly configured. Never upload service-role keys, OAuth client secrets, or passwords.

## Demo gallery

The included gallery initially shows sample preview cards so you can see the design. They are illustrative previews, not your own original 4K files. After connecting Supabase and uploading your own wallpapers through the admin dashboard, the real uploaded files appear in the gallery and can be downloaded in original quality.
