# dotmackie portfolio

A dark personal portfolio: an animated blue/violet aurora, enlarged profile header, charcoal content panel, and integrated About Me / Interests / TikTok / DNI navigation. Inter typography, responsive spacing, accessible keyboard navigation, and short content transitions.

The current direction uses 21st MCP: [Preet Suthar's Spotlight Card](https://21st.dev/@preetsuthar17/components/spotlight-card) was retrieved and adapted to vanilla HTML/CSS/JavaScript. A racing-inspired cover, overlapping avatar, and cursor-following light sit inside one framed card on a plain black page. The spotlight responds to keyboard focus and is disabled for reduced motion. No React or additional runtime dependency is needed.

The background adapts [Manu Arora's Aurora Background](https://21st.dev/@manuarora700/components/aurora-background) from its [public Aceternity registry source](https://ui.aceternity.com/registry/aurora-background.json) into dependency-free CSS. The 21st MCP identified the component, but its daily retrieval quota was exhausted. Blue/violet gradient bands move on a 60-second cycle; the top-right control pauses them. Reduced motion keeps them static, hidden tabs pause them, and high contrast removes them. See `dist/assets/aurora.css` and `dist/assets/aurora.js`.

The compact navigation is inspired by [Victor Welander's Expandable Tabs](https://21st.dev/@victorwelander/components/expandable-tabs), discovered through 21st MCP and adapted from its public preview and behavior description (code retrieval was quota-limited). The selected tab reveals its label; other tabs show icons. Outside clicks, focus leaving, and Escape collapse the label without deselecting the content. Arrow keys, Home/End, accessible names, immediate keyboard changes, and reduced motion are supported.

## View counter

The small counter beneath the card uses `POST /api/views` once per document load. It counts page loads (including refreshes), not unique people; changing tabs does not count again. `GET /api/views` reads without incrementing. The [Upstash REST API](https://upstash.com/docs/redis/features/restapi) stores the shared total using Redis `INCR` under `milo:views:<SITE_URL origin>`. No visitor identifiers or browser storage are used.

Set `SITE_URL` to the portfolio's exact public origin and configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel. These are the same settings already used by the TikTok integration; this endpoint does not need TikTok credentials. The database must persist and retain this key to preserve the total. The frontend shows “Views unavailable” when configuration or storage is unavailable, including in a static preview. Production storage was not accessed during development. Cross-origin browser writes are rejected; this lightweight public counter is not a bot-proof analytics service.

## Edit
- `dist/index.html`: profile, biography, hobbies, and boundaries (editable starter copy).
- `dist/assets/portfolio.css`: layout and material design.
- `dist/assets/monochrome.css`: homepage-only black theme, layout, typography, and interaction styles.
- `dist/assets/portfolio.js`: accessible keyboard navigation, interruptible tab spring, and animated wallpaper.
- `dist/assets/background.jpg`: the original supplied wallpaper.

## Glass and motion
The homepage uses opaque surfaces and does not load the wallpaper or start its canvas animation. Keyboard tab changes are immediate; reduced-motion disables tab animations. High-contrast preferences increase text and border contrast. The shared glass styles and wallpaper remain available for the legal pages.

## Vercel
Import the repository with Framework Preset Other, no build command, and output directory `dist`. The included vercel.json sets the output directory. No dependencies or build needed. You can open dist/index.html directly to preview; Inter loads through Google Fonts.

The profile includes a visible X link and a keyboard skip link. Its monochrome stylesheet is loaded only on the homepage.

## TikTok tab (Vercel)

The new fourth tab requests `/api/tiktok` when visible and refreshes every 60 seconds. This is periodically refreshed API data, not a push-based live counter. TikTok can also delay its own reported counts. Responses have a server-instance cache of 60 seconds. Manual refresh has a 15-second client cooldown. Counts display their full value on hover. The latest public post is embedded without autoplay, with caption, date, likes, comments, views, and shares. Switching away pauses the player.

### Connect your account
Follow **[TIKTOK-SETUP.md](TIKTOK-SETUP.md)** for TikTok sandbox settings, Vercel environment variables, Upstash Redis, the private owner page, and the full review-demo sequence. Access/refresh tokens are now encrypted in Redis and renewed automatically when needed. The previous manually supplied TIKTOK_ACCESS_TOKEN is no longer used.

The private owner page is `/api/tiktok-admin`; TikTok returns to `/api/tiktok-callback`. No owner navigation was added to the homepage. After connection, View TikTok tab opens `/?tab=tiktok`. The static Sites preview cannot run Vercel Functions.

Official references:
- https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-list
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-object
- https://developers.tiktok.com/docs/en/embed-player
- https://developers.tiktok.com/doc/oauth-user-access-token-management

### Black-flash fix
Canvas dimensions are now only assigned when they actually change. Any necessary resize is followed by a synchronous repaint in the same task, bypassing animation throttling. This preserves pixels on unchanged measurements and avoids a blank black frame during tab/card resizing, including when wallpaper motion is paused. Card content resizes over 260ms; reduced-motion and keyboard interactions resize immediately.

### Checks
Run `node --test tests/*.cjs`. These cover the retained canvas resize/repaint functions and the API's missing credentials, zero counts, cache, expired-token and partial-video-error paths using mocked TikTok responses. The stale canvas test extraction boundary has been corrected.

The monochrome homepage was also checked in Chromium at 1440×1000, 375×812, 320×740, and 812×375: all tabs, keyboard navigation, panel sizing, horizontal overflow, reduced motion, the TikTok deep link, no wallpaper request, and no JavaScript exceptions. Live TikTok credentials were not used; the static preview exercises its unavailable/empty state.

## Terms and privacy pages

- Terms of Service: `/terms/` (alias `/tos`).
- Privacy Policy: `/privacy/` (alias `/privacy-policy`).

Use your public Vercel domain followed by those paths for the TikTok application. Neither page is linked from the main portfolio. Both have a back-to-portfolio link and a link to the other policy. The pages reuse the existing background, Inter font, glass material, and motion controls. They do not load the TikTok embed or API.

The text describes this repository's current data handling and identifies Milo / @nerdyleclerc as the operator, using the X profile as the contact channel. Review the policy text before submitting it, particularly the contact channel and any hosting analytics/log settings enabled outside this repository. If you collect different data or later add visitor login, update the policy accordingly. These pages are not a guarantee of TikTok approval or legal compliance. TikTok also requires URL ownership verification; see https://developers.tiktok.com/docs/en/our-guidelines-developer-guidelines.

Implementation: `dist/terms/index.html`, `dist/privacy/index.html`, `dist/assets/legal.css`, and `dist/assets/legal.js`. Vercel redirects are added in `vercel.json`. No existing homepage assets or API behavior were changed.
