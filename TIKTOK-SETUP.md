# Connect the owner's TikTok account

This version implements TikTok Login Kit's web authorization flow, server-side code exchange, encrypted durable token storage, demand-driven automatic token renewal, and disconnect/revocation. It is designed for Vercel. The static Sites preview cannot run these server endpoints.

## 1. Add a Redis store

Create an Upstash Redis database (directly with Upstash or through Vercel's marketplace). Use its HTTPS REST URL and full read/write REST token, not a read-only token. Use a dedicated database or keep the generated application-specific key prefix isolated. No npm dependency is needed: the app uses the REST API.

## 2. Add Vercel environment variables

Set these for the same deployment environment you will demonstrate:

| Variable | Value |
| --- | --- |
| `SITE_URL` | Your exact public HTTPS origin, such as `https://your-domain.vercel.app`, with no path, query, or fragment |
| `TIKTOK_CLIENT_KEY` | The client key from your TikTok app or sandbox |
| `TIKTOK_CLIENT_SECRET` | The matching client secret |
| `TIKTOK_ADMIN_PASSWORD` | A long random owner password (at least 32 characters) |
| `TIKTOK_ENCRYPTION_KEY` | 64 hexadecimal characters generated from 32 random bytes |
| `UPSTASH_REDIS_REST_URL` | The Redis HTTPS REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | The Redis REST read/write token |
| `TIKTOK_OWNER_OPEN_ID` | Optional app-scoped account ID to restrict which account can connect |

To generate a value locally, run `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Run it separately for the password and encryption key. Store the generated values privately. Never commit them or send them in chat. The old `TIKTOK_ACCESS_TOKEN` variable is no longer used and can be removed.

Keep the encryption key stable: changing it prevents decryption of the stored connection. Before rotating it, disconnect using the owner page. If the old key is lost, remove this app's Redis token record, rotate the key, and reconnect. Keep production and sandbox settings separate; the Redis key prefix is derived from SITE_URL and the client key.

## 3. Configure TikTok

Enable Login Kit (Web) and Display API. Request exactly:
- `user.info.basic`
- `user.info.stats`
- `video.list`

Remove Content Posting API, video.upload, and user.info.profile from the submission unless you implement features that actually need them. This portfolio does not upload videos or fetch profile fields beyond the display name.

Register this redirect URI in Login Kit, using your actual domain:

`https://YOUR-PUBLIC-DOMAIN/api/tiktok-callback`

It must match exactly (no trailing slash or query string). Use the same public domain for SITE_URL, your app website, and the demo. Keep your terms and privacy links at `/terms/` and `/privacy/`. Follow TikTok's URL ownership verification steps.

For the first review demo, configure a sandbox and add your TikTok account as an eligible sandbox/test user. Use that sandbox's credentials on the deployment you record. TikTok controls which scopes are available; if your sandbox cannot grant one, resolve that in the developer portal before recording. Do not claim a scope works using mocked counts.

## 4. Deploy and connect

1. Upload all project files to the repository, including the root `api/` and `lib/` folders. Keep Vercel's framework as Other, output directory `dist`, and no build command.
2. Redeploy after setting the environment variables.
3. Visit `https://YOUR-PUBLIC-DOMAIN/api/tiktok-admin`.
4. The browser prompts for HTTP Basic authentication. Username: `owner`. Password: the value of TIKTOK_ADMIN_PASSWORD. This is your separate portfolio admin password, not your TikTok password.
5. Choose Continue with TikTok, sign in on TikTok, and grant the requested permissions.
6. TikTok returns to the callback; the app exchanges the code on the server and takes you to the connected confirmation page.
7. Select View TikTok tab. Your portfolio opens at `/?tab=tiktok` and fetches real statistics.

There are no owner-login links on the public portfolio. Only someone with the admin password can start the connection flow. The callback also requires a one-time state value and matching secure browser cookie. An optional TIKTOK_OWNER_OPEN_ID setting can pin the authorized account further.

## 5. Record the demo

Start recording after signing in to the private owner page so the recording does not expose your admin password. Show Continue with TikTok, the TikTok consent screen, the return/connected screen, View TikTok tab, fetched counts, caption/date/engagement stats, and playing your actual latest video. Keep the browser domain visible. Do not show Vercel secrets, tokens, or Redis records. You can show Disconnect afterward if desired.

## Token behavior and disconnect

Tokens are encrypted with AES-256-GCM before storage in Redis. The server reads the stored connection on each stats request and renews the access token when it is within two minutes of expiry. A newly returned refresh token replaces the previous one. Renewal occurs when data is requested; no cron subscription is required. If the refresh token expires or access is revoked, you must reconnect.

A short distributed lock prevents concurrent refreshes. Compare-and-swap prevents a refresh from restoring a connection deleted or replaced while the request was running. Token responses are never returned to visitors.

Disconnect immediately deletes the local token record, then requests revocation from TikTok. If TikTok cannot confirm revocation, the page tells you to revoke the app in TikTok's settings too. Previously displayed public data may remain in an already-open browser until its next poll, but further API requests no longer return that connection's cached data. Cookies and one-time form/OAuth state expire after ten minutes. An expired account token record stays encrypted in Redis until you disconnect or delete it; it is not served as public data.

## Verification and limits

Run `node --test tests/*.cjs`. Automated checks use simulated Redis/TikTok responses and cover owner access, CSRF, callback state/replay, scopes, encrypted storage, renewal, disconnect and the existing flash regression. They do not establish that your sandbox permissions or deployed credentials are valid. Complete the real sandbox flow before submitting for review.

Official documentation:
- https://developers.tiktok.com/docs/en/login-kit-web
- https://developers.tiktok.com/doc/oauth-user-access-token-management
- https://developers.tiktok.com/docs/en/display-api-get-started
- https://upstash.com/docs/redis/features/restapi
