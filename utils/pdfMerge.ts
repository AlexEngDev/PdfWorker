import * as FileSystem from 'expo-file-system';
import { createPdfFromHtml } from './pdf';

/**
 * Merges multiple PDFs into a single PDF file saved at destPath.
 * Each PDF is embedded as a base64-encoded object/embed tag.
 */
export async function mergePdfs(pdfUris: string[], destPath: string): Promise<void> {
  const embedTags = await Promise.all(
    pdfUris.map(async (uri) => {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `<embed src="data:application/pdf;base64,${base64}" style="width:100%;height:100vh;page-break-after:always;" />`;
    })
  );

  const html = `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          embed { display: block; }
        </style>
      </head>
      <body>${embedTags.join('\n')}</body>
    </html>
  `;

  await createPdfFromHtml(html, destPath);
}
