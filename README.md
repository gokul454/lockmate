# LockMate PWA

## Configure
Copy `.env.example` to `.env` and put your existing `sb_publishable_...` key in it.

Do not use a Supabase secret/service-role key.

## Run
```powershell
npm install
npm run dev -- --host
```

## Build
```powershell
npm run build
```

The generated `dist` folder is the deployable PWA.

The app expects the existing `public.lockmate` table with row `id = main`, columns `command` and `updated_at`, and Realtime enabled.
