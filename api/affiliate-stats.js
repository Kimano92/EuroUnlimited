import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

export default async function handler(req, res) {
  // CORS — allow affiliate.html on eurounlimited.eu to call this
  res.setHeader("Access-Control-Allow-Origin", "https://eurounlimited.eu");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ref } = req.query;

  if (!ref) {
    return res.status(400).json({ error: "Missing ref parameter" });
  }

  try {
    // Read all rows from Sheet1
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:D",
    });

    const rows = response.data.values || [];

    // Skip header row if exists (check if first row looks like a header)
    const dataRows = rows[0] && rows[0][0]?.toLowerCase() === "email"
      ? rows.slice(1)
      : rows;

    // Map to objects: [email, affiliate, amount, date]
    const allData = dataRows
      .filter(row => row && row.length >= 3)
      .map(row => ({
        email: row[0] || "",
        ref:   row[1] || "",
        amount: parseFloat(row[2]) || 0,
        date:  row[3] || "",
      }));

    // Check if this ref exists at all
    const refExists = allData.some(
      row => row.ref.toLowerCase() === ref.toLowerCase()
    );

    // If ref doesn't exist in sheet AND there are rows in sheet → ref is unknown
    // If sheet is empty → allow (no sales yet for anyone)
    if (!refExists && allData.length > 0) {
      // Check if ref is registered in allowed list
      // For now: if no sales yet, we can't verify — return empty array
      // You can add a "partners" sheet later for validation
    }

    // Return all rows — frontend filters by ref
    return res.status(200).json(allData);

  } catch (err) {
    console.error("Sheets error:", err);
    return res.status(500).json({ error: "Failed to read sheet" });
  }
}
