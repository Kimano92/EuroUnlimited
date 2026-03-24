const { google } = require("googleapis");

export default async function handler(req, res) {
  try {
    const ref = req.query.ref;

    if (!ref) {
      return res.status(400).json({ error: "Missing ref" });
    }

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:D",
    });

    const rows = response.data.values || [];

    let total = 0;
    let sales = 0;
    let monthly = 0;
    const history = [];

    const now = new Date();

    // пропускаємо заголовок
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      const email = row[0];
      const rowRef = row[1];
      const amount = Number(row[2]) || 0;
      const date = row[3];

      if (rowRef === ref) {
        sales++;
        total += amount;

        history.push({
          email,
          amount,
          date,
        });

        if (date) {
          const d = new Date(date);
          if (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          ) {
            monthly += amount;
          }
        }
      }
    }

    return res.status(200).json({
      total,
      sales,
      monthly,
      history,
    });
  } catch (error) {
    console.error("API ERROR:", error);

    return res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
}
