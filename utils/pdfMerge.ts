import * as FileSystem from 'expo-file-system';
import { createPdfFromHtml } from './pdf';

// A4 page height in pixels at 96 DPI (841.89pt × 96/72 ≈ 1123px)
const A4_PAGE_HEIGHT_PX = 1123;

/**
 * Merges multiple PDF files into a single PDF by embedding each as a base64 data URI.
 * Uses expo-print to render an HTML page with each PDF embedded.
 */
export async function mergePdfs(pdfUris: string[], destPath: string): Promise<void> {
  const base64Pages = await Promise.all(
    pdfUris.map((uri) => FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }))
  );

  const iframes = base64Pages
    .map(
      (b64) =>
        `<iframe src="data:application/pdf;base64,${b64}" style="width:100%;height:${A4_PAGE_HEIGHT_PX}px;border:none;display:block;page-break-after:always;"></iframe>`
    )
    .join('');

  const html = `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          iframe { display: block; }
        </style>
      </head>
      <body>${iframes}</body>
    </html>
  `;

  await createPdfFromHtml(html, destPath);
}
