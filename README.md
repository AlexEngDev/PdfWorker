# PdfWorker

A clean, modern PDF utility app built with **React Native** and **Expo**.

## Features

- 📷 **Scan Documents** — Use your device camera to capture and save documents as PDFs
- 📷 **Multi-page Scan** — Scan multiple pages in batch mode and combine them into a single multi-page PDF
- ✍️ **Sign PDFs** — Pick a PDF and draw your signature directly on screen
- 💾 **Saved Signatures** — Save frequently used signatures and reuse them across documents
- 🔀 **Merge PDFs** — Combine multiple PDF files into one with drag-to-reorder support
- ✂️ **Split PDF** — Extract specific pages or split a PDF into multiple files by page range
- 🗜️ **Compress PDF** — Reduce the file size of a PDF with selectable quality levels
- 🖼️ **Convert Images to PDF** — Select multiple photos and merge them into a single PDF
- 📂 **My Files** — Browse, share, and delete your saved PDFs

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
│   ├── split.tsx        # PDF splitter (by range or page extraction)
│   ├── compress.tsx     # PDF compression with quality levels
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
│   ├── pdfSplit.ts
│   ├── pdfCompress.ts
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
