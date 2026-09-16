// Isolated browser tests; mocked API remains outside product code.
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
    `(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
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
await send('Emulation.setDeviceMetricsOverride', {
  width: 1366,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false
});
// Somente esta aba usa fixtures; não revoga sessões nem envia credenciais ao servidor real.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
const scenario=new URLSearchParams(location.search).get('case')||'normal';
window.accountTest={calls:[],revoked:false};
const native=fetch;
const id='11111111-1111-1111-1111-111111111111', remote='22222222-2222-2222-2222-222222222222';
const token=btoa('{}')+'.'+btoa(JSON.stringify({sub:'fixture',sid:id,email:'fixture@example.invalid'}))+'.fixture';
window.fetch=async(url,options={})=>{
 if(!String(url).startsWith('http://localhost:5054/api'))return native(url,options);
 const path=new URL(url).pathname;accountTest.calls.push({path,method:options.method||'GET'});
 const respond=(body,status=200)=>new Response(JSON.stringify(body),{status});
 if(path==='/api/auth/refresh')return respond({accessToken:token,userName:'Conta de teste'});
 if(path==='/api/auth/logout'||path==='/api/auth/logout-todas') {
  if(scenario==='global-error')return respond({},500);
  return new Response(null,{status:204});
 }
 if(options.method==='DELETE') {
  if(path!=='/api/auth/sessoes/'+remote)throw Error('DELETE current or unknown');
  if(scenario==='revoke-error')return respond({},500);
  accountTest.revoked=true;return new Response(null,{status:204});
 }
 if(path==='/api/auth/sessoes') {
  if(scenario==='error')return respond({},500);
  if(scenario==='loading')await new Promise(r=>setTimeout(r,5000));
  if(scenario==='retry'&&accountTest.calls.filter(x=>x.path===path).length===1)return respond({},401);
  const current={id,atual:true,criadoEm:'2026-09-15T12:00:00',ultimoUsoEm:'2026-09-16T12:00:00Z',expiraEm:'2026-09-17T12:00:00Z',ip:'127.0.0.1',userAgent:'Windows Chrome/120 Edg/120'};
  return respond(scenario==='empty'?[]:scenario==='single'||accountTest.revoked?[current]:[{...current,id:remote,atual:false,userAgent:'Linux Firefox/120'},current]);
 }
 throw Error('Unexpected API path '+path);
};`
});
const nav = async (scenario) => {
  await send('Page.navigate', { url: 'http://localhost:5173/account?case=' + scenario });
  await delay(1700);
};
const main = () => evaluate("document.querySelector('main')?.innerText||''");
await nav('normal');
check(
  (await main()).includes('Conta de teste') && (await main()).includes('fixture@example.invalid'),
  'conta sem role ou empresa'
);
check(
  (await main()).indexOf('Edge no Windows') < (await main()).indexOf('Firefox no Linux'),
  'atual primeiro e userAgent amigável'
);
check(
  (await main()).includes('127.0.0.1') && !(await main()).includes('11111111-'),
  'IP presente e ID oculto'
);
await click('Encerrar sessão');
check(
  await evaluate(
    "document.querySelector('[aria-labelledby=confirm-dialog-title]').textContent.includes('precisará entrar novamente')"
  ),
  'confirmação de revogação'
);
await evaluate(
  "[...document.querySelectorAll('[aria-labelledby=confirm-dialog-title] button')].find(e=>e.textContent==='Encerrar sessão').click()"
);
await delay(600);
check(
  !(await main()).includes('Firefox no Linux') && (await main()).includes('somente neste dispositivo'),
  'revoga remota e preserva atual'
);
for (const width of [1920, 1366, 768]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await delay(200);
  check(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'responsivo ' + width);
}
await nav('revoke-error');
await click('Encerrar sessão');
await evaluate(
  "[...document.querySelectorAll('[aria-labelledby=confirm-dialog-title] button')].find(e=>e.textContent==='Encerrar sessão').click()"
);
await delay(600);
check((await main()).includes('Firefox no Linux'), 'falha preserva sessão remota');
await nav('global-error');
await click('Sair de todos os dispositivos');
await click('Sair de todos');
check((await main()).includes('Minha Conta'), 'falha logout global preserva conta');
await nav('normal');
await click('Sair de todos os dispositivos');
await click('Sair de todos');
check(await evaluate("location.pathname==='/login'"), 'logout global retorna login');
check(
  await evaluate("accountTest.calls.filter(x=>x.path==='/api/auth/refresh').length===1"),
  'sem refresh após logout global'
);
await nav('normal');
await click('Sair');
check(await evaluate("location.pathname==='/login'"), 'logout normal reutilizado');
await nav('retry');
check((await main()).includes('Edge no Windows'), '401 recupera listagem');
check(
  await evaluate(
    "accountTest.calls.filter(x=>x.path==='/api/auth/sessoes').length===2 && accountTest.calls.filter(x=>x.path==='/api/auth/refresh').length===2"
  ),
  'um refresh e um retry'
);
await nav('error');
check(
  (await main()).includes('Não foi possível carregar') && (await main()).includes('fixture@example.invalid'),
  'erro isolado preserva conta'
);
await nav('empty');
check((await main()).includes('Nenhuma sessão ativa encontrada'), 'lista vazia');
await nav('loading');
check(
  (await main()).includes('Carregando sessões') && (await main()).includes('Conta de teste'),
  'skeleton localizado'
);
console.log(checks + ' verificações com API simulada.');
ws.close();
