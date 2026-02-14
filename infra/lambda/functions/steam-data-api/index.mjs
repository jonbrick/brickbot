import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log("API Request:", JSON.stringify(event));

  try {
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const { period, date, start, end } = params;

    let responseData = {};

    // Handle different query types
    if (date) {
      // Get specific date
      responseData = await getDailyData(date);
    } else if (start && end) {
      // Get date range
      responseData = await getDateRangeData(start, end);
    } else if (period === "week") {
      // Get current week
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      responseData = await getDateRangeData(
        weekAgo.toISOString().split("T")[0],
        today.toISOString().split("T")[0],
      );
    } else if (period === "month") {
      // Get current month
      const today = new Date();
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      responseData = await getDateRangeData(
        monthAgo.toISOString().split("T")[0],
        today.toISOString().split("T")[0],
      );
    } else {
      // Default: get today
      const today = new Date().toISOString().split("T")[0];
      responseData = await getDailyData(today);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function getDailyData(date) {
  // Get daily summaries for specific date
  const scanCommand = new ScanCommand({
    TableName: "steam-playtime",
    FilterExpression: "begins_with(record_id, :prefix)",
    ExpressionAttributeValues: {
      ":prefix": `DAILY_${date}`,
    },
  });

  const response = await docClient.send(scanCommand);

  const games = response.Items.map((item) => ({
    name: item.game_name,
    hours: item.total_hours || 0,
    minutes: item.total_minutes || 0,
    sessions: item.play_periods || [],
  }));

  const totalHours = games.reduce((sum, game) => sum + (game.hours || 0), 0);

  return {
    date: date,
    total_hours: totalHours,
    game_count: games.length,
    games: games.sort((a, b) => b.minutes - a.minutes),
  };
}

async function getDateRangeData(startDate, endDate) {
  // Get all daily summaries in date range
  const scanCommand = new ScanCommand({
    TableName: "steam-playtime",
    FilterExpression:
      "begins_with(record_id, :prefix) AND #date BETWEEN :start AND :end",
    ExpressionAttributeNames: {
      "#date": "date",
    },
    ExpressionAttributeValues: {
      ":prefix": "DAILY_",
      ":start": startDate,
      ":end": endDate,
    },
  });

  const response = await docClient.send(scanCommand);

  // Group by game
  const gameStats = {};
  const dailyStats = {};

  response.Items.forEach((item) => {
    const gameName = item.game_name;
    const date = item.date;

    // Aggregate by game
    if (!gameStats[gameName]) {
      gameStats[gameName] = {
        name: gameName,
        total_minutes: 0,
        total_hours: 0,
        days_played: 0,
        daily_breakdown: [],
      };
    }

    gameStats[gameName].total_minutes += item.total_minutes || 0;
    gameStats[gameName].days_played += 1;
    gameStats[gameName].daily_breakdown.push({
      date: date,
      minutes: item.total_minutes || 0,
      hours: item.total_hours || 0,
    });

    // Daily totals
    if (!dailyStats[date]) {
      dailyStats[date] = {
        date: date,
        total_minutes: 0,
        games: [],
      };
    }

    dailyStats[date].total_minutes += item.total_minutes || 0;
    dailyStats[date].games.push({
      name: gameName,
      minutes: item.total_minutes || 0,
    });
  });

  // Calculate totals
  Object.values(gameStats).forEach((game) => {
    game.total_hours = Number((game.total_minutes / 60).toFixed(1));
    game.daily_breakdown.sort((a, b) => a.date.localeCompare(b.date));
  });

  const sortedGames = Object.values(gameStats).sort(
    (a, b) => b.total_minutes - a.total_minutes,
  );
  const totalMinutes = sortedGames.reduce(
    (sum, game) => sum + game.total_minutes,
    0,
  );

  return {
    period: `${startDate} to ${endDate}`,
    total_hours: Number((totalMinutes / 60).toFixed(1)),
    total_minutes: totalMinutes,
    game_count: sortedGames.length,
    games: sortedGames,
    daily_breakdown: Object.values(dailyStats).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}
