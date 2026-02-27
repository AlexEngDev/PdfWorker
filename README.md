# PdfWorker

A clean, modern PDF utility app built with **React Native** and **Expo**.

## Features

- 📷 **Scan Documents** — Use your device camera to capture and save documents as PDFs
- 📑 **Multi-page Scan** — Capture multiple pages in one session and save them as a single multi-page PDF; review thumbnails, retake, or remove individual pages before saving
- ✍️ **Sign PDFs** — Pick a PDF and draw your signature directly on screen
- 🔖 **Saved Signatures** — Save signatures for reuse; browse and select from your saved signatures when signing a document
- 🖼️ **Convert Images to PDF** — Select multiple photos and merge them into a single PDF
- 🔀 **Merge PDFs** — Select two or more PDF files, reorder them, and combine into a single PDF
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
│   ├── merge.tsx        # PDF merger
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
│   └── pdf.ts           # Shared TypeScript types
├── utils/
│   ├── pdf.ts
│   ├── pdfMerge.ts      # PDF merging utility
│   ├── signatures.ts    # Saved signatures utility
│   ├── fileSystem.ts
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
