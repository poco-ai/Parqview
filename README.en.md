<p align="right">
  <a href="./README.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <img src="./docs/parqview-preview.png" alt="Parqview preview" width="100%" />
</p>

# Parqview

Parqview is a cross-platform Parquet file viewer built with Tauri 2. Files are
parsed locally and never need to be uploaded to a server.

## Features

- Table, direct, and JSON views
- Dataset-wide search with field filtering and match highlighting
- Multi-row table pagination; one record per page in direct and JSON views
- Editable page number and 25 / 50 / 100-row page sizes
- Collapsible field panels and two-space JSON indentation
- Themes, dark mode, Chinese/English UI, font family, and font size settings
- Snappy, GZIP, ZSTD, Brotli, LZ4, and other common codecs
- Fully offline: data remains on the current device

## Supported platforms

| Platform | Bundle |
| --- | --- |
| Windows 10/11 x64 | NSIS installer |
| macOS Apple Silicon / Intel | DMG |
| Linux x64 | Debian package and AppImage |

## Development

### Prerequisites

- Node.js 22+
- Rust stable
- Platform-specific [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

```bash
npm install
npm run tauri:dev
```

To run only the browser frontend:

```bash
npm run dev
```

## Checks and builds

```bash
npm run lint
npm test
npm run tauri:build
```

Frontend assets are written to `dist/`. Native bundles are written to
`src-tauri/target/release/bundle/`.

Push a `v*` tag or manually run
[`Build Tauri`](./.github/workflows/tauri-build.yml) to build Windows, macOS,
and Linux bundles.

## Repository layout

```text
frontend/        React UI and local Parquet parsing
src-tauri/       Rust host, permissions, icons, and bundle configuration
tests/           Frontend and Tauri configuration tests
docs/            Repository documentation assets
assets/          Editable application icon source
```

## Privacy

Parquet files are read directly by `hyparquet` inside the WebView. The
application has no upload endpoint and does not send file contents to external
services.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting changes. See
[SECURITY.md](./SECURITY.md) for security reports.

## License

[MIT](./LICENSE)
