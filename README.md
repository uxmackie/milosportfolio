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
1. Register a developer app with TikTok and obtain approval for Login Kit and Display API (or configure an eligible sandbox for testing).
2. Authorize your TikTok account using TikTok's Login Kit flow, granting `user.info.basic`, `user.info.stats`, and `video.list`.
3. Add the resulting user access token to your Vercel project's server-side environment variables as `TIKTOK_ACCESS_TOKEN`. Never add it to HTML, client JavaScript, Git, or a `PUBLIC`/`NEXT_PUBLIC` variable.
4. Redeploy on Vercel. The root `api/tiktok.js` is a Vercel Node.js Function; keep the root `api` folder when uploading this project. Only `dist` is the static output directory.
5. Open the TikTok tab. No username lookup or fabricated metrics are used: the token determines which account is displayed.

**Authorization limitation:** this package accepts an existing access token; it does not yet include an owner OAuth connection screen or durable token-refresh storage. TikTok access tokens expire (typically 24 hours). Renew the token using TikTok's refresh flow and update the Vercel environment variable, or add durable OAuth token storage and renewal before expecting unattended long-term updates. An expired token produces a reconnection state rather than invented counts. Don't send access tokens in chat.

The Sites preview is static and does not execute the Vercel Function; it shows the unconnected state. Live data can only be verified on your Vercel deployment after account authorization. A latest video that cannot be embedded can still be opened using Watch on TikTok. Recent cached counts may be shown for up to 15 minutes during a transient upstream failure, visibly marked as delayed.

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
