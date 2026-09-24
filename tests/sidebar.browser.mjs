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
let errors = [];
const originalMessage = ws.onmessage;
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
  if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error')
    errors.push('console.error');
  originalMessage(event);
};
await send('Runtime.enable');
await viewport(1366, 768);
await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
await delay(1800);
await evaluate(
  "localStorage.removeItem('erp.sidebarCollapsed');localStorage.setItem('erp.themeMode','light')"
);
await send('Page.reload');
await delay(1600);
check((await geometry()).rail === 264, 'sem preferência inicia expandida');
const expanded = await geometry();
const calls = await evaluate('dashTest.calls.length');
const storage = await evaluate('JSON.stringify({...localStorage})');
await button('Recolher menu lateral');
const mini = await geometry();
check(
  mini.rail === 76 && mini.main - expanded.main === 188 && mini.header === 76,
  'recolhe e entrega largura ao conteúdo/header'
);
check(
  await evaluate('!document.querySelector(\'nav[aria-label="Navegação principal"]\').textContent.trim()'),
  'labels e grupos escondidos'
);
check(
  await evaluate("localStorage.getItem('erp.sidebarCollapsed')==='true'"),
  'preferência recolhida persistida'
);
check((await evaluate('dashTest.calls.length')) === calls, 'recolher não faz HTTP');
check(
  (await evaluate(
    `(()=>{const s={...localStorage};delete s['erp.sidebarCollapsed'];return JSON.stringify(s)})()`
  )) === storage,
  'somente chave visual mudou'
);
const target = await evaluate(
  '(()=>{const r=document.querySelector(\'nav[aria-label="Navegação principal"] a[aria-label=Clientes]\').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()'
);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...target });
await delay(650);
check(
  await evaluate("[...document.querySelectorAll('[role=tooltip]')].some(x=>x.textContent==='Clientes')"),
  'tooltip Clientes no recolhido'
);
await evaluate(
  'document.querySelector(\'nav[aria-label="Navegação principal"] a[aria-label=Clientes]\').focus()'
);
await press('Enter', 'Enter', 13);
check(
  await evaluate(
    "location.pathname==='/customers' && document.querySelector('nav[aria-label=\"Navegação principal\"] a[aria-label=Clientes]').getAttribute('aria-current')==='page'"
  ),
  'ícone navega com Enter e preserva ativo'
);
check((await geometry()).rail === 76, 'rota desktop mantém recolhida');
await send('Page.reload');
await delay(1600);
check((await geometry()).rail === 76, 'F5 mantém recolhida');
await evaluate('document.querySelector(\'button[aria-label="Expandir menu lateral"]\').focus()');
await press(' ', 'Space', 32);
check((await geometry()).rail === 264, 'Space no segundo clique expande');
await send('Page.reload');
await delay(1600);
check((await geometry()).rail === 264, 'F5 mantém expandida');
await button('Abrir menu da conta');
check(
  await evaluate("document.getElementById('user-menu').textContent.includes('Minha Conta')"),
  'avatar usa menu existente'
);
await press('Escape', 'Escape', 27);
await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
await delay(1600);
fs.mkdirSync('tmp', { recursive: true });
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  await send('Page.reload');
  await delay(1600);
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 768],
    [768, 1024]
  ]) {
    await viewport(width, height);
    if (width >= 1200) {
      for (const collapsed of [false, true]) {
        const g = await geometry();
        if ((g.rail === 76) !== collapsed)
          await button(collapsed ? 'Recolher menu lateral' : 'Expandir menu lateral');
        const final = await geometry();
        check(
          !final.overflow && final.header === final.rail,
          `${mode} ${width} ${collapsed ? 'mini' : 'expandida'} alinhamento sem overflow`
        );
        if (width === 1366) {
          const shot = await send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(
            `tmp/sidebar-${mode}-${collapsed ? 'mini' : 'expanded'}.png`,
            Buffer.from(shot.data, 'base64')
          );
        }
      }
    } else {
      check(
        (await geometry()).rail === 0 && !(await geometry()).overflow,
        `${mode} ${width} sem rail tablet`
      );
      await button('Abrir navegação');
      check(
        await evaluate(
          "document.querySelector('nav[aria-label=\"Navegação principal\"]').textContent.includes('Clientes')"
        ),
        `${mode} ${width} Drawer expandido`
      );
      await evaluate(
        'document.querySelector(\'nav[aria-label="Navegação principal"] a[aria-label=Clientes]\').click()'
      );
      await delay(400);
      check(
        await evaluate('!document.querySelector(\'nav[aria-label="Navegação principal"]\')'),
        `${mode} ${width} navegação fecha Drawer`
      );
      await button('Abrir navegação');
      await press('Escape', 'Escape', 27);
      check(
        await evaluate('!document.querySelector(\'nav[aria-label="Navegação principal"]\')'),
        `${mode} ${width} Escape fecha Drawer`
      );
      await button('Abrir navegação');
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: width - 20,
        y: 200,
        button: 'left',
        clickCount: 1
      });
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: width - 20,
        y: 200,
        button: 'left',
        clickCount: 1
      });
      await delay(400);
      check(
        await evaluate('!document.querySelector(\'nav[aria-label="Navegação principal"]\')'),
        `${mode} ${width} backdrop fecha Drawer`
      );
    }
  }
}
check(errors.length === 0, 'zero erros novos de console/runtime');
console.log(`${checks} verificações sidebar, API simulada.`);
ws.close();
