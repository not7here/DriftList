# DriftList setup guide

DriftList is already usable in **local mode**: open it, create lists, add tasks, and close it; your browser or desktop app remembers the data. Cloud setup is optional, but is required to see the same lists on Windows, iPhone, and Android.

## Fastest test

1. Install [Node.js LTS](https://nodejs.org/) on your Windows computer. This normally does not require you to write code.
2. Open the `driftlist-app` folder in File Explorer.
3. Click the address bar, type `powershell`, and press Enter.
4. Run `npx serve .`.
5. Open the address shown in PowerShell, usually `http://localhost:3000/driftlist.html`.

Do not double-click the HTML file for regular use. Running it through `npx serve` enables the installable/offline features.

## Add cloud sync

1. Create a free project at [Supabase](https://supabase.com/).
2. In the Supabase dashboard, open **SQL Editor**, create a new query, paste everything from `supabase-setup.sql`, and click **Run**.
3. Open **Project Settings → API**. Copy the **Project URL** and **Publishable key** (sometimes labeled the anon public key).
4. Open `config.js` in Notepad. Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_PUBLISHABLE_KEY`, preserving the quotation marks. Save the file.
5. Restart `npx serve .`, open DriftList, click the round **C** account button, and create your account.
6. If Supabase asks for email confirmation, click the confirmation link, return to DriftList, and sign in.

Never put a Supabase `service_role` or secret key in `config.js`. Use only the publishable/anon key.

## Put it online

A hosted address is needed for your phone. The easiest free option is GitHub Pages:

1. Create a free GitHub account and a new **private or public** repository. GitHub Pages availability for private repositories depends on your plan; a public repository is simplest.
2. Upload every file and folder from `driftlist-app` to that repository.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Wait a few minutes and open the web address GitHub shows you.

Your `config.js` publishable key may be visible in a public repository. That is expected for browser apps; the included Row Level Security policies restrict each signed-in user to their own data. Do not publish a secret/service-role key.

## Install on phones

### iPhone or iPad

1. Open your hosted DriftList address in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**, then **Add**.

### Android

1. Open the hosted address in Chrome.
2. Open the Chrome menu.
3. Tap **Install app** or **Add to Home screen**.

Sign into the same DriftList account on each device.

## Build the Windows portable app

1. Install [Node.js LTS](https://nodejs.org/).
2. Open the `driftlist-app` folder in File Explorer.
3. Click the address bar, type `powershell`, and press Enter.
4. Run `npm install` and wait until it finishes.
5. Test with `npm start`.
6. Build with `npm run build:portable`.
7. Open the new `release` folder. `DriftList-Portable-1.0.0.exe` is the no-install app; copy it anywhere and double-click it.

The pin button in the Windows app keeps the small, resizable window above other windows. The browser/PWA version cannot force always-on-top.

Windows SmartScreen may warn that the app has an unknown publisher because this personal build is not code-signed. Confirm that you built it yourself before choosing **More info → Run anyway**. Commercial code signing is not needed for personal use.

## Build without installing development tools

This project includes a GitHub Actions workflow:

1. Upload the files to GitHub.
2. Open **Actions → Build Windows portable app → Run workflow**.
3. When it finishes, open that workflow run and download **DriftList-Windows-Portable** under Artifacts.

## Use and backup

- Press `Ctrl + N` in the Windows app to jump to the add-task box.
- Click **Completed** to see finished tasks; uncheck one to reactivate it.
- Click **Edit list** to rename or delete the current list.
- Without cloud sync, clearing browser/site data deletes local tasks. Set up Supabase before relying on DriftList for important information.

## Updating later

Edit the source files, rebuild the portable app, and replace the old `.exe`. Hosted PWA files update after deployment; if a phone keeps an old copy, close and reopen it while online.

## Version 1.1 features

- Open the half-circle **Appearance** button to choose System, Light, or Dark mode and an accent color.
- Choose a tab color when creating a list, or use **Edit list** to change it later.
- Click the star on a task, or enable **Priority** in Edit task, to highlight it.
- Drag a task by its six-dot handle to reorder it. Drop it onto another colored list tab to move it there.
- On touch devices, move a task with the **List** menu inside Edit task.
- Add a reminder in Edit task. Browser or desktop notifications require permission. For reliable alerts, DriftList must remain open; reminders are also checked whenever the app returns to the foreground.

### Upgrade an existing Supabase project

Open Supabase **SQL Editor** and run `supabase-setup.sql` again. The new `add column if not exists` statements preserve all existing data while enabling list colors, priorities, and reminders to sync.
