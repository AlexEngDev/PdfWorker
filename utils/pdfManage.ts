import 'react-native-get-random-values';
import * as FileSystem from 'expo-file-system';
import { PDFDocument, degrees } from 'pdf-lib';

export type PageItem = {
  originalIndex: number;
  rotation: 0 | 90 | 180 | 270;
  deleted: boolean;
};

/**
 * Loads a PDF and returns the number of pages.
 */
export async function getPdfPageCount(pdfUri: string): Promise<number> {
  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdfBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

/**
 * Applies page edits (reorder, rotation, deletion) to a PDF and saves the result.
 */
export async function applyPageEdits(
  pdfUri: string,
  pageItems: PageItem[],
  destPath: string
): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdfBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const srcDoc = await PDFDocument.load(pdfBytes);
  const newDoc = await PDFDocument.create();

  const activeItems = pageItems.filter((p) => !p.deleted);

  for (const item of activeItems) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalIndex]);
    if (item.rotation !== 0) {
      copiedPage.setRotation(degrees(item.rotation));
    }
    newDoc.addPage(copiedPage);
  }

  const newBytes = await newDoc.save();
  const newBase64 = btoa(String.fromCharCode(...newBytes));
  await FileSystem.writeAsStringAsync(destPath, newBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
