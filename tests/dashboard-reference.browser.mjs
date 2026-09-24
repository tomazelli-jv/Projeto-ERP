// Regress?o em navegador isolado via CDP; API simulada, sem credenciais reais.
import fs from 'node:fs';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const targets = [await (await fetch('http://localhost:9230/json/new?about:blank', { method: 'PUT' })).json()];
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let serial = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const click = async (text) => {
  await evaluate(
    `(()=>{const b=[...document.querySelectorAll('button')].find(e=>(e.textContent.trim()===${JSON.stringify(text)}||e.getAttribute('aria-label')===${JSON.stringify(text)}));if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
  );
  await delay(500);
};
const input = async (label, value) => {
  await evaluate(
    `(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)}));const i=document.getElementById(l.htmlFor);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`
  );
};
let checks = 0;
const check = (ok, name) => {
  if (!ok) throw Error(name);
  checks++;
  console.log('PASS ' + name);
};
await send('Page.enable');

// Fixtures restritas à aba CDP: nenhuma resposta simulada é incluída no produto.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: String.raw`
const scenario=new URLSearchParams(location.search).get('case')||'normal';
const token=btoa('{}')+'.'+btoa(JSON.stringify({sub:'business-fixture',empresaId:1,lojaId:1,funcionarioId:1,role:scenario==='denied'?'Vendedor':'Administrador'}))+'.test';
window.calls=[];
window.companies=[{id:1,nome:'Empresa Real Fixture',ativo:true,dataCadastro:'2026-01-01T00:00:00Z'},{id:2,nome:'Outra Empresa',ativo:false,dataCadastro:'2026-01-01T00:00:00Z'}];
window.stores=[{id:1,empresaId:1,nome:'Unidade Centro',razaoSocial:'Comercio Fixture',tipoPessoa:2,documento:'12ABC34501DE35',ativo:true,rua:'Avenida Principal',cidade:'Araguaina',uf:'TO',cep:'77800000',telefone:'63999999999',email:'loja@example.com',dataCadastro:'2026-01-01T00:00:00Z'},{id:2,empresaId:1,nome:'Unidade Norte',tipoPessoa:2,documento:'11222333000181',ativo:false}];
const nativeFetch=fetch;
window.fetch=async(url,options={})=>{
 if(!String(url).startsWith('http://localhost:5054'))return nativeFetch(url,options);
 const path=new URL(url).pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
 calls.push({path,method,body,headers:options.headers});
 const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 if(path==='/api/auth/refresh')return response({accessToken:token,userName:'Teste UI'});
 if(path==='/api/FuncionarioLoja/minhasLojas')return response([{id:1,empresaId:1,nome:'Unidade Centro',ativo:true}]);
 if(path==='/api/Empresa'){
  if(scenario==='loading')await new Promise(r=>setTimeout(r,5000));
  if(scenario==='error')return response({},500);
  if(scenario==='forbidden')return response({},403);
  return response(scenario==='empty-company'?[]:companies);
 }
 if(path.startsWith('/api/Empresa/')){const record=companies.find(x=>String(x.id)===path.split('/').pop());if(method==='PUT')Object.assign(record,body);return response(record);}
 if(path==='/api/Loja'&&method==='GET')return response(scenario==='empty-store'?[]:stores);
 if(path==='/api/Loja'&&method==='POST'){
  if(scenario==='save-error')return response({},422);
  const value={...body,id:3,ativo:true};stores.push(value);return response(value,201);
 }
 if(path.startsWith('/api/Loja/')&&method==='PUT'){const record=stores.find(x=>String(x.id)===path.split('/').pop());Object.assign(record,body);return response(record);}
 throw Error('Endpoint inesperado '+method+' '+path);
};`
});
const go = async (scenario = 'normal') => {
  await send('Page.navigate', { url: 'http://localhost:5173/admin/companies?case=' + scenario });
  await delay(1200);
};
const body = () => evaluate('document.body.innerText');
await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false
});
await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
await delay(1800);
check((await body()).includes('12.ABC.345/01DE-35'), 'dashboard formata documento real do DTO');
check(
  await evaluate('document.querySelectorAll(\'table[aria-label="Lojas no dashboard"] tbody tr\').length===2'),
  'lojas da empresa consultadas'
);
check(!(await body()).includes('125.430'), 'sem faturamento fictício');
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  await send('Page.reload');
  await delay(1400);
  for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await delay(300);
    check(await evaluate('document.documentElement.scrollWidth<=innerWidth'), mode + ' dashboard ' + width);
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await delay(300);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tmp/dashboard-reference-' + mode + '.png', Buffer.from(shot.data, 'base64'));
}
console.log(checks + ' checks dashboard');
ws.close();
