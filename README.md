# dotmackie portfolio

A complete redesign inspired by translucent iOS notification cards: a compact in-card profile header, frosted glass surface, and integrated About Me / Interests / DNI navigation. Inter typography, soft red DNI accents, responsive spacing, immediate press feedback, and short content transitions.

## Edit
- `dist/index.html`: profile, biography, hobbies, and boundaries (editable starter copy).
- `dist/assets/portfolio.css`: layout and material design.
- `dist/assets/portfolio.js`: accessible keyboard navigation, interruptible tab spring, and animated wallpaper.
- `dist/assets/background.jpg`: the original supplied wallpaper.

## Glass and motion
Every glass surface paints a synchronized crop of the wallpaper into its own canvas. CSS blurs that layer directly; it does not rely on backdrop capture across browser layers. Text and edge reflections stay sharp. The background drifts slowly, with a pause button, reduced-motion support, and suspension when hidden. Keyboard tab changes are immediate. Reduced-transparency and high-contrast preferences use opaque surfaces.

## Vercel
Import the repository with Framework Preset Other, no build command, and output directory `dist`. The included vercel.json sets the output directory. No dependencies or build needed. You can open dist/index.html directly to preview; Inter loads through Google Fonts.

The compact profile layout retains the canvas-based frosted glass and adds subtle blurred text shadows.

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
Run `node --test tests/*.cjs`. These cover canvas resize/repaint ordering and the API's missing credentials, zero counts, cache, expired-token and partial-video-error paths using mocked TikTok responses. No live TikTok account or browser validation was available for these checks.

## Terms and privacy pages

- Terms of Service: `/terms/` (alias `/tos`).
- Privacy Policy: `/privacy/` (alias `/privacy-policy`).

Use your public Vercel domain followed by those paths for the TikTok application. Neither page is linked from the main portfolio. Both have a back-to-portfolio link and a link to the other policy. The pages reuse the existing background, Inter font, glass material, and motion controls. They do not load the TikTok embed or API.

The text describes this repository's current data handling and identifies Milo / @nerdyleclerc as the operator, using the X profile as the contact channel. Review the policy text before submitting it, particularly the contact channel and any hosting analytics/log settings enabled outside this repository. If you collect different data or later add visitor login, update the policy accordingly. These pages are not a guarantee of TikTok approval or legal compliance. TikTok also requires URL ownership verification; see https://developers.tiktok.com/docs/en/our-guidelines-developer-guidelines.

Implementation: `dist/terms/index.html`, `dist/privacy/index.html`, `dist/assets/legal.css`, and `dist/assets/legal.js`. Vercel redirects are added in `vercel.json`. No existing homepage assets or API behavior were changed.
