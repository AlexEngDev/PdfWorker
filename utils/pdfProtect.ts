/**
 * PDF password protection utilities.
 *
 * Note: pdf-lib v1.17.1 does not expose PDF encryption in its public API.
 * These functions throw a descriptive error so the UI can inform the user.
 * Full AES-256 PDF encryption will be supported in a future update once a
 * compatible native module is available.
 */

export async function protectPdf(
  _pdfUri: string,
  _password: string,
  _destPath: string
): Promise<void> {
  throw new Error(
    'PDF encryption is not yet supported in this version of the app. ' +
      'This feature requires an additional native module and will be available in a future update.'
  );
}

export async function unlockPdf(
  _pdfUri: string,
  _password: string,
  _destPath: string
): Promise<void> {
  throw new Error(
    'PDF decryption is not yet supported in this version of the app. ' +
      'This feature requires an additional native module and will be available in a future update.'
  );
}
