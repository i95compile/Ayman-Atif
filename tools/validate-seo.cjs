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
// Career facts. Freelance work since 2020 overlaps employment, so a year count would double-count or go stale;
// pages say "professionally since 2016" instead, and every stated employment period must match the Experience page.
const roleDates={'Grosomodo':['July 2016 to June 2018','2016–2018'],'Tatbik.ma':['September 2018 to August 2025','2018–2025']};
const text=html=>decode(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
for(const [file,html] of data) {
  const name=path.relative(root,file).replace(/\\/g,'/'), visible=text(html);
  assert(!/\b\d+\+?\s*years?\s+(?:of\s+|in\s+)?(?:professional|experience)/i.test(visible),name+': hard-coded professional experience year count');
  // A sentence ends at a full stop followed by a space, so ".NET" does not end it.
  assert(!/(?:professional|experience)(?:[^.]|\.(?=\S)){0,60}\b2016\s*[–-]\s*2025\b/i.test(visible),name+': professional experience shown as ending in 2025');
  assert(!/professional(?:[^.]|\.(?=\S)){0,40}since 2014/i.test(visible),name+': programming since 2014 presented as professional experience');
  for(const m of visible.matchAll(/(Grosomodo|Tatbik\.ma)\s*\(([^)]*)\)/g))assert(roleDates[m[1]].includes(m[2].trim()),name+': '+m[1]+' period "'+m[2]+'" does not match the Experience page');
  for(const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    (function check(x){if(!x || typeof x!=='object')return;if(x.address)assert(x.address.addressLocality==='Kenitra' && x.address.addressCountry==='MA',name+': JSON-LD address must match the visible Kenitra, Morocco location');Object.values(x).forEach(check);})(JSON.parse(m[1]));
  }
}
for(const page of ['index.html','about/index.html','experience/index.html','contact/index.html','hire-dotnet-developer/index.html'])assert(text(data.get(path.join(root,page))).includes('Kenitra, Morocco'),page+': visible Kenitra, Morocco location missing');
const experience=data.get(path.join(root,'experience/index.html'));
for(const date of ['2016-07','2018-06','2018-09','2025-08','2020'])assert(experience.includes('<time datetime="'+date+'">'),'experience/index.html: missing period date '+date);
assert(/Odoo backend development, 2024/.test(experience) && /not an additional full-time role/.test(experience),'experience/index.html: Odoo engagement must be described as 2024 freelance work, not a full-time role');
// Both confidential case studies were freelance work done outside employment, never for Tatbik.ma.
for(const page of ['work/business-software-platform/index.html','work/crm-data-migration/index.html']) {
  const html=data.get(path.join(root,page));
  assert(html.includes('CONFIDENTIAL FREELANCE WORK'),page+': missing freelance label');
  assert(!/Tatbik|Grosomodo/.test(html),page+': case study must not be attributed to an employer');
  assert(html.includes('href="/experience/#freelance"'),page+': missing link to the freelance experience section');
}
// FAQPage markup must repeat the visible questions and answers exactly: each question is an <h3> followed by its answer <p>.
for(const [file,html] of data) {
  const name=path.relative(root,file).replace(/\\/g,'/');
  // Inline tags (links, code) are removed without adding spaces, so "work</a>, including" stays "work, including".
  const inline=s=>decode(s.replace(/<[^>]+>/g,'')).replace(/\s+/g,' ').trim();
  const visibleFaq=new Map([...html.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map(m=>[inline(m[1]),inline(m[2])]));
  for(const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    const json=JSON.parse(m[1]);
    for(const node of [json,...(json['@graph']||[])].filter(n=>n['@type']==='FAQPage')) {
      const questions=node.mainEntity||[];
      if(html.includes('class="faq-item"'))assert(questions.length===(html.match(/class="faq-item"/g)||[]).length,name+': FAQPage question count differs from the visible FAQ');
      for(const q of questions) {
        assert(visibleFaq.has(q.name),name+': FAQPage question not visible: '+q.name);
        if(visibleFaq.has(q.name))assert(visibleFaq.get(q.name)===q.acceptedAnswer.text,name+': FAQPage answer differs from visible text: '+q.name);
      }
    }
  }
}
// Homepage links to the main service pages, so each is one click from the most-linked page.
const homeLinks=[...data.get(path.join(root,'index.html')).matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
for(const service of ['dotnet-development','python-development','legacy-software-modernization','business-software-development','workflow-automation'])assert(homeLinks.includes('/services/'+service+'/'),'index.html: no link to /services/'+service+'/');
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const locations=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
for(const url of locations)assert(!internalIndex(url),'Sitemap index.html URL '+url);
assert(files.length===30 && locations.length===30,'Expected all 30 indexable pages and sitemap URLs');
for(const url of canonical)assert(locations.includes(url),'Sitemap missing '+url);
for(const url of locations)assert(canonical.has(url),'Sitemap has noncanonical URL '+url);
assert(new Set(locations).size===locations.length,'Duplicate sitemap entry');
assert(sitemap.includes('<image:loc>'+origin+'/assets/img/ayman-atif-software-engineer.webp</image:loc>'),'Portrait sitemap entry missing');
for(const name of ['index.html','about/index.html'])assert(data.get(path.join(root,name)).includes('alt="Ayman Atif, .NET and Python software engineer"'),'Portrait alt regression '+name);
console.log(JSON.stringify({pages:files.length,sitemapUrls:locations.length,errors},null,2));
process.exitCode=errors.length?1:0;
