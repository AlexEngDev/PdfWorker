import 'react-native-get-random-values';
import * as FileSystem from 'expo-file-system';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export type WatermarkOptions = {
  text: string;
  opacity: number;
  fontSize: number;
};

/**
 * Adds a diagonal text watermark to every page of a PDF.
 */
export async function addWatermark(
  pdfUri: string,
  options: WatermarkOptions,
  destPath: string
): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdfBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    const x = (width - textWidth) / 2;
    const y = height / 2;

    page.drawText(options.text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: options.opacity,
      rotate: degrees(45),
    });
  }

  const newBytes = await pdfDoc.save();
  const newBase64 = btoa(String.fromCharCode(...newBytes));
  await FileSystem.writeAsStringAsync(destPath, newBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
