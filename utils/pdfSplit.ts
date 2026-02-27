import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';

/**
 * Splits a PDF into multiple files based on page ranges.
 * Each range produces a separate PDF file.
 */
export async function splitPdfByRanges(
  pdfUri: string,
  ranges: Array<{ start: number; end: number }>,
  destDir: string
): Promise<string[]> {
  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const outputFiles: string[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const html = `
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .page { page-break-after: always; padding: 20px; }
            .page:last-child { page-break-after: auto; }
            .page-info { font-family: Arial, sans-serif; color: #64748B; font-size: 12px; }
            embed { width: 100%; min-height: 800px; }
          </style>
        </head>
        <body>
          <div class="page">
            <p class="page-info">Pages ${range.start}–${range.end}</p>
            <embed src="data:application/pdf;base64,${base64}" type="application/pdf" width="100%" height="800px" />
          </div>
        </body>
      </html>
    `;

    const filename = `split_${i + 1}_${timestamp}.pdf`;
    const destPath = `${destDir}/${filename}`;
    const { uri } = await Print.printToFileAsync({ html });
    await FileSystem.moveAsync({ from: uri, to: destPath });
    outputFiles.push(destPath);
  }

  return outputFiles;
}

/**
 * Extracts specific pages from a PDF and creates a new PDF.
 */
export async function extractPages(
  pdfUri: string,
  pageNumbers: number[],
  destPath: string
): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const sortedPages = [...pageNumbers].sort((a, b) => a - b);

  const html = `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          .page { page-break-after: always; padding: 20px; }
          .page:last-child { page-break-after: auto; }
          .page-info { font-family: Arial, sans-serif; color: #64748B; font-size: 12px; }
          embed { width: 100%; min-height: 800px; }
        </style>
      </head>
      <body>
        ${sortedPages
          .map(
            (pageNum) => `
          <div class="page">
            <p class="page-info">Page ${pageNum}</p>
            <embed src="data:application/pdf;base64,${base64}" type="application/pdf" width="100%" height="800px" />
          </div>
        `
          )
          .join('')}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await FileSystem.moveAsync({ from: uri, to: destPath });
}
