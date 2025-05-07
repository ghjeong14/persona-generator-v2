// === SPA Routing & State ===
let boardData = null;
let boardId = null;

document.addEventListener("DOMContentLoaded", () => {
  routeFromHash();
});

window.addEventListener("hashchange", routeFromHash);

function routeFromHash() {
  const id = location.hash.replace("#id=", "");
  if (id) navigateToBoard(id);
  else renderHomepage();
}

// === Homepage Rendering ===
function renderHomepage() {
  document.getElementById("home-view").style.display = "block";
  document.getElementById("board-view").style.display = "none";

  const listContainer = document.getElementById("board-list");
  listContainer.innerHTML = "";

  fetch("/api/boards")
    .then(res => res.json())
    .then(boards => {
      boards.forEach(board => {
        const card = document.createElement("div");
        card.className = "board-card";
        card.innerHTML = `
          <div class="card-title">${board.title}</div>
          <div class="card-date">${new Date(board.updated).toLocaleString()}</div>
        `;
        card.addEventListener("click", () => {
          location.hash = `#id=${board.id}`;
        });
        listContainer.appendChild(card);
      });
    });
}

// === Create New Board ===
document.querySelector(".create-button")?.addEventListener("click", async () => {
  const id = Date.now().toString();
  const newBoard = {
    id,
    title: "Untitled Board",
    notes: [],
    labels: [],
    updated: new Date().toISOString(),
  };

  await fetch(`/api/boards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newBoard),
  });

  location.hash = `#id=${id}`;
});

// === Board View Rendering ===
async function navigateToBoard(id) {
  const res = await fetch(`/api/boards/${id}`);
  const data = await res.json();

  boardData = data;
  boardId = id;

  document.getElementById("home-view").style.display = "none";
  document.getElementById("board-view").style.display = "block";

  // Pass control to board.js
  if (typeof window.initializeBoard === "function") {
    window.initializeBoard(data, id);
  } else {
    console.error("Board module not loaded or initializeBoard missing.");
  }
}
