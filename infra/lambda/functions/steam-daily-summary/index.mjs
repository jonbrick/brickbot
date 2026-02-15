import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("Starting daily summary generation...");

  try {
    const dryRun = event.dryRun || false;

    // Get date from event or use yesterday
    let targetDate;
    if (event.date) {
      targetDate = event.date;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = yesterday.toISOString().split("T")[0];
    }

    console.log(`Processing date: ${targetDate}${dryRun ? " [DRY RUN]" : ""}`);

    // Scan for all records from target date with session_minutes
    const scanCommand = new ScanCommand({
      TableName: "steam-playtime",
      FilterExpression:
        "#date = :date AND attribute_exists(session_minutes) AND session_minutes > :zero",
      ExpressionAttributeNames: {
        "#date": "date",
      },
      ExpressionAttributeValues: {
        ":date": targetDate,
        ":zero": 0,
      },
    });

    const response = await docClient.send(scanCommand);
    console.log(`Found ${response.Items.length} gaming sessions`);

    if (response.Items.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `No gaming sessions found for ${targetDate}`,
        }),
      };
    }

    // Group sessions by game
    const gameData = {};

    response.Items.forEach((item) => {
      const gameId = item.game_id;
      if (!gameData[gameId]) {
        gameData[gameId] = {
          game_name: item.game_name,
          sessions: [],
          total_minutes: 0,
        };
      }

      gameData[gameId].sessions.push({
        timestamp: item.timestamp,
        minutes: item.session_minutes,
      });
      gameData[gameId].total_minutes += item.session_minutes;
    });

    // Process each game
    let summariesCreated = 0;

    for (const [gameId, data] of Object.entries(gameData)) {
      // Sort sessions by timestamp
      data.sessions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      // Detect play periods (group consecutive sessions within 90 min)
      const playPeriods = [];
      let currentPeriod = null;

      data.sessions.forEach((session, index) => {
        const sessionTime = new Date(session.timestamp);

        if (!currentPeriod) {
          currentPeriod = {
            start_time: session.timestamp,
            last_check_time: session.timestamp,
            minutes: session.minutes,
          };
        } else {
          const prevSession = data.sessions[index - 1];
          const timeDiff =
            (sessionTime - new Date(prevSession.timestamp)) / 1000 / 60;

          if (timeDiff <= 90) {
            currentPeriod.last_check_time = session.timestamp;
            currentPeriod.minutes += session.minutes;
          } else {
            playPeriods.push(currentPeriod);
            currentPeriod = {
              start_time: session.timestamp,
              last_check_time: session.timestamp,
              minutes: session.minutes,
            };
          }
        }
      });

      if (currentPeriod) playPeriods.push(currentPeriod);

      // Write one record per period
      for (let i = 0; i < playPeriods.length; i++) {
        const period = playPeriods[i];
        const endTime = new Date(
          new Date(period.last_check_time).getTime() + 30 * 60 * 1000,
        );

        const item = {
          record_id: `DAILY_${targetDate}_${gameId}_PERIOD_${i + 1}`,
          date: targetDate,
          game_id: gameId,
          game_name: data.game_name,
          start_time: period.start_time,
          end_time: endTime.toISOString(),
          duration_minutes: period.minutes,
        };

        if (dryRun) {
          console.log(`[DRY RUN] Would write:`, JSON.stringify(item));
        } else {
          await docClient.send(
            new PutCommand({ TableName: "steam-playtime", Item: item }),
          );
        }
        summariesCreated++;
      }

      console.log(
        `${dryRun ? "[DRY RUN] " : ""}${data.game_name}: ${data.total_minutes} minutes across ${playPeriods.length} periods`,
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `${dryRun ? "[DRY RUN] " : ""}Created ${summariesCreated} period summaries for ${targetDate}`,
        games: Object.keys(gameData).map((gameId) => ({
          game: gameData[gameId].game_name,
          total_minutes: gameData[gameId].total_minutes,
        })),
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
