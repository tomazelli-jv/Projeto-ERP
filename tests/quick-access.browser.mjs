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
    `(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
  );
  await delay(1200);
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

await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
const scenario=new URLSearchParams(location.search).get('case')??'multi';
window.dashTest={calls:[],store:1};
const native=fetch;const token=()=>btoa('{}')+'.'+btoa(JSON.stringify({sub:'dashboard-test',sid:'session-test',...(scenario==='none'?{}:{funcionarioId:1,empresaId:1,lojaId:window.dashTest.store})}))+'.test';
window.fetch=async(url,options={})=>{
 if(!String(url).startsWith('http://localhost:5054'))return native(url,options);
 const p=new URL(url).pathname;window.dashTest.calls.push({path:p,credentials:options.credentials,headers:Object.keys(options.headers??{})});
 if(p==='/api/auth/login')return new Response(JSON.stringify({accessToken:token(),userName:'Fixture'}));
 if(p==='/api/auth/refresh'&&scenario==='login')return new Response('{}',{status:401});
 if(p==='/api/auth/refresh')return new Response(JSON.stringify({accessToken:token(),userName:'Usuario de teste'}));
 if(p==='/api/auth/trocar-loja'){await new Promise(r=>setTimeout(r,700));window.dashTest.store=JSON.parse(options.body).lojaId;return new Response(JSON.stringify({accessToken:token()}));}
 if(p==='/api/FuncionarioLoja/minhasLojas'){
  if(scenario==='loading')await new Promise(r=>setTimeout(r,5000));
  if(scenario==='error')return new Response('{}',{status:500});
  return new Response(JSON.stringify(scenario==='empty'?[]:[{id:1,empresaId:1,nome:'Loja Centro',ativo:true},...(scenario==='single'?[]:[{id:2,empresaId:1,nome:'Loja Filial',ativo:true}])]));
 }
 throw Error('Endpoint inesperado '+p);
};`
});
// Mede geometria pública e comportamento observável, sem depender de classes internas MUI.
const viewport = async (width, height) => {
  // Mantém a aba isolada ativa para que media queries não sejam adiadas pelo headless.
  await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await delay(400);
};
const press = async (key, code, virtualKey) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKey });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey });
  await delay(400);
};
const button = async (label) => {
  await evaluate(`document.querySelector('button[aria-label="${label}"]').click()`);
  await delay(400);
};
const geometry = () =>
  evaluate(
    `({rail:document.querySelector('aside').getBoundingClientRect().width,main:document.querySelector('main').getBoundingClientRect().width,header:document.querySelector('header').getBoundingClientRect().left,overflow:document.documentElement.scrollWidth>innerWidth})`
  );

// Verifica os atalhos reais com contexto de autenticação simulado, sem chamadas ao backend.
await viewport(1440, 900);
await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
await delay(1600);
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  await send('Page.reload');
  await delay(1400);
  for (const path of ['/sales', '/products', '/customers', '/financial', '/inventory', '/settings']) {
    const selector = `a[href="${path}"]:has(.quick-icon)`;
    const before = await evaluate(
      `(()=>{const e=document.querySelector('${selector}');const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()`
    );
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: before.x + before.width / 2,
      y: before.y + before.height / 2
    });
    await delay(350);
    check(
      await evaluate(
        `getComputedStyle(document.querySelector('${selector}'),'::before').transform==='matrix(1, 0, 0, 1, 0, 0)'`
      ),
      mode + ' ' + path + ' fluxo completo'
    );
    check(
      await evaluate(
        `(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return r.x===${before.x}&&r.y===${before.y}&&r.width===${before.width}&&r.height===${before.height}})()`
      ),
      'sem layout shift'
    );
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await delay(350);
    check(
      await evaluate(
        `getComputedStyle(document.querySelector('${selector}'),'::before').transform==='matrix(0, 0, 0, 1, 0, 0)'`
      ),
      'mouse leave restaura'
    );
  }
}
await press('Tab', 'Tab', 9);
await evaluate(`document.querySelector('a[href="/sales"]:has(.quick-icon)').focus()`);
await delay(350);
check(
  await evaluate(
    `document.activeElement.matches(':focus-visible') && getComputedStyle(document.activeElement,'::before').transform==='matrix(1, 0, 0, 1, 0, 0)'`
  ),
  'foco teclado com fluxo'
);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await delay(100);
check(
  await evaluate(
    `getComputedStyle(document.activeElement,'::before').transitionDuration==='0s' && getComputedStyle(document.activeElement.querySelector('.quick-icon')).transform==='none'`
  ),
  'movimento reduzido sem animação'
);
await press('Enter', 'Enter', 13);
check(await evaluate("location.pathname==='/sales'"), 'Enter preserva navegação');
console.log(checks + ' verificações flow');
ws.close();
