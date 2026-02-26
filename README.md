# PdfWorker

A clean, modern PDF utility app built with **React Native** and **Expo**.

## Features

- 📷 **Scan Documents** — Use your device camera to capture and save documents as PDFs
- ✍️ **Sign PDFs** — Pick a PDF and draw your signature directly on screen
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
│   ├── scan.tsx         # Camera scanner
│   ├── sign.tsx         # PDF signing
│   ├── convert.tsx      # Image-to-PDF converter
│   └── files.tsx        # File manager
├── components/
│   ├── ActionButton.tsx
│   ├── DocumentCard.tsx
│   └── SignatureCanvas.tsx
├── constants/
│   ├── colors.ts
│   └── config.ts
├── utils/
│   ├── pdf.ts
│   ├── fileSystem.ts
│   └── permissions.ts
├── app.json
├── babel.config.js
├── package.json
└── tsconfig.json
```

## License

MIT
