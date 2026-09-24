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

// Exercita as páginas reais; somente autenticação/contexto são fixtures isoladas.
await viewport(1366, 768);
await send('Page.navigate', { url: 'http://localhost:5173/settings' });
await delay(1800);
await evaluate("localStorage.setItem('erp.sidebarCollapsed','false')");
await send('Page.reload');
await delay(1400);
check(
  await evaluate(
    `document.querySelector('button[aria-label="Configurações"]').getAttribute('aria-expanded')==='true'`
  ),
  'grupo aberto na rota filha'
);
check(
  await evaluate(`document.querySelector('a[href="/settings"][aria-current="page"]')!==null`),
  'Parametrização ativa'
);
for (const [label, mode] of [
  ['Claro', 'light'],
  ['Escuro', 'dark'],
  ['Sistema', 'system']
]) {
  await click(label);
  check(
    await evaluate(
      `localStorage.getItem('erp.themeMode')==='${mode}' && [...document.querySelectorAll('button')].find(b=>b.textContent==='${label}').getAttribute('aria-pressed')==='true'`
    ),
    'tema ' + label + ' selecionado e persistido'
  );
}
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await delay(400);
check(await evaluate("document.documentElement.style.colorScheme==='dark'"), 'Sistema acompanha SO');
await button('Alterar para tema claro');
check(
  await evaluate(
    `[...document.querySelectorAll('button')].find(b=>b.textContent==='Claro').getAttribute('aria-pressed')==='true'`
  ),
  'Header atualiza a mesma seleção'
);
await click('Recolhida');
check((await geometry()).rail === 76, 'preferência recolhe AppShell');
await send('Page.reload');
await delay(1400);
check((await geometry()).rail === 76, 'F5 preserva preferência');
await button('Configurações');
check(
  await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].some(e=>e.textContent==='Planos')`),
  'recolhida usa menu existente'
);
await evaluate(`document.querySelector('[role="menuitem"][href="/admin/plan"]').click()`);
await delay(1200);
check(
  await evaluate(
    `document.querySelector('main').textContent.includes('A gestão de planos ainda não está disponível neste ambiente.') && !document.querySelector('main').textContent.includes('R$')`
  ),
  'Planos indisponível sem preço fictício'
);
await button('Configurações');
check(
  await evaluate(
    `document.querySelector('[role="menuitem"][href="/admin/plan"]').getAttribute('aria-current')==='page'`
  ),
  'Planos ativo'
);
await evaluate(`document.querySelector('[role="menuitem"][href="/admin/users"]').click()`);
await delay(1200);
await button('Configurações');
check(
  await evaluate(
    `document.querySelector('[role="menuitem"][href="/admin/users"]').getAttribute('aria-current')==='page'`
  ),
  'Usuários ativo'
);
await evaluate(`document.querySelector('[role="menuitem"][href="/settings"]').click()`);
await delay(1200);
await click('Expandida');
check((await geometry()).rail === 264, 'preferência expande AppShell');
for (const mode of ['Claro', 'Escuro']) {
  await click(mode);
  for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
    await viewport(width, 900);
    check(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      mode + ' ' + width + ' sem overflow'
    );
    if (width >= 1200) {
      await click('Recolhida');
      check((await geometry()).rail === 76, 'mini ' + width);
      await click('Expandida');
    } else {
      await click('Recolhida');
      await button('Abrir navegação');
      check(
        await evaluate(
          `document.querySelector('nav[aria-label="Navegação principal"]').textContent.includes('Parametrização')`
        ),
        'Drawer mantém labels ' + width
      );
      await press('Escape', 'Escape', 27);
    }
  }
  await viewport(1366, 768);
  await click('Expandida');
  fs.mkdirSync('tmp', { recursive: true });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tmp/settings-' + mode + '.png', Buffer.from(shot.data, 'base64'));
}
check(
  await evaluate(
    `dashTest.calls.every(c=>['/api/auth/refresh','/api/FuncionarioLoja/minhasLojas'].includes(c.path))`
  ),
  'preferências e Planos não inventam chamadas API'
);
console.log(checks + ' verificações Configurações passaram.');
ws.close();
