export const desktopEditionMetadata = Object.freeze({
  internet: Object.freeze({
    productName: 'HxHwang Gw Internet',
    debianPackageName: 'hxhwang-gw-internet'
  }),
  intranet: Object.freeze({
    productName: 'HxHwang Gw Intranet',
    debianPackageName: 'hxhwang-gw-intranet'
  })
});

export function metadataForEdition(edition) {
  const metadata = desktopEditionMetadata[edition];
  if (!metadata) throw new Error(`不支持的桌面版本：${edition}`);
  return metadata;
}
