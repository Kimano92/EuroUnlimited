import Stripe from "stripe";
import { google } from "googleapis";
import { buffer } from "micro";

// ВАЖЛИВО: вимикаємо bodyParser щоб Stripe міг перевірити підпис
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // RAW body — обов'язково для Stripe webhook
    const buf = await buffer(req);

    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email = session.customer_details?.email || "unknown";

    // ref передається через client_reference_id з сайту
    const affiliate = session.client_reference_id || "none";

    const amount = session.amount_total / 100;

    const date = new Date().toISOString();

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Sheet1!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[email, affiliate, amount, date]],
        },
      });
    } catch (sheetErr) {
      console.error("Google Sheets error:", sheetErr.message);
      // Повертаємо 200 щоб Stripe не ретраїв
    }
  }

  res.status(200).json({ received: true });
}
