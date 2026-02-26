import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

/**
 * Creates a PDF from an array of image URIs and saves it to destPath.
 */
export async function createPdfFromImages(imageUris: string[], destPath: string): Promise<void> {
  const imgTags = imageUris
    .map(
      (uri) =>
        `<img src="${uri}" style="width:100%;page-break-after:always;display:block;margin:0 auto;" />`
    )
    .join('');

  const html = `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>${imgTags}</body>
    </html>
  `;

  await createPdfFromHtml(html, destPath);
}

/**
 * Creates a PDF from an HTML string and saves it to destPath.
 */
export async function createPdfFromHtml(html: string, destPath: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  await FileSystem.moveAsync({ from: uri, to: destPath });
}

/**
 * Saves an HTML string as a PDF to destPath.
 */
export async function savePdf(html: string, destPath: string): Promise<void> {
  await createPdfFromHtml(html, destPath);
}
