const express = require("express");
const moodEntries = require("./data/moodEntries.json");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

app.get("/api/mood-entries", (req, res) => {
  const limit = Number(req.query.limit);

  if (req.query.limit !== undefined && Number.isInteger(limit) && limit > 0) {
    return res.json(moodEntries.slice(-limit));
  }

  res.json(moodEntries);
});

// обробка неіснуючих шляхів чи id
app.use((req, res) => {
  res.status(404).json({ error: "Не знайдено" });
});

app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
