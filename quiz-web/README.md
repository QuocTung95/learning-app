# Quiz Web

Vite + React + TypeScript frontend for the `quiz-api` backend.

## Run in PowerShell

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The Vite proxy sends `/api` and `/oauth2` to `http://localhost:8080`. Configure Google OAuth in `quiz-api/src/main/resources/application-oauth2.properties`, then start the backend with `./quiz-api/scripts/run-local.sh` from the workspace root. See [backend setup](../quiz-api/README.md). Authentication and roles come from the backend session.

## Routes

- `/login` — Google OAuth login
- `/` — categories and connection state
- `/quizzes/:quizId` — public quiz detail and Start
- `/attempts/:attemptId` — five question renderers, timer, submit
- `/attempts/:attemptId/result` — user result
- `/admin/quizzes/new` — validate/create draft JSON (requires an ADMIN account)
- `/admin` — CRM dashboard; default landing page for ADMIN after Google login
- `/admin/quizzes` — search/filter, inspect JSON and publish drafts
- `/admin/categories` — list/create categories
- `/admin/users` — search users and manage USER/ADMIN roles
- `/admin/attempts` — submitted attempts table with compact category/quiz/user/single-date filters and per-question review; dates use Vietnam time
- `/explore` — learning home accessible from the admin sidebar

The frontend does not store answers, role, Google credentials, or session tokens in localStorage. Answers are held in memory until Submit, matching the backend's no-autosave contract.

## Appearance

Use the sun/moon icon to switch between light and dark modes. Use the palette icon in the header (or on the login screen) to choose one of eight accent themes: Lime, Blue, Indigo, Violet, Rose, Orange, Teal, Slate. Both mode and accent selection apply throughout the application and are stored locally as visual preferences. Each accent has a darker variant for readable text on light backgrounds; icons, links, borders, active navigation and highlights follow the selection. Inter Variable is served locally from `public/fonts`; its license is included alongside the font.
