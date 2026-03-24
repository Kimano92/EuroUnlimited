import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const ref = req.query.ref;

    if (!ref) {
      return res.status(400).json({ error: "No ref provided" });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:D",
    });

    const rows = response.data.values || [];

    // якщо таблиця пуста
    if (rows.length === 0) {
      return res.status(200).json({
        total: 0,
        sales: 0,
        monthly: 0,
        history: [],
      });
    }

    let total = 0;
    let sales = 0;
    let monthly = 0;
    const history = [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // пропускаємо header (1 рядок)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const rowRef = row[0];
      const amount = Number(row[1]) || 0;
      const date = new Date(row[2]);

      if (rowRef === ref) {
        total += amount;
        sales += 1;

        history.push({
          amount,
          date: row[2],
        });

        if (
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        ) {
          monthly += amount;
        }
      }
    }

    return res.status(200).json({
      total,
      sales,
      monthly
