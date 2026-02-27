import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';

type CompressionQuality = 'high' | 'medium' | 'low';

const qualitySettings: Record<CompressionQuality, { width: number; height: number }> = {
  high: { width: 612, height: 792 },
  medium: { width: 540, height: 700 },
  low: { width: 460, height: 600 },
};

/**
 * Compresses a PDF by re-rendering it through expo-print at different quality levels.
 * Returns the original and compressed file sizes.
 */
export async function compressPdf(
  pdfUri: string,
  quality: CompressionQuality,
  destPath: string
): Promise<{ originalSize: number; compressedSize: number }> {
  const originalInfo = await FileSystem.getInfoAsync(pdfUri, { size: true });
  const originalSize = originalInfo.exists && 'size' in originalInfo ? (originalInfo.size ?? 0) : 0;

  const base64 = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const settings = qualitySettings[quality];

  const html = `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          embed { width: 100%; min-height: ${settings.height}px; }
        </style>
      </head>
      <body>
        <embed src="data:application/pdf;base64,${base64}" type="application/pdf" width="${settings.width}px" height="${settings.height}px" />
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({
    html,
    width: settings.width,
    height: settings.height,
  });

  await FileSystem.moveAsync({ from: uri, to: destPath });

  const compressedInfo = await FileSystem.getInfoAsync(destPath, { size: true });
  const compressedSize =
    compressedInfo.exists && 'size' in compressedInfo ? (compressedInfo.size ?? 0) : 0;

  return { originalSize, compressedSize };
}
