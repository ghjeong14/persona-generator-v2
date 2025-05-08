// === SPA Routing & State ===
let boardData = null;
let boardId = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");
  routeFromHash();
});

window.addEventListener("hashchange", () => {
  console.log("Hash changed:", location.hash); // ← Add this
  routeFromHash();
});

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
            <button class="delete-btn" title="Delete this board">🗑️</button>
          `;

          card.querySelector(".card-title").addEventListener("click", () => {
            location.hash = `#id=${board.id}`;
          });

          card.querySelector(".delete-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            const confirmDelete = confirm(`Delete "${board.title}"?`);
            if (!confirmDelete) return;

            const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
            if (res.ok) {
              card.remove();
            } else {
              alert("Failed to delete board.");
            }
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

  // Wait until PUT is complete
  const response = await fetch(`/api/boards/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newBoard),
  });

  if (!response.ok) {
    console.error("Failed to create board");
    return;
  }

  // Optional: slight delay to let server write file
  await new Promise(r => setTimeout(r, 100));

  // Now route to it
  location.hash = `#id=${id}`;
});


// === Board View Rendering ===
async function navigateToBoard(id, retries = 3) {
  console.log("Navigating to board:", id);
  let res;

  for (let i = 0; i < retries; i++) {
    try {
      res = await fetch(`/api/boards/${id}`);
      if (res.ok) break;
    } catch (_) {}
    console.warn("Board not ready, retrying...");
    await new Promise(r => setTimeout(r, 200));
  }

  if (!res || !res.ok) {
    console.error("Board not found after retries.");
    return;
  }

  const data = await res.json();

  boardData = data;
  boardId = id;

  document.getElementById("home-view").style.display = "none";
  document.getElementById("board-view").style.display = "block";

  if (typeof window.initializeBoard === "function") {
    window.initializeBoard(data, id);
  } else {
    console.error("Board module not loaded or initializeBoard missing.");
  }
}

