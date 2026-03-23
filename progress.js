/*
 math behind the mini pdf reader
 */

/*
  Calculate what percentage of the goal has been read.
 
  @param {number} currentPage  - The page the user is currently on
  @param {number} startPage    - The page they started from
  @param {number} goalPage     - The target page they want to reach
  @returns {number}            - A value from 0 to 100 (clamped)
 */

function calcPercent(currentPage, startPage, goalPage) {
  const totalPagesToRead = goalPage - startPage;   
  const pagesRead        = currentPage - startPage; 

  if (totalPagesToRead <= 0) return 100; // edge case: goal is the start page

  const raw = (pagesRead / totalPagesToRead) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/*
  How many pages remain until the goal?
 
  @param {number} currentPage
  @param {number} goalPage
  @returns {number}
 */
function calcPagesLeft(currentPage, goalPage) {
  return Math.max(0, goalPage - currentPage);
}

/*
 Build the full progress state object that the UI will consume.

  @param {number} currentPage
  @param {number} startPage
  @param {number} goalPage
  @param {number} totalPages   - Total pages in the PDF (for clamping)
  @returns {{ percent, pagesLeft, isComplete, currentPage, goalPage, startPage }}
 */

function buildProgressState(currentPage, startPage, goalPage, totalPages) {
  // Clamp everything to valid ranges
  const safeCurrent = Math.min(Math.max(currentPage, 1), totalPages);
  const safeStart   = Math.min(Math.max(startPage, 1), totalPages);
  const safeGoal    = Math.min(Math.max(goalPage, 1), totalPages);

  const percent   = calcPercent(safeCurrent, safeStart, safeGoal);
  const pagesLeft = calcPagesLeft(safeCurrent, safeGoal);
  const isComplete = safeCurrent >= safeGoal;

  return { percent, pagesLeft, isComplete, currentPage: safeCurrent, goalPage: safeGoal, startPage: safeStart };
}

/*
  Validate the goal form inputs before the user starts.
 
  @param {number} startPage
  @param {number} goalPage
  @param {number} totalPages
  @returns {{ valid: boolean, message: string }}
 */

function validateGoal(startPage, goalPage, totalPages) {
  if (!goalPage || isNaN(goalPage))   return { valid: false, message: "Please enter a goal page." };
  if (!startPage || isNaN(startPage)) return { valid: false, message: "Please enter a start page." };
  if (startPage < 1)                  return { valid: false, message: "Start page must be at least 1." };
  if (goalPage > totalPages)          return { valid: false, message: `Goal page can't exceed the PDF's ${totalPages} pages.` };
  if (goalPage <= startPage)          return { valid: false, message: "Goal page must be greater than the start page." };
  return { valid: true, message: "" };
}
