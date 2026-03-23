/*
Responsibilities:
 1. Listen to user events (click, file drop, keypress…)
 2. Call pdfEngine.js or progress.js functions and update the DOM with results
 */

// State - holds everything we need to know about the current session.
const state = {
  currentPage: 1,
  startPage:   1,
  goalPage:    null,
  totalPages:  0,
  fileName:    "",
};

//  DOM references 
const screens = {
  upload:  document.getElementById("upload-screen"),
  goal:    document.getElementById("goal-screen"),
  tracker: document.getElementById("tracker-screen"),
};

const canvas     = document.getElementById("pdf-canvas");
const loading    = document.getElementById("loading-indicator");
const fileInput  = document.getElementById("file-input");
const dropZone   = document.getElementById("drop-zone");

// Goal screen elements
const bookName        = document.getElementById("book-name");
const totalPagesLabel = document.getElementById("total-pages-label");
const goalInput       = document.getElementById("goal-input");
const startInput      = document.getElementById("start-input");
const goalError       = document.getElementById("goal-error");
const startBtn        = document.getElementById("start-btn");

// Tracker screen elements
const prevBtn            = document.getElementById("prev-btn");
const nextBtn            = document.getElementById("next-btn");
const jumpInput          = document.getElementById("jump-input");
const totalDisplay       = document.getElementById("total-display");
const progressFill       = document.getElementById("progress-fill");
const percentDisplay     = document.getElementById("percent-display");
const currentPageDisplay = document.getElementById("current-page-display");
const goalPageDisplay    = document.getElementById("goal-page-display");
const pagesLeftDisplay   = document.getElementById("pages-left-display");
const resetBtn           = document.getElementById("reset-btn");
const uploadError        = document.getElementById("upload-error");

// Screen switcher 
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// Called when the user picks or drops a file
async function handleFile(file) {
  if (!file || file.type !== "application/pdf") {
    showUploadError("Please select a valid PDF file.");
    return;
  }

  uploadError.hidden = true;

  try {
    // loadPDF() is from pdfEngine.js — it reads the file and returns page count + name
    const { totalPages, fileName } = await loadPDF(file);

    state.totalPages = totalPages;
    state.fileName   = fileName;

    // Populate the goal screen with what we just learned
    bookName.textContent        = fileName;
    totalPagesLabel.textContent = `${totalPages} pages`;
    goalInput.max               = totalPages;
    startInput.max              = totalPages;
    goalInput.value             = "";
    goalInput.placeholder       = `2 – ${totalPages}`;

    showScreen("goal");

  } catch (err) {
    showUploadError(err.message);
  }
}

function showUploadError(msg) {
  uploadError.textContent = msg;
  uploadError.hidden = false;
}

// File input (click to browse)
fileInput.addEventListener("change", (e) => {
  handleFile(e.target.files[0]);
});

// Drag-and-drop onto the drop zone
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  handleFile(e.dataTransfer.files[0]);
});

// Goal form 

startBtn.addEventListener("click", () => {
  const startPage = parseInt(startInput.value, 10);
  const goalPage  = parseInt(goalInput.value, 10);

  // validateGoal() is from progress.js
  const { valid, message } = validateGoal(startPage, goalPage, state.totalPages);

  if (!valid) {
    goalError.textContent = message;
    goalError.hidden = false;
    return;
  }

  goalError.hidden = true;
  state.startPage   = startPage;
  state.goalPage    = goalPage;
  state.currentPage = startPage;

  // Set up the tracker UI
  totalDisplay.textContent    = state.totalPages;
  jumpInput.max               = state.totalPages;
  goalPageDisplay.textContent = goalPage;

  showScreen("tracker");
  goToPage(startPage);
});

//  Page navigation 

async function goToPage(pageNum) {
  // Clamp to valid range
  const target = Math.min(Math.max(pageNum, 1), state.totalPages);
  state.currentPage = target;

  // renderPage() is from pdfEngine.js
  await renderPage(
    target,
    canvas,
    () => { loading.style.display = "flex"; },   // onStart: show spinner
    () => { loading.style.display = "none"; }    // onDone: hide spinner
  );

  updateProgressUI();
  updateNavUI();
}

prevBtn.addEventListener("click", () => goToPage(state.currentPage - 1));
nextBtn.addEventListener("click", () => goToPage(state.currentPage + 1));

// Keyboard arrow keys for navigation
document.addEventListener("keydown", (e) => {
  if (e.target === jumpInput || e.target === goalInput || e.target === startInput) return;
  if (!screens.tracker.classList.contains("active")) return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") goToPage(state.currentPage + 1);
  if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goToPage(state.currentPage - 1);
});

// Jump-to-page input
jumpInput.addEventListener("change", (e) => {
  const val = parseInt(e.target.value, 10);
  if (!isNaN(val)) goToPage(val);
});

// Progress UI update 

function updateProgressUI() {
  // buildProgressState() is from progress.js — returns all the numbers we need
  const progress = buildProgressState(
    state.currentPage,
    state.startPage,
    state.goalPage,
    state.totalPages
  );

  // Update the progress bar width
  progressFill.style.width = `${progress.percent}%`;

  // Update text displays
  percentDisplay.textContent     = `${progress.percent}%`;
  currentPageDisplay.textContent = progress.currentPage;
  pagesLeftDisplay.textContent   = progress.pagesLeft;

  // Celebrate if the goal is reached!
  if (progress.isComplete) {
    progressFill.classList.add("complete");
    pagesLeftDisplay.textContent = "🎉 done!";
  } else {
    progressFill.classList.remove("complete");
  }
}

function updateNavUI() {
  // Disable prev/next at boundaries
  prevBtn.disabled  = state.currentPage <= 1;
  nextBtn.disabled  = state.currentPage >= state.totalPages;
  jumpInput.value   = state.currentPage;
}

// Reset 

resetBtn.addEventListener("click", () => {
  state.currentPage = 1;
  state.startPage   = 1;
  state.goalPage    = null;
  state.totalPages  = 0;
  state.fileName    = "";
  fileInput.value   = "";
  uploadError.hidden = true;
  showScreen("upload");
});
