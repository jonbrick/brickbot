import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Convert UTC timestamp to Eastern date (YYYY-MM-DD), handles EST/EDT automatically
function getEasternDate(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

export const handler = async (event) => {
  console.log("Starting Steam playtime check...");

  try {
    // Get Steam data
    const steamUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${process.env.STEAM_ID}&include_appinfo=1&include_played_free_games=1&format=json`;

    console.log("Fetching Steam data...");
    const response = await fetch(steamUrl);
    const data = await response.json();

    if (!data.response || !data.response.games) {
      throw new Error("No games data in response");
    }

    const games = data.response.games;
    const timestamp = new Date().toISOString();
    const date_utc = timestamp.split("T")[0];
    const date = getEasternDate(timestamp);

    console.log(`Found ${games.length} games. Processing...`);

    let gamesUpdated = 0;

    // Process each game
    for (const game of games) {
      if (game.playtime_forever > 0) {
        // Only track played games
        const gameId = String(game.appid);
        const currentMinutes = game.playtime_forever;

        // Get last reading
        let lastMinutes = currentMinutes;
        let delta = 0;

        try {
          const getCommand = new GetCommand({
            TableName: "steam-playtime",
            Key: { record_id: `LATEST_${gameId}` },
          });

          const lastReading = await docClient.send(getCommand);
          if (lastReading.Item) {
            lastMinutes = lastReading.Item.total_minutes;
            delta = currentMinutes - lastMinutes;
          }
        } catch (err) {
          console.log(`First time tracking ${game.name}`);
        }

        // Only store if there's a change
        if (delta > 0) {
          console.log(`${game.name}: +${delta} minutes`);

          // Store historical record
          const putCommand = new PutCommand({
            TableName: "steam-playtime",
            Item: {
              record_id: `${timestamp}_${gameId}`,
              game_id: gameId,
              game_name: game.name,
              timestamp: timestamp,
              date: date,
              date_utc: date_utc,
              total_minutes: currentMinutes,
              session_minutes: delta,
            },
          });
          await docClient.send(putCommand);

          gamesUpdated++;
        }

        // Always update latest pointer
        const updateLatestCommand = new PutCommand({
          TableName: "steam-playtime",
          Item: {
            record_id: `LATEST_${gameId}`,
            game_id: gameId,
            game_name: game.name,
            timestamp: timestamp,
            total_minutes: currentMinutes,
          },
        });
        await docClient.send(updateLatestCommand);
      }
    }

    console.log(`Updated ${gamesUpdated} games with playtime changes`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully tracked ${gamesUpdated} games`,
        timestamp: timestamp,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
