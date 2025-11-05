<!-- 4bb64d03-d2ac-4b3b-8877-478f3c5bac3d 0d10e1ef-6889-4de7-801d-7f20f7981fb3 -->
# Fix Google Calendar Token Recovery

## Problem Analysis

- `invalid_grant` error means the refresh token is expired/revoked and cannot be refreshed
- `tokens:refresh` fails silently without clear recovery guidance
- `refreshGoogleTokens()` doesn't return proper token data format expected by `refreshServiceByKey()`
- No clear messaging that refresh only applies to OAuth services (Strava, Google), not API key services (Notion, Oura)

## Solution

### 1. Fix refreshGoogleTokens() Return Format

- Update `refreshGoogleTokens()` in TokenService.js to return proper token data
- Currently returns `{ success: true }` but should return token data with `accessToken`, `refreshToken`, etc.
- Map tokens to env var names for .env file updates
- Handle Google's `expiry_date` format (not `expiresAt`)

### 2. Enhance tokens:refresh Error Handling & User Communication

- Detect `invalid_grant` errors specifically
- When detected, provide clear message: "Refresh token expired. Run 'yarn tokens:setup' to re-authenticate"
- Exit gracefully with helpful guidance instead of generic failure message
- **Add clear messaging that refresh only applies to OAuth services (Strava, Google)**
- Update console logs to explicitly state: "Checking OAuth tokens that can be refreshed..." or similar
- Add note that API key services (Notion, Oura) don't need refresh and won't appear in refresh output
- Make it clear in the intro/output that only OAuth2 services are refreshable

### 3. Improve GoogleCalendarService refreshToken()

- Ensure it returns proper credentials object after refresh
- Update environment variables if refresh succeeds

## Files to Modify

- `src/services/TokenService.js` - Fix `refreshGoogleTokens()` return format and handle expiry_date
- `cli/tokens/refresh.js` - Add invalid_grant detection, helpful error messages, and clarify OAuth-only scope in console output
- `src/services/GoogleCalendarService.js` - Ensure refreshToken() returns proper data (if needed)

## Yarn Scripts Summary

**Current Scripts:**

- `yarn tokens:check` - Check token status for all services (no changes)
- `yarn tokens:refresh` - Refresh expired OAuth tokens (Strava, Google only) - will be enhanced
- `yarn tokens:setup` - Interactive OAuth setup wizard for all services (no changes)

**New Scripts:**

- None - this plan only fixes existing functionality

## Service-Script Mapping

| Service | Type | tokens:setup | tokens:refresh |
|---------|------|--------------|----------------|
| Notion | API Key | ✅ Yes | ❌ No (API keys don't expire) |
| Oura | API Key | ✅ Yes | ❌ No (API keys don't expire) |
| Strava | OAuth2 | ✅ Yes (initial) | ✅ Yes (when access token expires) |
| Google Calendar | OAuth2 | ✅ Yes (initial/recovery) | ✅ Yes (when access token expires) |

## Implementation Priority

1. Fix refreshGoogleTokens() return format (critical for refresh to work)
2. Add invalid_grant error detection in refresh.js (improves UX with better error messages)
3. Update console logs in refresh.js to clarify it only applies to OAuth services (Strava, Google)
4. Add helpful messaging that API key services (Notion, Oura) don't need refresh

### To-dos

- [x] Remove imports and instantiations for WithingsService, GitHubService, SteamService from TokenService.js
- [x] Remove check methods for non-existent services and update checkAllTokens to only check existing services
- [x] Fix refreshGoogleTokens() to return proper token data format
- [x] Update _mapTokensToEnv() to handle Google's expiry_date format
- [x] Add invalid_grant error detection in refresh.js
- [x] Update refresh.js console logs to clarify OAuth-only scope
- [x] Improve error handling in GoogleCalendarService.refreshToken() to preserve invalid_grant errors
- [ ] Test token refresh flow end-to-end (manual testing required)

