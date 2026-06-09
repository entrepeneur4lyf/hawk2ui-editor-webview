import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const supportedTargets = [
  'x86_64-pc-windows-msvc',
  'aarch64-pc-windows-msvc',
  'x86_64-apple-darwin',
  'aarch64-apple-darwin',
  'x86_64-unknown-linux-gnu',
  'aarch64-unknown-linux-gnu',
];
const supportedNativePackageDirs = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64-gnu',
  'linux-x64-gnu',
  'win32-arm64-msvc',
  'win32-x64-msvc',
];
const rootPackageName = '@hawk2ui/editor-webview';

test('Rust crate version matches the root package version', () => {
  const cargoToml = readFileSync(join(rootDir, 'Cargo.toml'), 'utf8');
  const cargoVersion = cargoToml.match(/^version\s*=\s*"(?<version>[^"]+)"/m)?.groups.version;

  assert.equal(cargoVersion, packageJson.version);
});

test('local native package versions match the root package version', () => {
  const npmDir = join(rootDir, 'npm');
  const nativePackages = readdirSync(npmDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifestPath = join(npmDir, entry.name, 'package.json');
      return {
        directory: entry.name,
        manifest: JSON.parse(readFileSync(manifestPath, 'utf8')),
      };
    });

  assert.notEqual(nativePackages.length, 0);

  for (const nativePackage of nativePackages) {
    assert.equal(
      nativePackage.manifest.version,
      packageJson.version,
      `${nativePackage.directory} should use version ${packageJson.version}`,
    );
  }
});

test('package metadata uses the Hawk2UI editor webview package family', () => {
  assert.equal(packageJson.name, rootPackageName);
  assert.equal(packageJson.repository, 'https://github.com/entrepeneur4lyf/hawk2ui-editor-webview');

  const npmDir = join(rootDir, 'npm');
  for (const directory of supportedNativePackageDirs) {
    const manifest = JSON.parse(readFileSync(join(npmDir, directory, 'package.json'), 'utf8'));

    assert.equal(manifest.name, `${rootPackageName}-${directory}`);
    assert.equal(manifest.repository, packageJson.repository);
  }
});

test('package metadata does not use the upstream WebviewJS npm scope', () => {
  for (const relativePath of [
    'package.json',
    'index.js',
    'README.md',
    ...supportedNativePackageDirs.flatMap((directory) => [
      join('npm', directory, 'README.md'),
      join('npm', directory, 'package.json'),
    ]),
  ]) {
    const contents = readFileSync(join(rootDir, relativePath), 'utf8');

    assert.equal(contents.includes('@webviewjs'), false, `${relativePath} should not reference @webviewjs`);
  }
});

test('NAPI targets are limited to the 64-bit desktop sidecar matrix', () => {
  assert.deepEqual(packageJson.napi.targets, supportedTargets);
});

test('native package dirs match the 64-bit desktop sidecar matrix', () => {
  const npmDir = join(rootDir, 'npm');
  const nativePackageDirs = readdirSync(npmDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(nativePackageDirs, supportedNativePackageDirs);
});

test('root package can include locally built native addons in pack output', () => {
  assert.equal(packageJson.files.includes('webview.*.node'), true);
});

test('Linux setup script installs the x64 WebKitGTK dependency set', () => {
  const setupScript = join(rootDir, 'scripts', 'install-linux-deps.sh');

  assert.equal(existsSync(setupScript), true);

  const script = readFileSync(setupScript, 'utf8');
  const depsBlock = script.match(/deps=\(\n(?<deps>[\s\S]*?)\n\)/);
  assert.notEqual(depsBlock, null);

  const dependencies = depsBlock.groups.deps
    .split('\n')
    .map((dependency) => dependency.trim())
    .filter(Boolean);

  assert.deepEqual(dependencies, [
    'pkg-config',
    'libwebkit2gtk-4.1-dev',
    'libxdo-dev',
  ]);
});

test('CI Linux dependency lists do not use legacy GDK pixbuf package names', () => {
  const ciWorkflow = readFileSync(join(rootDir, '.github', 'workflows', 'CI.yml'), 'utf8');

  assert.equal(ciWorkflow.includes('libgdk-pixbuf2.0-dev'), false);
  assert.match(ciWorkflow, /\blibwebkit2gtk-4\.1-dev\b/);
  assert.match(ciWorkflow, /\blibxdo-dev\b/);
});

test('CI workflow supports manual dispatch without a separate lint workflow', () => {
  const workflowDir = join(rootDir, '.github', 'workflows');
  const ciWorkflow = readFileSync(join(workflowDir, 'CI.yml'), 'utf8');

  assert.match(ciWorkflow, /^  workflow_dispatch:\s*$/m);
  assert.equal(existsSync(join(workflowDir, 'lint.yml')), false);
});

test('CI uses Node 24-compatible official GitHub actions', () => {
  const ciWorkflow = readFileSync(join(rootDir, '.github', 'workflows', 'CI.yml'), 'utf8');

  for (const action of [
    'actions/checkout@v6.0.3',
    'actions/setup-node@v6.4.0',
    'actions/cache@v5.0.5',
    'actions/upload-artifact@v7.0.1',
  ]) {
    assert.equal(ciWorkflow.includes(`uses: ${action}`), true, `${action} should be pinned in CI`);
  }

  for (const action of [
    'actions/checkout@v4',
    'actions/setup-node@v4',
    'actions/cache@v4',
    'actions/upload-artifact@v4',
    'actions/download-artifact@v4',
  ]) {
    assert.equal(ciWorkflow.includes(`uses: ${action}`), false, `${action} should not be used in CI`);
  }
});

test('CI does not publish npm packages', () => {
  const ciWorkflow = readFileSync(join(rootDir, '.github', 'workflows', 'CI.yml'), 'utf8');

  for (const publishMarker of [
    'publish:',
    'Publish to npm',
    'npm publish',
    'NODE_AUTH_TOKEN',
    'NPM_TOKEN',
    'registry-url:',
    'npm config set provenance',
    'id-token: write',
    'actions/download-artifact',
  ]) {
    assert.equal(ciWorkflow.includes(publishMarker), false, `${publishMarker} should not be in CI`);
  }
});

test('CI build matrix is limited to the 64-bit desktop sidecar targets', () => {
  const ciWorkflow = readFileSync(join(rootDir, '.github', 'workflows', 'CI.yml'), 'utf8');

  for (const target of supportedTargets) {
    assert.match(ciWorkflow, new RegExp(`target: ${target}\\b`));
  }

  for (const target of [
    'i686-pc-windows-msvc',
    'i686-unknown-linux-gnu',
    'armv7-unknown-linux-gnueabihf',
    'aarch64-linux-android',
    'armv7-linux-androideabi',
    'x86_64-unknown-freebsd',
  ]) {
    assert.doesNotMatch(ciWorkflow, new RegExp(`target: ${target}\\b`));
  }
});

test(
  'Linux x64 native binding loads when native smoke testing is enabled',
  {
    skip:
      process.env.HAWK2UI_EDITOR_WEBVIEW_NATIVE_SMOKE === '1' &&
      process.platform === 'linux' &&
      process.arch === 'x64'
        ? false
        : 'Set HAWK2UI_EDITOR_WEBVIEW_NATIVE_SMOKE=1 on Linux x64 after building the native binding.',
  },
  async () => {
    const webview = await import('../index.js');

    assert.equal(typeof webview.Webview, 'function');
    assert.equal(typeof webview.getWebviewVersion, 'function');
  },
);
