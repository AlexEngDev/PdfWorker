import * as FileSystem from 'expo-file-system';
import { PDF_DIRECTORY } from '../constants/config';
import type { PdfFile } from '../types/pdf';

/**
 * Returns the path to the app's PDF directory, creating it if needed.
 */
export async function getPdfDirectory(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}${PDF_DIRECTORY}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Lists all PDF files in the app's PDF directory.
 */
export async function listPdfFiles(): Promise<PdfFile[]> {
  const dir = await getPdfDirectory();
  const names = await FileSystem.readDirectoryAsync(dir);
  const pdfNames = names.filter((n) => n.toLowerCase().endsWith('.pdf'));

  const files: PdfFile[] = await Promise.all(
    pdfNames.map(async (name) => {
      const uri = `${dir}/${name}`;
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      return {
        name,
        uri,
        size: info.exists && 'size' in info ? (info.size ?? 0) : 0,
        modificationTime:
          info.exists && 'modificationTime' in info ? (info.modificationTime ?? 0) : 0,
      };
    })
  );

  return files.sort((a, b) => b.modificationTime - a.modificationTime);
}

/**
 * Deletes a PDF file at the given URI.
 */
export async function deletePdfFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

/**
 * Returns a human-readable file size string.
 */
export function getFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
