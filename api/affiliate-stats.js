import { google } from "googleapis";

export default async function handler(req, res) {
  // ✅ CORS (щоб працювало з твоїм доменом)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { ref } = req.query;

    if (!ref) {
      return res.status(400).json({ error: "Missing ref" });
    }

    // 🔑 Підключення до Google Sheets
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A2:D",
    });

    const rows = response.data.values || [];

    // 📊 Фільтр по рефералу
    const filtered = rows.filter((row) => row[1] === ref);

    const history = filtered.map((row) => ({
      email: row[0],
      affiliate: row[1],
      amount: Number(row[2] || 0),
      date: row[3],
    }));

    const total = history.reduce((sum, r) => sum + r.amount, 0);
    const sales = history.length;

    const now = new Date();
    const monthly = history
      .filter((r) => {
        const d = new Date(r.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, r) => sum + r.amount, 0);

    return res.status(200).json({
      total,
      sales,
      monthly,
      history,
    });
  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
