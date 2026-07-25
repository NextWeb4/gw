import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arch, Platform, build } from 'electron-builder';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [editionArg, platformArg, archArg] = process.argv.slice(2);
const edition = editionArg === 'intranet' ? 'intranet' : editionArg === 'internet' ? 'internet' : undefined;
const arch = archArg === 'arm64' ? Arch.arm64 : archArg === 'x64' ? Arch.x64 : undefined;
if (!edition || !arch || !['win', 'linux'].includes(platformArg)) throw new Error('用法：package-edition.mjs <internet|intranet> <win|linux> <x64|arm64>');

const unpackedDirectory = `${platformArg === 'win' ? 'win' : 'linux'}${archArg === 'arm64' ? '-arm64' : ''}-unpacked`;
await rm(path.join(projectDir, 'release', unpackedDirectory), { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });

const packageJson = JSON.parse(await readFile(path.join(projectDir, 'package.json'), 'utf8'));
const baseConfig = packageJson.build;
const editionLabel = edition === 'internet' ? '互联网版' : '内网版';
const config = {
  ...baseConfig,
  productName: `HxHwang Gw ${editionLabel}`,
  extraMetadata: { hxhwangEdition: edition },
  nsis: { ...baseConfig.nsis, artifactName: `HxHwang-Gw-\${version}-${edition}-\${arch}-setup.\${ext}` },
  linux: { ...baseConfig.linux, artifactName: `HxHwang-Gw-\${version}-${edition}-\${arch}.\${ext}` }
};
const targets = platformArg === 'win'
  ? Platform.WINDOWS.createTarget(['nsis'], arch)
  : Platform.LINUX.createTarget(['AppImage', 'deb'], arch);

await build({ projectDir, targets, config });
