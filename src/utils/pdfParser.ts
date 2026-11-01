import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite worker url import
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ExtractedPdfResult {
  text: string;
  pageCount: number;
}

export async function extractTextFromPdfFile(
  file: File,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<ExtractedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTexts: string[] = [];

  // Read up to 40 pages to keep extraction swift and accurate
  const maxPagesToRead = Math.min(numPages, 40);

  for (let pageNum = 1; pageNum <= maxPagesToRead; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, maxPagesToRead);
    }
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    pageTexts.push(`--- Trang ${pageNum} ---\n${strings.join(' ')}`);
  }

  return {
    text: pageTexts.join('\n\n'),
    pageCount: numPages,
  };
}
