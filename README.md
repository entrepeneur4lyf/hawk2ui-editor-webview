# Hawk2UI Editor Webview Sidecar

This repository is a WebviewJS fork used to prove a native webview sidecar for
the `hawk2ui-editor` example app.

It is not a Hawk2UI framework dependency. Keep this fork scoped to making
`import('@webviewjs/webview')` work for editor dogfooding on the 64-bit desktop
targets we expect to support.

## Current Status

Verified locally:

- Linux x64 GNU native binding builds.
- The root package can import the native binding from `webview.linux-x64-gnu.node`.
- A local tarball can be installed into a clean consumer project and imported as
  `@webviewjs/webview`.
- The native package metadata, root package version, and Rust crate version are
  aligned at `0.1.4`.

Not claimed:

- Published npm availability for `@webviewjs/webview-linux-x64-gnu@0.1.4`.
- Production readiness.
- Android, FreeBSD, 32-bit Windows, 32-bit Linux, or Linux armv7 support.
- Built artifacts for every target in the desktop matrix.

The package name remains `@webviewjs/webview` so the editor can test the same
import shape it would use with an upstream package.

## Target Matrix

| Target | Status | Notes |
| --- | --- | --- |
| `x86_64-pc-windows-msvc` | Planned | 64-bit Windows on Intel/AMD. |
| `aarch64-pc-windows-msvc` | Planned | 64-bit Windows on ARM. |
| `x86_64-apple-darwin` | Planned | 64-bit macOS on Intel. |
| `aarch64-apple-darwin` | Planned | 64-bit macOS on Apple Silicon. |
| `x86_64-unknown-linux-gnu` | Verified locally | 64-bit Linux on Intel/AMD, built and smoke-tested locally. |
| `aarch64-unknown-linux-gnu` | Planned | 64-bit Linux on ARM. |

The `package.json` NAPI targets, CI build matrix, and `npm/` native package dirs
are intentionally limited to this matrix.

## System Dependencies

On Ubuntu/Debian Linux x64:

```bash
bun run setup
```

The setup script installs only the direct build dependencies:

```bash
pkg-config
libwebkit2gtk-4.1-dev
libxdo-dev
```

`libwebkit2gtk-4.1-dev` pulls the GTK, JavaScriptCoreGTK, libsoup, cairo, pango,
atk, and GDK pixbuf development packages needed by the Rust GTK/WebKit crates.

If `cargo check` reports missing `*.pc` files, verify the development metadata:

```bash
pkg-config --modversion webkit2gtk-4.1 javascriptcoregtk-4.1 gtk+-3.0 libsoup-3.0
```

Having WebKit runtime packages installed is not enough; `pkg-config` needs the
`-dev` packages.

## Build

Install dependencies:

```bash
bun install
```

Build the Linux x64 native binding locally:

```bash
bun run build --target x86_64-unknown-linux-gnu
```

This produces:

```text
webview.linux-x64-gnu.node
```

Other targets are expected to be built in CI or on matching host hardware.

For local package layout, copy the built binary into `npm/linux-x64-gnu/`:

```bash
bunx napi artifacts --output-dir . --npm-dir ./npm
```

`bun run artifacts` is the CI publish-style command and expects downloaded
artifacts under `./artifacts`; use the explicit command above for local builds.

## Test

Default tests:

```bash
bun run test
```

Native import smoke test:

```bash
WEBVIEWJS_NATIVE_SMOKE=1 bun run test
```

Other checks:

```bash
bun run check
bun run lint
```

## Local Editor Dependency

Create a local tarball after building:

```bash
bun pm pack --filename /tmp/hawk2ui-webview-linux-x64.tgz
```

Verify from a clean consumer:

```bash
mkdir -p /tmp/hawk2ui-webview-consumer
cd /tmp/hawk2ui-webview-consumer
bun init -y
bun add /tmp/hawk2ui-webview-linux-x64.tgz
bun -e "const webview = require('@webviewjs/webview'); console.log(typeof webview.Webview, typeof webview.getWebviewVersion)"
```

Expected output:

```text
function function
```

The editor side should remain feature-gated while this is a local sidecar test:

```bash
HAWK2UI_EDITOR_WEBVIEW_SIDECAR=1
```

## Runtime Smoke

Minimal local import check from this checkout:

```bash
bun -e "const webview = require('./index.js'); console.log(typeof webview.Webview, webview.getWebviewVersion())"
```

`getWebviewVersion()` returns the installed WebKitGTK runtime version, not the
npm package version.

## Repository Hygiene

- Do not treat this fork as the Hawk2UI framework.
- Keep editor-only integration state out of this repository.
- Do not claim broad platform support unless the target is built, packaged, and
  smoke-tested.
- Keep `package.json` NAPI targets, CI build targets, and `npm/` package dirs in
  sync with the 64-bit desktop matrix.
- Do not publish this fork until every advertised target has a produced artifact
  or the publish flow is scoped to the verified target.

## Upstream

This fork is based on WebviewJS:

```text
https://github.com/webviewjs/webview
```

Use upstream docs for general API exploration, but verify behavior against this
fork before relying on it for the editor sidecar.
