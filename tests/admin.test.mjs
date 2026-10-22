import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { Pool } from 'pg';
try { process.loadEnvFile('.env.local'); } catch { /* CI passes env directly. */ }
const schema = `guba_test_${Date.now()}`;
const password = randomBytes(20).toString('hex');
const email = 'admin@guba.test';
const port = 32000 + Math.floor(Math.random() * 10000);
const origin = `http://127.0.0.1:${port}`;
let pool, adminPool, child, cookie, snapshot;
let serverLogs = '';
async function request(path, { method = 'GET', body, authenticated = true, headers = {} } = {}) {
  return fetch(origin + path, { method, redirect: 'manual', headers: { Origin: origin, ...(authenticated && cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
async function save(data, revision, action = 'Integration test change') { return request('/api/admin/workspace', { method: 'PUT', body: { data, revision, action } }); }
before(async () => {
  assert.ok(process.env.DATABASE_URL, 'Configure DATABASE_URL to run integration tests. Tests use a temporary isolated schema.');
  adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(process.env.DATABASE_URL); url.searchParams.set('options', `-c search_path=${schema}`);
  pool = new Pool({ connectionString: url.toString() });
  await pool.query(await readFile(new URL('../db/postgres-schema.sql', import.meta.url), 'utf8'));
  const salt = randomBytes(16).toString('hex');
  await pool.query('INSERT INTO guba_admin_users(email, name, password_hash) VALUES ($1, $2, $3)', [email, 'Test Admin', `${salt}:${scryptSync(password, salt, 64).toString('hex')}`]);
  child = spawn(process.execPath, ['scripts/start.mjs', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url.toString(), TRUST_CHATGPT_AUTH_HEADERS: 'false', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => { serverLogs += chunk; }); child.stderr.on('data', chunk => { serverLogs += chunk; });
  for (let i = 0; i < 100; i++) { try { const response = await request('/admin/login', { authenticated: false }); if (response.status === 200) return; } catch { /* Starting. */ } await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error('Server did not start: ' + serverLogs);
}, { timeout: 20000 });
after(async () => {
  child?.kill();
  if (pool) await pool.end();
  if (adminPool) { assert.match(schema, /^guba_test_\d+$/); await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await adminPool.end(); }
});
test('anonymous users cannot open the admin or its APIs', async () => {
  assert.equal((await request('/admin', { authenticated: false })).status, 307);
  assert.equal((await request('/api/admin/workspace', { authenticated: false })).status, 401);
  assert.equal((await request('/api/admin/users', { authenticated: false })).status, 401);
  assert.equal((await request('/api/admin/workspace', { authenticated: false, headers: { 'oai-authenticated-user-email': 'mihretlemabelete@gmail.com' } })).status, 401);
  assert.equal((await request('/api/admin/workspace', { authenticated: false, method: 'PUT', body: {} })).status, 401);
});
test('production client scripts and CSS load on Windows', async () => {
  const html = await (await request('/admin/login')).text();
  assert.match(html, /method="post"/);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/g)].map(match => match[1]);
  assert.ok(assets.length > 0);
  for (const asset of assets) assert.equal((await request(asset)).status, 200, asset);
  assert.equal((await request('/.vite/manifest.json')).status, 404);
});
test('password login creates an HttpOnly session and authenticates the dashboard', async () => {
  const bad = await request('/api/admin/login', { method: 'POST', body: { email, password: 'incorrect' } }); assert.equal(bad.status, 401);
  const good = await request('/api/admin/login', { method: 'POST', body: { email, password } }); assert.equal(good.status, 200);
  const header = good.headers.get('set-cookie'); assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Lax/); cookie = header.split(';')[0];
  assert.equal((await request('/admin')).status, 200);
  snapshot = await (await request('/api/admin/workspace')).json(); assert.equal(snapshot.revision, 0);
});
test('creates records durably, updates records, and rejects stale edits', async () => {
  const item = { id: 'test-project', title: 'Integration project', detail: 'Private draft', status: 'Draft', updated: new Date().toISOString(), fields: { sector: 'Testing' } };
  snapshot.data.items.Projects.push(item);
  let result = await save(snapshot.data, snapshot.revision); assert.equal(result.status, 200);
  const stale = await save(snapshot.data, snapshot.revision); assert.equal(stale.status, 409);
  snapshot = await (await request('/api/admin/workspace')).json(); assert.equal(snapshot.data.items.Projects[0].title, item.title);
  snapshot.data.items.Projects[0].title = 'Updated project'; result = await save(snapshot.data, snapshot.revision); assert.equal(result.status, 200);
  snapshot = await (await request('/api/admin/workspace')).json(); assert.equal(snapshot.data.items.Projects[0].title, 'Updated project'); assert.equal(snapshot.data.logs.length, 2);
  assert.equal((await pool.query('SELECT count(*) FROM guba_records')).rows[0].count, '1');
});
test('rejects malformed records, malformed JSON, oversized writes and cross-origin writes', async () => {
  const invalid = structuredClone(snapshot.data); invalid.items.Projects[0].title = { unsafe: true }; assert.equal((await save(invalid, snapshot.revision)).status, 400);
  const duplicates = structuredClone(snapshot.data); duplicates.items.Projects.push(duplicates.items.Projects[0]); assert.equal((await save(duplicates, snapshot.revision)).status, 400);
  assert.equal((await fetch(origin+'/api/admin/workspace',{method:'PUT',headers:{Cookie:cookie,Origin:origin},body:'{bad'})).status,400);
  assert.equal((await request('/api/admin/workspace', { method: 'PUT', body: { data: 'x'.repeat(1000001) } })).status, 413);
  assert.equal((await request('/api/admin/workspace', { method: 'PUT', body: snapshot, headers: { Origin: 'https://untrusted.test' } })).status, 403);
});
test('public pages hide drafts and expose published projects', async () => {
  const draft = await (await request('/')).text(); assert.doesNotMatch(draft, /Updated project/);
  snapshot.data.items.Projects[0].status = 'Published'; assert.equal((await save(snapshot.data, snapshot.revision)).status, 200);
  snapshot = await (await request('/api/admin/workspace')).json();
  const html = await (await request('/')).text(); assert.match(html, /Updated project/);
});
test('account management hashes passwords, forbids self-disable and revokes disabled sessions', async () => {
  const body = { email: 'staff@guba.test', name: 'Staff', password: 'a-secure-staff-password' };
  assert.equal((await request('/api/admin/users', { method:'POST', body })).status,201);
  const users = await (await request('/api/admin/users')).json(); assert.equal(users.users.length,2); assert.ok(!JSON.stringify(users).includes('password'));
  const hashed = await pool.query('SELECT password_hash FROM guba_admin_users WHERE email=$1',[body.email]); assert.notEqual(hashed.rows[0].password_hash,body.password);
  assert.equal((await request('/api/admin/users',{method:'PATCH',body:{email,active:false}})).status,400);
  assert.equal((await request('/api/admin/users',{method:'PATCH',body:{email:body.email,active:false}})).status,200);
  assert.equal((await request('/api/admin/login',{method:'POST',body:{email:body.email,password:body.password}})).status,401);
});
test('deleting records persists and restoring a backup preserves server audit history', async () => {
  const backup = structuredClone(snapshot.data);
  snapshot.data.items.Projects = []; assert.equal((await save(snapshot.data,snapshot.revision,'Deleted project')).status,200);
  snapshot = await (await request('/api/admin/workspace')).json(); assert.equal(snapshot.data.items.Projects.length,0);
  const logs = snapshot.data.logs.length; backup.logs=[];
  assert.equal((await save(backup,snapshot.revision,'Restored backup')).status,200);
  snapshot = await (await request('/api/admin/workspace')).json(); assert.equal(snapshot.data.items.Projects.length,1); assert.equal(snapshot.data.logs.length,logs+1);
});

async function fresh() { snapshot = await (await request('/api/admin/workspace')).json(); return snapshot; }
function makeItem(id,title,fields={}) { return {id,title,detail:'Public description '+id,status:'Published',updated:new Date().toISOString(),fields}; }
test('every public collection publishes, edits, archives and deletes without restoring sample content', async () => {
  const paths = {Homepage:'announcements',Services:'services',Projects:'projects',Insights:'insights',Training:'training',Events:'events',Jobs:'jobs',Products:'products','Partners & clients':'partners',Clients:'clients',Testimonials:'testimonials','Media library':'media',Newsletter:'newsletter'};
  for(const [section,path] of Object.entries(paths)) {
    await fresh();
    const item=makeItem('publish-'+path,'Visible '+section,{placement:'section',image:'/og.png'});
    snapshot.data.items[section]=[item];
    assert.equal((await save(snapshot.data,snapshot.revision)).status,200,section);
    let html=(await(await request('/')).text()).replaceAll('&amp;','&'); assert.ok(html.includes('Visible '+section),section+' missing on homepage');
    const detail=await request('/content/'+path+'/'+item.id); assert.equal(detail.status,200,section+' detail'); const detailHtml=await detail.text();assert.ok(detailHtml.includes(item.detail));assert.doesNotMatch(detailHtml,/href="javascript:/);
    await fresh(); snapshot.data.items[section][0].title='Edited '+section;
    assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
    html=(await(await request('/')).text()).replaceAll('&amp;','&');assert.ok(html.includes('Edited '+section));assert.ok(!html.includes('Visible '+section));
    await fresh(); snapshot.data.items[section][0].status='Archived'; assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
    html=(await(await request('/')).text()).replaceAll('&amp;','&');assert.ok(!html.includes('Edited '+section),section+' archived record visible');
    assert.equal((await request('/content/'+path+'/'+item.id)).status,404);
    await fresh(); snapshot.data.items[section]=[]; assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
    const dto=await(await request('/api/public/site')).json();assert.equal(dto.content[section].length,0);
  }
  const html=(await(await request('/')).text()).replaceAll('&amp;','&');assert.doesNotMatch(html,/National resilient network modernization|Digital Infrastructure|Building resilient digital infrastructure for Africa/);
});
test('homepage hero, site settings, SEO and maintenance affect the public site',async()=>{
  await fresh();
  snapshot.data.items.Homepage=[makeItem('hero','Custom homepage headline',{placement:'hero',subtitle:'Custom subtitle'})];
  snapshot.data.items['SEO manager']=[{...makeItem('seo','Custom SEO title',{path:'/',keywords:'custom,engineering'}),detail:'Custom search description'}];
  snapshot.data.settings.siteName='GUBA Custom Brand';snapshot.data.settings.contactEmail='team@guba.test';
  assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
  let html=(await(await request('/')).text()).replaceAll('&amp;','&');assert.match(html,/Custom homepage headline/);assert.match(html,/Custom subtitle/);assert.match(html,/Custom SEO title/);assert.match(html,/Custom search description/);assert.match(html,/team@guba.test/);assert.match(html,/GUBA Custom Brand/);
  await fresh(); snapshot.data.settings.maintenance=true;assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
  html=(await(await request('/')).text()).replaceAll('&amp;','&');assert.match(html,/We’ll be back soon/);assert.doesNotMatch(html,/Custom homepage headline/);
  assert.equal((await request('/admin')).status,200);
  await fresh();snapshot.data.settings.maintenance=false;assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
});
test('all visitor forms reach private admin inboxes without leaking into public data',async()=>{
  await fresh();snapshot.data.items.Jobs=[makeItem('job-form','Open engineer role',{deadline:'2099-01-01'})];snapshot.data.items.Training=[makeItem('training-form','Network course')];snapshot.data.items.Events=[makeItem('event-form','Engineering event',{capacity:'1'})];snapshot.data.items['AI knowledge']=[{...makeItem('answer','procurement'),detail:'Procurement answer from admin'}];assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
  const cases=[['contact','Contact messages'],['rfq','RFQ requests'],['application','Job applications','job-form'],['registration','Registrations','training-form'],['registration','Registrations','event-form'],['newsletter','Newsletter']];
  for(const [kind,section,targetId] of cases){const result=await request('/api/public/submissions',{authenticated:false,method:'POST',body:{kind,name:'Private visitor '+kind,email:kind+'@visitor.test',message:'Private message for '+kind,consent:'yes',...(targetId?{targetId}:{}),...(kind==='application'?{document:'https://example.com/cv.pdf'}:{})}});assert.equal(result.status,201,await result.text());await fresh();assert.ok(snapshot.data.items[section].some(item=>item.fields?.email===kind+'@visitor.test'),section);}
  let publicJson=await(await request('/api/public/site')).text();assert.doesNotMatch(publicJson,/@visitor.test|Private visitor|Private message/);assert.ok(publicJson.includes('Procurement answer from admin'));
  const html=(await(await request('/')).text()).replaceAll('&amp;','&');assert.doesNotMatch(html,/@visitor.test|Private visitor|Private message/);
  assert.equal((await request('/content/jobs/job-form')).status,200);assert.match(await(await request('/content/jobs/job-form')).text(),/Apply for this role/);
  assert.match(await(await request('/content/training/training-form')).text(),/Register your interest/);
  const capacity=await request('/api/public/submissions',{authenticated:false,method:'POST',body:{kind:'registration',name:'Another visitor',email:'second@visitor.test',message:'Please register me',consent:'yes',targetId:'event-form'}});assert.equal(capacity.status,409);
  const invalid=await request('/api/public/submissions',{authenticated:false,method:'POST',body:{kind:'contact',name:'No consent',email:'test@visitor.test',message:'test'}});assert.equal(invalid.status,400);
  const privateTarget=await request('/api/public/submissions',{authenticated:false,method:'POST',body:{kind:'application',name:'Visitor',email:'visitor@example.com',message:'test',consent:'yes',targetId:'missing-job',document:'https://example.com/cv.pdf'}});assert.equal(privateTarget.status,400);
  await fresh();const subscriber=snapshot.data.items.Newsletter.find(item=>item.fields?.email==='newsletter@visitor.test');subscriber.status='Published';assert.equal((await save(snapshot.data,snapshot.revision)).status,200);publicJson=await(await request('/api/public/site')).text();assert.doesNotMatch(publicJson,/Private visitor newsletter|newsletter@visitor.test/);
});

test('contact page is editable from the admin with safe maps, SEO and private enquiry details',async()=>{
  await fresh();
  snapshot.data.items['Contact information']=[{...makeItem('head-office','Let’s talk about your project',{officeName:'GUBA Main Office',publicEmail:'office@guba.test',phone:'+251 11 123 4567',address:'Test Building, Floor 4',city:'Test City',country:'Test Country',hours:'Monday–Friday 09:00–17:00',latitude:'9.03',longitude:'38.74',linkedin:'https://www.linkedin.com/company/example'}),detail:'Discuss engineering, technology and training with our team.'},{...makeItem('private-office','Private office',{address:'Private address'}),status:'Draft'}];
  snapshot.data.items['SEO manager'].push({...makeItem('contact-seo','Contact page search title',{path:'/contact'}),detail:'Contact page search description'});
  assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
  let html=await(await request('/contact')).text();
  for(const value of ['GUBA Main Office','office@guba.test','Test Building, Floor 4','Monday–Friday','Contact page search title','Contact page search description','Send us a message','Company (optional)','Enquiry topic']) assert.ok(html.includes(value),value);
  assert.ok(html.includes('href="tel:+251111234567"'));assert.match(html,/maps.google.com/);assert.match(html,/9.03%2C38.74/);assert.doesNotMatch(html,/Private address|Private office/);
  const sitemap=await(await request('/sitemap.xml')).text();assert.ok(sitemap.includes('/contact'));
  await fresh();snapshot.data.items['Contact information'][0].fields.mapEmbedUrl='https://untrusted.example/embed';assert.equal((await save(snapshot.data,snapshot.revision)).status,400);
  snapshot.data.items['Contact information'][0].fields.mapEmbedUrl='https://www.google.com/maps/embed?pb=example';snapshot.data.items['Contact information'][0].fields.latitude='95';assert.equal((await save(snapshot.data,snapshot.revision)).status,400);
  snapshot.data.items['Contact information'][0].fields.latitude='9.03';snapshot.data.items['Contact information'][0].fields.address='Updated office address';assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
  html=await(await request('/contact')).text();assert.ok(html.includes('Updated office address'));assert.ok(!html.includes('Test Building, Floor 4'));
  const response=await request('/api/public/submissions',{method:'POST',authenticated:false,body:{kind:'contact',name:'Business visitor',email:'contactform@visitor.test',message:'Please discuss a project',phone:'+251911234567',company:'Example Company',subject:'Engineering services',consent:'yes'}});assert.equal(response.status,201);
  await fresh();const message=snapshot.data.items['Contact messages'].find(item=>item.fields.email==='contactform@visitor.test');assert.equal(message.fields.company,'Example Company');assert.equal(message.fields.phone,'+251911234567');assert.equal(message.fields.subject,'Engineering services');
  const publicJson=await(await request('/api/public/site')).text();assert.ok(!publicJson.includes('contactform@visitor.test'));
  snapshot.data.items['Contact information'][0].status='Archived';assert.equal((await save(snapshot.data,snapshot.revision)).status,200);
  html=await(await request('/contact')).text();assert.ok(!html.includes('Updated office address'));assert.ok(html.includes('Send us a message'));
});
test('service and project images upload securely and render on published content', async () => {
  const sharp = (await import('sharp')).default;
  const png = await sharp({create:{width:24,height:24,channels:3,background:'#146c94'}}).png().toBuffer();
  async function upload(bytes, type='image/png', extra={}) {
    const form=new FormData(); form.set('image',new Blob([bytes],{type}),'service.png');
    const response = await fetch(origin+'/api/admin/images',{method:'POST',headers:{Origin:origin,Cookie:cookie,Connection:'close',...extra},body:form});
    return new Response(await response.arrayBuffer(),{status:response.status,headers:response.headers});
  }
  assert.equal((await fetch(origin+'/api/admin/images',{method:'POST'})).status,401);
  assert.equal((await upload(png,'image/png',{Origin:'https://untrusted.test'})).status,403);
  assert.equal((await upload(Buffer.from('<svg onload="alert(1)"/>'),'image/svg+xml')).status,400);
  assert.equal((await upload(Buffer.from('not an image'))).status,400);

  assert.equal((await upload(Buffer.alloc(6*1024*1024))).status,413);
  const largePng=await sharp(randomBytes(1100*1100*3),{raw:{width:1100,height:1100,channels:3}}).png().toBuffer();
  assert.ok(largePng.length>3*1024*1024);
  assert.equal((await upload(largePng)).status,201);
  const response=await upload(png); assert.equal(response.status,201);
  const {url}=await response.json();
  const image=await request(url,{authenticated:false}); assert.equal(image.status,200); assert.equal(image.headers.get('content-type'),'image/webp');
  assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format,'webp');
  const current=await (await request('/api/admin/workspace')).json();
  current.data.settings.maintenance=false;
  current.data.items.Services=[{id:'upload-test-service',title:'Uploaded service image',detail:'Service description',status:'Published',updated:new Date().toISOString(),fields:{image:url},extra:''}];
  current.data.items.Projects=[{id:'upload-test-project',title:'Uploaded project image',detail:'Project description',status:'Published',updated:new Date().toISOString(),fields:{image:url},extra:''}];
  assert.equal((await save(current.data,current.revision)).status,200);
  const html=await (await request('/')).text(); assert.ok(html.includes(url)); assert.match(html,/cms-service-image/);
  const details=await (await request('/content/services/upload-test-service')).text(); assert.ok(details.includes(url));
  assert.ok(html.includes('Uploaded project image'));
  const projectDetails=await (await request('/content/projects/upload-test-project')).text(); assert.ok(projectDetails.includes(url));
  assert.equal((await request('/api/images/not-an-id')).status,404);
});

test('sign out revokes the session', async () => {
  assert.equal((await request('/api/admin/logout',{method:'POST'})).status,303);
  assert.equal((await request('/api/admin/workspace')).status,401);
});
