import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:D",
    });

    const rows = response.data.values || [];

    // Формат:
    // A: ref
    // B: email
    // C: amount
    // D: date

    const data = rows.slice(1).map((row) => ({
      ref: row[0] || "",
      email: row[1] || "",
      amount: row[2] || "0",
      date: row[3] || new Date().toISOString(),
    }));

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ API ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
}
