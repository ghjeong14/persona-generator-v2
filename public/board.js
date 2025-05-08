const tabs = document.querySelectorAll(".tab-button");
const boardControls = document.getElementById("board-controls");
const timelineControls = document.getElementById("timeline-controls");
const addLabelBtn = document.getElementById("addLabelBtn");
const addNoteBtn = document.getElementById("addNoteBtn");

// Rename logic
const titleEl = document.getElementById("board-title");
const renameBtn = document.getElementById("rename-btn");
//const pageTitle = document.getElementById("page-title");

// ----------------------
// Sticky Note Creation
// ----------------------
let noteId = 0;
const board = document.getElementById("canvas");
const selected = new Set();

// Saving boards
function saveBoardToServer() {
  const boardId = location.hash.replace("#id=", "");
  fetch(`/api/boards/${boardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getBoardState())
  });
}


function getBoardState() {
  return {
    notes: Array.from(document.querySelectorAll(".note")).map(note => ({
      id: note.dataset.id,
      x: parseFloat(note.style.left),
      y: parseFloat(note.style.top),
      content: note.querySelector(".content")?.innerText || note.innerText,
    })),
    labels: Array.from(document.querySelectorAll(".group-label")).map(label => ({
      x: parseFloat(label.style.left),
      y: parseFloat(label.style.top),
      text: label.innerText,
      linkedNoteIds: label.dataset.linkedNotes || "",
    })),
    title: document.getElementById("board-title")?.innerText || "Untitled Board"
  };
}



// Mode switch logic
tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const mode = btn.dataset.mode;
    boardControls.style.display = mode === "board" ? "flex" : "none";
    timelineControls.style.display = mode === "timeline" ? "flex" : "none";
  });
});

  
// ========== Delete Group with Backspace ==========
document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const isDeleteGroup = e.key === "Backspace" && (isMac ? e.metaKey : e.ctrlKey);
    if (isDeleteGroup) {
      document.querySelectorAll(".note-group").forEach(group => {
        if (group.contains(document.activeElement)) {
          const notes = group.querySelectorAll(".note");
          notes.forEach(note => board.appendChild(note));
          group.remove();
          saveBoardToServer();
        }
      });
    }
    // Delete selected notes with Backspace (no modifier keys)
    if (e.key === "Backspace" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      selected.forEach(el => {
        if (el.classList.contains("group-label")) {
          // Remove linked notes too
          const linked = (el.dataset.linkedNotes || "").split(",")
            .map(id => document.querySelector(`.note[data-id="${id}"]`));
          linked.forEach(n => n?.remove());
          el.remove();
        } else {
          el.remove();
        }
      });      
        selected.clear();
        saveBoardToServer();
      }
});


  
// ========== Lasso Selection ==========
let lassoBox = null;
let lassoStart = null;
  
board.addEventListener("mousedown", (e) => {
    if (e.target !== board) return;
  
    clearSelection();
    const boardRect = board.getBoundingClientRect();
    lassoStart = {
      x: e.clientX - boardRect.left,
      y: e.clientY - boardRect.top
    };

  
    lassoBox = document.createElement("div");
    lassoBox.className = "lasso-box";
    lassoBox.style.left = `${lassoStart.x}px`;
    lassoBox.style.top = `${lassoStart.y}px`;
    board.appendChild(lassoBox);
  
    const onMove = (ev) => {
      const x = ev.clientX - boardRect.left;
      const y = ev.clientY - boardRect.top;
      const width = Math.abs(x - lassoStart.x);
      const height = Math.abs(y - lassoStart.y);
      lassoBox.style.width = `${width}px`;
      lassoBox.style.height = `${height}px`;
      lassoBox.style.left = `${Math.min(x, lassoStart.x)}px`;
      lassoBox.style.top = `${Math.min(y, lassoStart.y)}px`;
  
      document.querySelectorAll(".note").forEach(note => {
        const rect = note.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        const noteX = rect.left - boardRect.left;
        const noteY = rect.top - boardRect.top;
        const noteW = rect.width;
        const noteH = rect.height;
  
        const withinX = noteX + noteW > Math.min(x, lassoStart.x) && noteX < Math.max(x, lassoStart.x);
        const withinY = noteY + noteH > Math.min(y, lassoStart.y) && noteY < Math.max(y, lassoStart.y);
  
        if (withinX && withinY) {
          note.classList.add("selected");
          selected.add(note);
        } else {
          note.classList.remove("selected");
          selected.delete(note);
        }
      });
    };
  
    const onUp = () => {
      lassoBox.remove();
      lassoBox = null;
      board.removeEventListener("mousemove", onMove);
      board.removeEventListener("mouseup", onUp);
    };
  
    board.addEventListener("mousemove", onMove);
    board.addEventListener("mouseup", onUp);
});  

// Start non-editable
titleEl.contentEditable = "false";

// Enable editing on button click
renameBtn.addEventListener("click", () => {
  titleEl.contentEditable = "true";
  titleEl.focus();

  // Move cursor to end
  document.execCommand("selectAll", false, null);
  document.getSelection().collapseToEnd();
});


// Disable editing on Enter or blur
titleEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    titleEl.blur();
  }
});

titleEl.addEventListener("blur", () => {
  titleEl.contentEditable = "false";
  document.title = titleEl.textContent.trim() || "Untitled Board";
  saveBoardToServer();
});

function clearSelection() {
    selected.forEach(el => el.classList.remove("selected"));
    selected.clear();
}

function createNote({ id, x = 150, y = 150, text = "" } = {}) {
  const note = document.createElement("div");
  note.className = "note";
  note.style.left = `${x}px`;
  note.style.top = `${y}px`;
  note.dataset.id = id || crypto.randomUUID();

  const content = document.createElement("div");
  content.className = "noteContent";
  content.textContent = text;
  note.appendChild(content);

  note.addEventListener("mouseup", saveBoardToServer);
  content.addEventListener("blur", () => {
    content.contentEditable = "false";
    saveBoardToServer();
  });

  board.appendChild(note);

  note.addEventListener("mousedown", (e) => {
    if (e.detail === 2) return;
    if (!selected.has(note) && !e.shiftKey) clearSelection();
    if (e.shiftKey && selected.has(note)) {
      note.classList.remove("selected");
      selected.delete(note);
    } else {
      note.classList.add("selected");
      selected.add(note);
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const origin = Array.from(selected).map((n) => ({
      el: n,
      left: parseFloat(n.style.left),
      top: parseFloat(n.style.top),
    }));

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      origin.forEach((o) => {
        o.el.style.left = `${o.left + dx}px`;
        o.el.style.top = `${o.top + dy}px`;
      });
    };

    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });

  note.addEventListener("dblclick", () => {
    clearSelection();
    content.contentEditable = true;
    content.focus();
    note.classList.add("editing");
  });

  content.addEventListener("blur", () => {
    content.contentEditable = false;
    note.classList.remove("editing");
    saveBoardToServer();
  });
}


if (addNoteBtn) {
  addNoteBtn.addEventListener("click", () => {
    createNote({
      x: Math.random() * (board.clientWidth - 220) + 20,
      y: Math.random() * (board.clientHeight - 160) + 20,
    });
  });
}

function setBoardState(state) {
    clearBoard();
    titleEl.textContent = state.title || "Untitled Board";
    document.title = state.title || "Untitled Board";
    state.notes.forEach(data => createNote(data));
    if (state.labels) {
      state.labels.forEach(data => createLabel(data));
    }   
}
  
function clearBoard() {
    document.querySelectorAll(".note").forEach(n => n.remove());
    selected.clear();
}
  
// // Load board on startup
// const boardId = location.hash.replace("#id=", "");

// fetch(`/api/boards/${boardId}`)
// .then(res => res.json())
// .then(data => setBoardState(data))
// .catch(() => console.warn("Board not found"));
  

document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isUngroup = (isMac && e.metaKey && e.key === "Backspace") ||
                      (!isMac && e.ctrlKey && e.key === "Backspace");
  
    if (isUngroup) {
      const groups = document.querySelectorAll(".note-group");
      groups.forEach(group => {
        const notes = group.querySelectorAll(".note");
        notes.forEach(note => board.appendChild(note));
        group.remove();
      });
      saveBoardToServer();
    }
});

function createLabel({ x, y, text, linkedNoteIds }) {
  const label = document.createElement("div");
  label.className = "group-label";
  label.textContent = text;
  label.setAttribute("tabindex", "0");
  label.style.position = "absolute";
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
  label.dataset.linkedNotes = linkedNoteIds;

  label.contentEditable = false;

  label.addEventListener("dblclick", () => {
    label.contentEditable = true;
    label.focus();
  });

  label.addEventListener("blur", () => {
    label.contentEditable = false;
    saveBoardToServer();
  });

  label.addEventListener("mousedown", (e) => {
    if (!e.shiftKey) clearSelection();
    label.classList.add("selected");
    selected.add(label);
  
    const startX = e.clientX;
    const startY = e.clientY;
    const labelStartX = parseFloat(label.style.left);
    const labelStartY = parseFloat(label.style.top);
  
    const linkedNoteIds = (label.dataset.linkedNotes || "").split(",");
    const linkedNotes = linkedNoteIds
      .map(id => document.querySelector(`.note[data-id="${id}"]`))
      .filter(n => n !== null);  // ✅ prevent null
    
    linkedNotes.forEach(n => n.classList.add("linked"));

    if (linkedNotes.length === 0) return;  // 💡 optionally skip drag if no notes found
  
    const noteStartPositions = linkedNotes.map(n => ({
      el: n,
      x: parseFloat(n.style.left),
      y: parseFloat(n.style.top),
    }));
  
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      label.style.left = `${labelStartX + dx}px`;
      label.style.top = `${labelStartY + dy}px`;
      noteStartPositions.forEach(({ el, x, y }) => {
        el.style.left = `${x + dx}px`;
        el.style.top = `${y + dy}px`;
      });
    };
  
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      linkedNotes.forEach(n => n.classList.remove("linked"));
    };
  
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });  

  board.appendChild(label);
  return label;
}

addLabelBtn.addEventListener("click", () => {
  if (selected.size < 1) return alert("Select at least one sticky note");

  const notes = Array.from(selected).filter(el => el.classList.contains("note"));

  let minX = Infinity, minY = Infinity, maxX = -Infinity;
  notes.forEach(note => {
    const x = parseFloat(note.style.left);
    const y = parseFloat(note.style.top);
    const width = note.offsetWidth;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
  });

  const label = createLabel({
    x: (minX + maxX) / 2 - 60,
    y: minY - 40,
    text: "New Label",
    linkedNoteIds: notes.map(n => n.dataset.id).join(",")
  });

  label.contentEditable = true;
  label.focus();
  saveBoardToServer();
});

// Inside board.js
function initializeBoard(data, id) {
  // Set global data
  window.boardData = data;
  window.boardId = id;

  // Setup title
  titleEl.textContent = data.title || "Untitled Board";
  document.title = data.title || "Untitled Board";

  // Render board
  clearBoard();

  // After notes are rendered
  const labelQueue = [];

  data.labels?.forEach(labelData => {
    labelQueue.push(labelData); // Save for now
  });

  data.notes?.forEach(n => createNote(n)); // Render notes first

  labelQueue.forEach(l => createLabel(l)); // Now create labels

}

window.initializeBoard = initializeBoard;

document.getElementById("back-to-home").addEventListener("click", () => {
  location.hash = "";
});

import { generatePersona } from "./persona.js";

document.getElementById("generate-persona").addEventListener("click", async () => {
  const prompt = "Generate a UX persona based on this axial coding summary...";
  try {
    const output = await generatePersona(prompt);
    alert(output); // Or render it in UI
  } catch (e) {
    console.error(e);
    alert("Failed to generate persona.");
  }
});
