const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json());

const boardsDir = path.join(__dirname, "boards");
if (!fs.existsSync(boardsDir)) fs.mkdirSync(boardsDir);

const INDEX_FILE = path.join(boardsDir, "index.json");

function updateBoardIndex(id, title) {
  let index = [];
  if (fs.existsSync(INDEX_FILE)) {
    index = JSON.parse(fs.readFileSync(INDEX_FILE));
  }

  const now = new Date().toISOString();
  const existing = index.find(entry => entry.id === id);
  if (existing) {
    existing.title = title;
    existing.updated = now;
  } else {
    index.push({ id, title, created: now, updated: now });
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// Load a board
app.get("/api/boards", (req, res) => {
    const index = fs.existsSync(INDEX_FILE)
      ? JSON.parse(fs.readFileSync(INDEX_FILE))
      : [];
    res.json(index);
});  

// Save/update a board
app.put("/api/boards/:id", (req, res) => {
    const file = path.join(boardsDir, `${req.params.id}.json`);
    fs.writeFileSync(file, JSON.stringify(req.body, null, 2));
    updateBoardIndex(req.params.id, req.body.title || "Untitled Board");
    res.send("Saved");
});

app.delete("/api/boards/:id", (req, res) => {
    const id = req.params.id;
    const filePath = path.join(boardsDir, `${id}.json`);
  
    // Delete the board file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  
    // Remove from index
    let index = [];
    if (fs.existsSync(INDEX_FILE)) {
      index = JSON.parse(fs.readFileSync(INDEX_FILE));
      index = index.filter(entry => entry.id !== id);
      fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    }
  
    res.sendStatus(204);
});
  
// Serve static files from root directory
app.use(express.static(path.join(__dirname, "public")));

// Route "/" to index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

