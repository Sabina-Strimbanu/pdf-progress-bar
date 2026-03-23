/**
 Responsibilities:
  - Configure PDF.js
  - Load a PDF from a File object
  - Render a specific page onto a <canvas>
  - Expose a simple API that app.js calls
 */

// 1. Configure PDF.js worker 
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// 2. Store info about the pdf document
// 
let _pdfDoc = null;

// 3. Public API 

/**
 Load a PDF from a browser File object. Returns a Promise that resolves to { totalPages, fileName }.
 * @param {File} file - The File object from <input type="file">
 * @returns {Promise<{ totalPages: number, fileName: string }>}
 */
async function loadPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // FileReader is callback-based (older API), so we wrap it in a Promise
    reader.onload = async function (event) {
      try {
        const arrayBuffer = event.target.result; // raw bytes of the PDF
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

        _pdfDoc = await loadingTask.promise;

        resolve({
          totalPages: _pdfDoc.numPages,
          fileName: file.name,
        });
      } catch (err) {
        reject(new Error("Could not read this PDF. Is it password protected or corrupted?"));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read the file."));

    // Start reading — this triggers reader.onload when done
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Render a single page of the loaded PDF onto a canvas element.
 *
 * @param {number}          pageNum   - 1-indexed page number
 * @param {HTMLCanvasElement} canvas  - The <canvas> to draw into
 * @param {Function}        onStart   - Called when rendering begins (show loading)
 * @param {Function}        onDone    - Called when rendering finishes (hide loading)
 */
async function renderPage(pageNum, canvas, onStart, onDone) {
  if (!_pdfDoc) throw new Error("No PDF loaded. Call loadPDF() first.");

  onStart?.();

  // getPage() is 1-indexed, returns a PDFPageProxy
  const page = await _pdfDoc.getPage(pageNum);

  // We calculate the rendered page to be scaled such that it fits the viewer width.
  const containerWidth = canvas.parentElement?.clientWidth || 800;
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = Math.min((containerWidth - 32) / unscaledViewport.width, 2.5);
  const viewport = page.getViewport({ scale });

  // Size the canvas to exactly match the rendered page
  canvas.width  = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext("2d");

  // render() draws the page into the canvas context
  const renderTask = page.render({ canvasContext: context, viewport });
  await renderTask.promise;

  onDone?.();
}

/**
 * How many pages does the loaded PDF have?
 * Returns 0 if no PDF is loaded yet.
 */
function getTotalPages() {
  return _pdfDoc ? _pdfDoc.numPages : 0;
}
