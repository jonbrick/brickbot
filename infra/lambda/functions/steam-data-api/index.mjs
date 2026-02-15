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
      responseData = await getDailyData(date);
    } else if (start && end) {
      responseData = await getDateRangeData(start, end);
    } else if (period === "week") {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      responseData = await getDateRangeData(
        weekAgo.toISOString().split("T")[0],
        today.toISOString().split("T")[0],
      );
    } else if (period === "month") {
      const today = new Date();
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      responseData = await getDateRangeData(
        monthAgo.toISOString().split("T")[0],
        today.toISOString().split("T")[0],
      );
    } else {
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
  // Filter on Eastern date field (not record_id) so brickbot can query by Eastern date
  const scanCommand = new ScanCommand({
    TableName: "steam-playtime",
    FilterExpression: "begins_with(record_id, :prefix) AND #date = :date",
    ExpressionAttributeNames: {
      "#date": "date",
    },
    ExpressionAttributeValues: {
      ":prefix": "DAILY_",
      ":date": date,
    },
  });

  const response = await docClient.send(scanCommand);

  const periods = response.Items.map((item) => ({
    name: item.game_name,
    game_id: item.game_id,
    date: item.date,
    date_utc: item.date_utc,
    start_time: item.start_time,
    start_time_utc: item.start_time_utc,
    end_time: item.end_time,
    end_time_utc: item.end_time_utc,
    duration_minutes: item.duration_minutes,
  }));

  const totalMinutes = periods.reduce(
    (sum, p) => sum + (p.duration_minutes || 0),
    0,
  );

  return {
    date,
    total_hours: Number((totalMinutes / 60).toFixed(1)),
    total_minutes: totalMinutes,
    period_count: periods.length,
    periods: periods.sort((a, b) => a.start_time.localeCompare(b.start_time)),
  };
}

async function getDateRangeData(startDate, endDate) {
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

  const periods = response.Items.map((item) => ({
    name: item.game_name,
    game_id: item.game_id,
    date: item.date,
    date_utc: item.date_utc,
    start_time: item.start_time,
    start_time_utc: item.start_time_utc,
    end_time: item.end_time,
    end_time_utc: item.end_time_utc,
    duration_minutes: item.duration_minutes,
  }));

  const totalMinutes = periods.reduce(
    (sum, p) => sum + (p.duration_minutes || 0),
    0,
  );

  return {
    period: `${startDate} to ${endDate}`,
    total_hours: Number((totalMinutes / 60).toFixed(1)),
    total_minutes: totalMinutes,
    period_count: periods.length,
    periods: periods.sort((a, b) => a.start_time.localeCompare(b.start_time)),
  };
}
