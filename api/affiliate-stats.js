const { google } = require("googleapis");

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
      range: "Sheet1!A:C",
    });

    const rows = response.data.values || [];

    let total = 0;
    let sales = 0;
    let monthly = 0;
    const history = [];

    const now = new Date();

    for (let i = 1; i < rows.length; i++) {
      const [rowRef, amount, dateStr] = rows[i];
      const amountNum = Number(amount) || 0;
      const date = new Date(dateStr);

      if (rowRef === ref) {
        total += amountNum;
        sales++;

        history.push({ amount: amountNum, date: dateStr });

        if (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        ) {
          monthly += amountNum;
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
    return res.status(500).json({ error: error.message });
  }
}
