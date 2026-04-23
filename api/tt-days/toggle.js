const { kv } = require("@vercel/kv");

const KV_KEY = "tt-days-v1";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const date = req.body && req.body.date;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD" });
  }

  try {
    const current = (await kv.get(KV_KEY)) || [];
    const safeCurrent = Array.isArray(current) ? current.filter((v) => typeof v === "string") : [];

    const set = new Set(safeCurrent);
    if (set.has(date)) {
      set.delete(date);
    } else {
      set.add(date);
    }

    const days = [...set].sort();
    await kv.set(KV_KEY, days);

    return res.status(200).json({ days });
  } catch (error) {
    return res.status(500).json({
      error: "KV storage is not configured. Add Vercel KV environment variables.",
      details: error && error.message ? error.message : "Unknown error"
    });
  }
};
