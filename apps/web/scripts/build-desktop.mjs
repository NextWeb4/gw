const { build } = await import('vite');
const edition = process.argv[2] === 'internet' ? 'internet' : 'intranet';
await build({ base: './', mode: `desktop-${edition}` });
