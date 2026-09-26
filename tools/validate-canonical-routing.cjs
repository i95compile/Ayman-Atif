// Local HTTP fixture for this repository's explicit redirects, not a Vercel emulator.
// Production headers must be checked after deployment.
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const root = process.cwd();
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const pages = [], assets = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !['.git', 'node_modules', '.codex', 'tools'].includes(entry.name)) walk(path.join(dir, entry.name));
    else if (entry.isFile()) {
      const relative = path.relative(root, path.join(dir, entry.name)).replace(/\\/g, '/');
      if (entry.name === 'index.html') pages.push('/' + relative);
      else if (relative.startsWith('assets/') || /\.(xml|txt)$/.test(relative) || relative === 'googlebf9a2872f429836d.html') assets.push('/' + relative);
    }
  }
}
walk(root);
assert.equal(config.trailingSlash, true);
assert.equal(config.cleanUrls, undefined);
assert.equal(config.rewrites, undefined);
assert.equal(config.redirects.length, pages.length);
assert.equal(new Set(config.redirects.map(r => r.source)).size, pages.length);
for (const source of pages) {
  const rule = config.redirects.find(r => r.source === source);
  assert.ok(rule, 'Missing redirect: ' + source);
  assert.equal(rule.destination, source.replace(/index\.html$/, ''));
  assert.equal(rule.permanent, true);
  assert.equal(rule.statusCode, undefined);
  assert.ok(!config.redirects.some(r => r.source === rule.destination), 'Redirect loop');
}
// Exact rules run before directory slash normalization. File extensions are excluded.
function redirectFor(url) {
  const rule = config.redirects.find(r => r.source === url.pathname);
  if (rule) return rule.destination + url.search;
  if (url.pathname !== '/' && !url.pathname.endsWith('/') && !path.posix.extname(url.pathname)) return url.pathname + '/' + url.search;
}
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const destination = redirectFor(url);
  if (destination) { response.writeHead(308, { Location: destination }); response.end(); return; }
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  response.writeHead(fs.existsSync(file) && fs.statSync(file).isFile() ? 200 : 404);
  response.end();
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const head = url => fetch(base + url, { method: 'HEAD', redirect: 'manual' });
  let slashless = 0;
  try {
    for (const source of pages) {
      const canonical = source.replace(/index\.html$/, '');
      const direct = await head(canonical);
      assert.equal(direct.status, 200, canonical);
      assert.equal(direct.headers.get('location'), null, canonical);
      for (const query of ['', '?routing-test=1']) {
        const alternate = await head(source + query);
        assert.equal(alternate.status, 308, source);
        assert.equal(alternate.headers.get('location'), canonical + query, source);
        assert.equal((await head(alternate.headers.get('location'))).status, 200, source + ': redirect chain');
      }
      if (canonical !== '/') {
        const result = await head(canonical.slice(0, -1));
        assert.equal(result.status, 308);
        assert.equal(result.headers.get('location'), canonical);
        slashless++;
      }
    }
    for (const asset of assets) {
      const result = await head(asset);
      assert.equal(result.status, 200, asset);
      assert.equal(result.headers.get('location'), null, asset);
    }
    console.log(JSON.stringify({ fixture: 'local HTTP, not deployed Vercel', canonical200: pages.length, index308: pages.length, queryPreserved: pages.length, slashless308: slashless, unchangedAssetsAndSpecialFiles: assets.length, errors: [] }, null, 2));
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
