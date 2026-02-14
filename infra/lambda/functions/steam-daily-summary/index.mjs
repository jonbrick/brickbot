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
    // Get date from event or use yesterday
    let targetDate;
    if (event.date) {
      targetDate = event.date;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = yesterday.toISOString().split("T")[0];
    }

    console.log(`Processing date: ${targetDate}`);

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

      // Detect play periods (group consecutive sessions)
      const playPeriods = [];
      let currentPeriod = null;

      data.sessions.forEach((session, index) => {
        const sessionTime = new Date(session.timestamp);
        const sessionHour = sessionTime.getHours();

        if (!currentPeriod) {
          // Start new period
          currentPeriod = {
            start_hour: sessionHour,
            end_hour: sessionHour,
            minutes: session.minutes,
            session_count: 1,
          };
        } else {
          // Check if this is part of the same gaming period (within 1 hour)
          const prevSession = data.sessions[index - 1];
          const timeDiff =
            (sessionTime - new Date(prevSession.timestamp)) / 1000 / 60; // minutes

          if (timeDiff <= 90) {
            // Same gaming period if within 90 minutes
            currentPeriod.end_hour = sessionHour;
            currentPeriod.minutes += session.minutes;
            currentPeriod.session_count++;
          } else {
            // Gap too large, save current period and start new one
            playPeriods.push(currentPeriod);
            currentPeriod = {
              start_hour: sessionHour,
              end_hour: sessionHour,
              minutes: session.minutes,
              session_count: 1,
            };
          }
        }
      });

      // Don't forget the last period
      if (currentPeriod) {
        playPeriods.push(currentPeriod);
      }

      // Format play periods for storage
      const formattedPeriods = playPeriods.map((period) => ({
        start_time: `${period.start_hour}:00`,
        end_time: `${period.end_hour}:30`, // Since we check every 30 min
        duration_minutes: period.minutes,
        checks: period.session_count,
      }));

      // Store daily summary
      const summaryItem = {
        record_id: `DAILY_${targetDate}_${gameId}`,
        date: targetDate,
        game_id: gameId,
        game_name: data.game_name,
        total_minutes: data.total_minutes,
        total_hours: Number((data.total_minutes / 60).toFixed(1)),
        play_periods: formattedPeriods,
        period_count: formattedPeriods.length,
      };

      console.log(
        `Saving summary for ${data.game_name}: ${data.total_minutes} minutes across ${formattedPeriods.length} periods`,
      );

      const putCommand = new PutCommand({
        TableName: "steam-playtime",
        Item: summaryItem,
      });

      await docClient.send(putCommand);
      summariesCreated++;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Created ${summariesCreated} daily summaries for ${targetDate}`,
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
