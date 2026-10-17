<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Backend is the user's own Supabase project (not Lovable Cloud); SQL lives in supabase/schema.sql and is run manually by the user. Why: user hosts FE on Vercel and owns the Supabase project.
- All data access goes through the browser client in src/lib/supabase.ts (no server functions); guest writes only via RPC functions. Why: static-friendly Vercel deploy, anon users must not read guests.
- Vercel deploys use vercel.json with NITRO_PRESET=vercel so the app runs server-rendered there. Why: every page renders on refresh instead of returning 404.
- supabase/verify.sql is a read-only pre-deploy check; update its lists when schema.sql adds tables/functions/triggers. Why: keeps the check in sync.
