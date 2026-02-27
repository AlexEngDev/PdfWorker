import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';

/**
 * Merges multiple PDF files into a single PDF.
 * Reads each PDF as base64 and creates an HTML page with embedded iframes
 * that is then printed to a new PDF file.
 */
export async function mergePdfs(pdfUris: string[], destPath: string): Promise<void> {
  const pages: string[] = [];

  for (const uri of pdfUris) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    pages.push(base64);
  }

  const html = `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          .page { page-break-after: always; padding: 20px; }
          .page:last-child { page-break-after: auto; }
          .page-header { font-family: Arial, sans-serif; color: #1E293B; margin-bottom: 10px; }
          .page-info { font-family: Arial, sans-serif; color: #64748B; font-size: 12px; }
          object, embed { width: 100%; min-height: 800px; }
        </style>
      </head>
      <body>
        ${pages
          .map(
            (base64, index) => `
          <div class="page">
            <p class="page-info">Document ${index + 1} of ${pages.length}</p>
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
