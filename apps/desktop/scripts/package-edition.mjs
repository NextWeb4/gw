import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arch, Platform, build } from 'electron-builder';
import { metadataForEdition } from './edition-config.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [editionArg, platformArg, archArg] = process.argv.slice(2);
const edition = editionArg === 'intranet' ? 'intranet' : editionArg === 'internet' ? 'internet' : undefined;
const arch = archArg === 'arm64' ? Arch.arm64 : archArg === 'x64' ? Arch.x64 : undefined;
if (!edition || !arch || !['win', 'linux'].includes(platformArg)) throw new Error('用法：package-edition.mjs <internet|intranet> <win|linux> <x64|arm64>');

const unpackedDirectory = `${platformArg === 'win' ? 'win' : 'linux'}${archArg === 'arm64' ? '-arm64' : ''}-unpacked`;
const unpackedPath = path.join(projectDir, 'release', unpackedDirectory);

const packageJson = JSON.parse(await readFile(path.join(projectDir, 'package.json'), 'utf8'));
const baseConfig = packageJson.build;
const editionMetadata = metadataForEdition(edition);
const config = {
  ...baseConfig,
  productName: editionMetadata.productName,
  extraMetadata: { hxhwangEdition: edition },
  nsis: { ...baseConfig.nsis, artifactName: `HxHwang-Gw-\${version}-${edition}-\${arch}-setup.\${ext}` },
  linux: { ...baseConfig.linux, artifactName: `HxHwang-Gw-\${version}-${edition}-\${arch}.\${ext}` },
  deb: { ...baseConfig.deb, packageName: editionMetadata.debianPackageName }
};
const targets = platformArg === 'win'
  ? Platform.WINDOWS.createTarget(['nsis'], arch)
  : Platform.LINUX.createTarget(['AppImage', 'deb'], arch);

const maxBuildAttempts = process.platform === 'win32' ? 3 : 1;
for (let attempt = 1; attempt <= maxBuildAttempts; attempt += 1) {
  await rm(unpackedPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  try {
    await build({ projectDir, targets, config });
    break;
  } catch (error) {
    const transientWindowsLock = process.platform === 'win32'
      && (error?.code === 'EBUSY' || String(error?.message || error).includes('EBUSY'));
    if (!transientWindowsLock || attempt === maxBuildAttempts) throw error;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
  }
}
