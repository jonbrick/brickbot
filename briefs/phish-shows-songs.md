# Phish Shows & Songs

## Notion Databases
- **Phish Shows DB:** `2e2b9535-d4fd-80c3-8a07-dc2cc7cd362d`
  - Current: Name, Set 1 (relation), Set 2 (relation), Set 3 (relation), 🎵 Phish Songs (relation)
- **Phish Songs DB:** `2e2b9535-d4fd-80ac-9441-c4a7e544577e`
  - Current: Name, Set 1/2/3/Encore (relations back to Shows), Count (formula)

## Proposed Schema: Shows (add)
- `Date` (date)
- `Venue` (rich_text)
- `City` (rich_text)
- `Notes` (rich_text)
- `Phish.net URL` (url)
- `Rating` (select): 1-5 stars

## Proposed Schema: Songs (add)
- `Notes` (rich_text)
- `Rating` (select): 1-5 stars

## Skill: `/log-phish-show`
Flow:
1. User says "I went to the 12/31/2025 show at MSG"
2. Skill scrapes or fetches setlist from phish.net
3. Creates Show row with date, venue, city
4. Creates/finds Song rows for each song in the setlist
5. Links songs to show via Set 1/Set 2/Set 3/Encore relations

## Phish.net API (future enhancement)
- **Base URL:** `https://api.phish.net/v5/`
- **Endpoints:** shows, setlists, songs, venues
- **Auth:** API key (free, request at https://phish.net/api/keys)
- **Example:** `/v5/shows/showdate/2025-12-31.json?apikey=KEY`
- Supports `.json`, `.xml`, `.html` response formats
- Rate limits not published but generous for read

### Without API Key
- Scrape setlist from phish.net URL (e.g., https://phish.net/setlists/phish-december-31-2025-madison-square-garden-new-york-ny-usa.html)
- Or manually input setlist in skill conversation

## Integration
- Pull/push: follow NYC pattern (user-managed with API enhancement later)
- Env vars: `PHISH_SHOWS_DATABASE_ID`, `PHISH_SONGS_DATABASE_ID`
- Optional: `PHISH_NET_API_KEY` (future)
