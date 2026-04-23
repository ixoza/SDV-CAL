const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tt-days.json");

app.use(express.json());
app.use(express.static(__dirname));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ days: [] }, null, 2), "utf-8");
  }
}

function readDays() {
  ensureDataFile();

  try {
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.days)) {
      return [];
    }
    return parsed.days.filter((v) => typeof v === "string");
  } catch {
    return [];
  }
}

function writeDays(days) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ days }, null, 2), "utf-8");
}

app.get("/api/tt-days", (_req, res) => {
  const days = readDays();
  res.json({ days });
});

app.post("/api/tt-days/toggle", (req, res) => {
  const date = req.body && req.body.date;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Date invalide. Format attendu: YYYY-MM-DD" });
    return;
  }

  const daySet = new Set(readDays());
  if (daySet.has(date)) {
    daySet.delete(date);
  } else {
    daySet.add(date);
  }

  const days = [...daySet].sort();
  writeDays(days);
  res.json({ days });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
});
