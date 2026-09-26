// Run from the repository root: node tools/validate-seo.cjs
const fs = require('fs'), path = require('path');
const root = process.cwd(), origin = 'https://ayman-atif.vercel.app';
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const files = [], allHtml = [];
function walk(dir) { for (const e of fs.readdirSync(dir, {withFileTypes:true})) { if (e.isDirectory() && !['.git','node_modules','.codex'].includes(e.name)) walk(path.join(dir,e.name)); else if(e.isFile() && e.name.endsWith('.html')) {allHtml.push(path.join(dir,e.name));if(e.name === 'index.html') files.push(path.join(dir,e.name));} } }
walk(root);
const errors = [], titles = new Map(), descriptions = new Map(), canonical = new Set(), data = new Map();
const assert = (ok, msg) => { if(!ok) errors.push(msg); };
const attr = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m => [m[1], decode(m[2])]));
const internalIndex = (ref, base = origin + '/') => {
  try { const u = new URL(ref, base); return u.origin === origin && /index\.html/i.test(u.href); } catch { return false; }
};
for(const file of allHtml) {
  const name=path.relative(root,file).replace(/\\/g,'/');
  for(const m of fs.readFileSync(file,'utf8').matchAll(/<a\b[^>]*>/gi)) {
    const ref=attr(m[0]).href;
    if(ref) assert(!internalIndex(ref,origin+'/'+name),name+': internal index.html hyperlink '+ref);
  }
}
for (const file of files) data.set(file,fs.readFileSync(file,'utf8'));
for (const [file,html] of data) {
  const name = path.relative(root,file).replace(/\\/g,'/'), url = name === 'index.html' ? '/' : '/' + name.replace(/index\.html$/,'');
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => attr(m[0]));
  const meta = key => metas.filter(m=>m.name === key || m.property === key);
  const title = (html.match(/<title>(.*?)<\/title>/s)||[])[1];
  assert(!!title,name+': missing title');
  if(title) {assert(!titles.has(title),name+': duplicate title'); titles.set(title,name);}
  const description=meta('description');
  assert(description.length===1 && !!description[0].content,name+': missing/duplicate description');
  if(description.length){assert(!descriptions.has(description[0].content),name+': duplicate description');descriptions.set(description[0].content,name);}
  const canon = [...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attr(m[0])).filter(a=>a.rel==='canonical');
  assert(canon.length===1 && canon[0].href===origin+url,name+': invalid canonical');
  if(canon.length)canonical.add(canon[0].href);
  if(canon.length)assert(!internalIndex(canon[0].href),name+': index.html canonical');
  assert(meta('og:url').length===1 && meta('og:url')[0].content===origin+url,name+': og:url does not match canonical');
  assert((html.match(/<h1(?:\s|>)/gi)||[]).length===1,name+': H1 count');
  assert(meta('robots').some(m=>/\bindex\b/.test(m.content) && /\bfollow\b/.test(m.content)),name+': missing robots index/follow');
  assert(!meta('robots').some(m=>/noindex/.test(m.content)),name+': noindex');
  for(const key of ['og:title','og:description','og:url','og:type','og:image','twitter:card','twitter:title','twitter:description','twitter:image']) assert(meta(key).length===1 && !!meta(key)[0].content,name+': missing/duplicate '+key);
  for(const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const json=JSON.parse(m[1]);
      function check(x) {if(typeof x==='string'){assert(!internalIndex(x,origin+url),name+': index.html JSON-LD URL '+x);return;}if(!x || typeof x!=='object')return;if(x['@type']==='Person')assert(x['@id']===origin+'/#ayman-atif',name+': competing/missing Person ID');Object.values(x).forEach(check);}check(json);
    } catch(e){errors.push(name+': invalid JSON-LD '+e.message);}
  }
  for(const m of html.matchAll(/<(?:a|img|script|link)\b[^>]*>/gi)) {
    const a=attr(m[0]); const ref=a.href || a.src;
    if(!ref || /^(mailto:|tel:|data:)/.test(ref))continue;
    const parsed=new URL(ref,origin+url);
    if(parsed.origin!==origin)continue;
    let target=path.join(root,decodeURIComponent(parsed.pathname));
    if(fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      if(/^<a\b/i.test(m[0]))assert(ref.startsWith('/') && !ref.startsWith('//') && parsed.pathname.endsWith('/'),name+': page link must use root-relative canonical directory '+ref);
      target=path.join(target,'index.html');
    }
    assert(fs.existsSync(target),name+': broken local path '+ref);
    if(fs.existsSync(target) && parsed.hash && target.endsWith('.html')) {
      const targetHtml=data.get(target)||fs.readFileSync(target,'utf8');
      const ids=[...targetHtml.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
      assert(ids.includes(decodeURIComponent(parsed.hash.slice(1))),name+': missing fragment '+ref);
    }
  }
  assert(html.includes('aria-label="Primary navigation"'),name+': no primary navigation');
  assert([...html.matchAll(/<a\b[^>]*>/gi)].some(m => {
    const href = attr(m[0]).href;
    if (!href) return false;
    const dest = new URL(href, origin + url);
    return dest.origin === origin && dest.pathname === '/contact/';
  }),name+': Contact unreachable');
  const visible=html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ');
  // A generic university-exam analogy in an existing interview article is not a credential.
  assert(!/\b(education|diploma|degree|graduated|graduation|institution)\b/i.test(visible),name+': education privacy review needed');
}
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const locations=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
for(const url of locations)assert(!internalIndex(url),'Sitemap index.html URL '+url);
assert(files.length===25 && locations.length===25,'Expected all 25 indexable pages and sitemap URLs');
for(const url of canonical)assert(locations.includes(url),'Sitemap missing '+url);
for(const url of locations)assert(canonical.has(url),'Sitemap has noncanonical URL '+url);
assert(new Set(locations).size===locations.length,'Duplicate sitemap entry');
assert(sitemap.includes('<image:loc>'+origin+'/assets/img/ayman-atif-software-engineer.webp</image:loc>'),'Portrait sitemap entry missing');
for(const name of ['index.html','about/index.html'])assert(data.get(path.join(root,name)).includes('alt="Ayman Atif, .NET and Python software engineer"'),'Portrait alt regression '+name);
console.log(JSON.stringify({pages:files.length,sitemapUrls:locations.length,errors},null,2));
process.exitCode=errors.length?1:0;
