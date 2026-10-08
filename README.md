# DriftList

A small, calm task/list app inspired by the free-floating utility described by its owner. It supports multiple lists, active/completed views, local-first storage, Supabase account sync, an installable PWA for phones, and a resizable Electron portable app for Windows.

Start with **SETUP-GUIDE.md**. No programming experience is assumed.

## Important files

- `driftlist.html` — app screen
- `app.js` — task, list, account, and sync behavior
- `app.css` — responsive light/dark design
- `supabase-setup.sql` — secure cloud tables and per-user policies
- `config.js` — paste the Supabase Project URL and publishable key here
- `package.json` — Windows build commands
- `.github/workflows/build-windows.yml` — optional cloud build

## Version 1.1 additions

- System, light, and dark color schemes with six accent choices
- Individually colored list tabs
- Priority task highlighting
- Drag-and-drop task reordering and movement between list tabs
- Task movement from the edit dialog (touch-friendly fallback)
- Optional per-task reminders while the app is open

Existing local data is migrated automatically. Existing Supabase users should run `supabase-setup.sql` again once to add the new sync columns.
