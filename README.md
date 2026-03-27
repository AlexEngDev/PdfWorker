# PdfWorker

A clean, modern PDF utility app built with **React Native** and **Expo**.

## Features

- 📷 **Scan Documents** — Use your device camera to capture and save documents as PDFs
- 📷 **Multi-page Scan** — Scan multiple pages in batch mode and combine them into a single multi-page PDF
- ✍️ **Sign PDFs** — Pick a PDF and draw your signature directly on screen
- 💾 **Saved Signatures** — Save frequently used signatures and reuse them across documents
- 🔀 **Merge PDFs** — Combine multiple PDF files into one with drag-to-reorder support
- 🖼️ **Convert Images to PDF** — Select multiple photos and merge them into a single PDF
- ✂️ **Split PDF** — Extract page ranges from a PDF into separate files
- 🗜️ **Compress PDF** — Reduce PDF file size at three quality levels (high / medium / low)
- 🔄 **Manage Pages** — Rotate, delete, and reorder individual pages in any PDF
- 🖍️ **Watermark PDF** — Overlay a custom diagonal text watermark on every page (adjustable opacity and size)
- 🔒 **Protect / Unlock PDF** — Encrypt a PDF with AES-256 password protection, or remove an existing password
- 🌙 **Dark / Light Theme** — Follows the system colour scheme by default; toggle manually with one tap
- 📂 **My Files** — Browse, share, rename, and delete your saved PDFs

## Tech Stack

- [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (managed workflow)
- [Expo Router](https://expo.github.io/router/) for file-based navigation
- [pdf-lib](https://pdf-lib.js.org/) for PDF manipulation (page management, watermarks, encryption)
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
│   ├── _layout.tsx        # Tab navigation root (with ThemeProvider)
│   ├── index.tsx          # Home screen
│   ├── scan.tsx           # Camera scanner (multi-page)
│   ├── sign.tsx           # PDF signing (with saved signatures)
│   ├── convert.tsx        # Image-to-PDF converter
│   ├── merge.tsx          # PDF merge tool
│   ├── split.tsx          # PDF split tool
│   ├── compress.tsx       # PDF compression tool
│   ├── manage-pages.tsx   # Page rotate / delete / reorder
│   ├── watermark.tsx      # PDF watermark tool
│   ├── protect-pdf.tsx    # PDF encrypt / decrypt tool
│   └── files.tsx          # File manager
├── assets/                # App icons and splash images (see assets/README.md)
├── components/
│   ├── ActionButton.tsx
│   ├── DocumentCard.tsx
│   └── SignatureCanvas.tsx
├── constants/
│   ├── colors.ts          # DarkColors, LightColors, and Colors (alias for dark)
│   └── config.ts
├── contexts/
│   └── ThemeContext.tsx   # ThemeProvider + useTheme hook
├── types/
│   ├── pdf.ts
│   └── signature.ts
├── utils/
│   ├── pdf.ts
│   ├── pdfMerge.ts
│   ├── pdfSplit.ts
│   ├── pdfCompress.ts
│   ├── pdfManage.ts       # Page rotation / deletion via pdf-lib
│   ├── pdfWatermark.ts    # Watermark overlay via pdf-lib
│   ├── pdfProtect.ts      # AES-256 encrypt / decrypt via pdf-lib
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
