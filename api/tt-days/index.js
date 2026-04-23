const { kv } = require("@vercel/kv");

const KV_KEY = "tt-days-v1";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const days = (await kv.get(KV_KEY)) || [];
    const safeDays = Array.isArray(days) ? days.filter((v) => typeof v === "string") : [];

    return res.status(200).json({ days: safeDays });
  } catch (error) {
    return res.status(500).json({
      error: "KV storage is not configured. Add Vercel KV environment variables.",
      details: error && error.message ? error.message : "Unknown error"
    });
  }
};
