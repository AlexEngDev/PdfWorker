# PdfWorker

A clean, modern PDF utility app built with **React Native** and **Expo**.

## Features

- 📷 **Scan Documents** — Use your device camera to capture and save documents as PDFs
- 📷 **Multi-page Scan** — Scan multiple pages in batch mode and combine them into a single multi-page PDF
- ✍️ **Sign PDFs** — Pick a PDF and draw your signature directly on screen
- 💾 **Saved Signatures** — Save frequently used signatures and reuse them across documents
- 🔀 **Merge PDFs** — Combine multiple PDF files into one with drag-to-reorder support
- 🖼️ **Convert Images to PDF** — Select multiple photos and merge them into a single PDF
- ✂️ **Split PDF** — Split a PDF by page ranges or extract individual pages
- 🗜️ **Compress PDF** — Reduce PDF file size with selectable quality levels
- 🖼️ **PDF to Images** — Extract every page of a PDF as a JPEG image and save to your gallery *(offline-capable)*
- 📝 **Extract Text (OCR)** — Recognise text in scanned documents and images, entirely on-device — no data leaves your phone *(offline-capable)*
- 📂 **My Files** — Browse, share, and delete your saved PDFs

## Offline Capabilities

Two features use a WebView-based processing pipeline so that **no image or document data ever leaves your device**:

| Feature | Engine | How it works |
|---|---|---|
| **PDF to Images** | [PDF.js](https://mozilla.github.io/pdf.js/) | Each PDF page is rendered to a `<canvas>` inside a hidden WebView and exported as a JPEG. Images are saved to your media library via `expo-media-library`. |
| **Extract Text (OCR)** | [Tesseract.js](https://tesseract.projectnaptha.com/) | Your image is passed to Tesseract.js running inside a hidden WebView. Recognition runs entirely in JavaScript on the device. Supports English, Russian, German, French, Spanish, and more. |

> **Note:** Both engines are loaded from a CDN on first use. After the initial download they are cached by the WebView and work fully offline. For a fully air-gapped build, bundle the minified JS files under `assets/` and update the `<script src>` paths accordingly.

## Tech Stack

- [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (managed workflow)
- [Expo Router](https://expo.github.io/router/) for file-based navigation
- TypeScript

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Install

```bash
npm install
```

### Run

```bash
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with [Expo Go](https://expo.dev/client).

## Folder Structure

```
PdfWorker/
├── app/
│   ├── _layout.tsx      # Tab navigation root
│   ├── index.tsx        # Home screen
│   ├── scan.tsx         # Camera scanner (multi-page)
│   ├── sign.tsx         # PDF signing (with saved signatures)
│   ├── convert.tsx      # Image-to-PDF converter
│   ├── merge.tsx        # PDF merge tool
│   ├── split.tsx        # PDF split tool
│   ├── compress.tsx     # PDF compression
│   ├── pdf-to-image.tsx # PDF page extraction to images (offline OCR-ready)
│   ├── ocr.tsx          # Offline OCR — extract text from images & scans
│   └── files.tsx        # File manager
├── assets/              # App icons and splash images (see assets/README.md)
├── components/
│   ├── ActionButton.tsx
│   ├── DocumentCard.tsx
│   └── SignatureCanvas.tsx
├── constants/
│   ├── colors.ts
│   └── config.ts
├── types/
│   ├── pdf.ts           # Shared TypeScript types
│   └── signature.ts     # Saved signature types
├── utils/
│   ├── pdf.ts
│   ├── pdfMerge.ts
│   ├── fileSystem.ts
│   ├── signatures.ts
│   └── permissions.ts
├── app.json
├── babel.config.js
├── package.json
└── tsconfig.json
```

> **Note:** Before building, add the required image assets to the `assets/` directory.
> See [`assets/README.md`](./assets/README.md) for the required filenames and dimensions.

## License

MIT
