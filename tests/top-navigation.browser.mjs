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

// Regressão do shell experimental com sessão simulada isolada; nenhuma alteração no backend.
await viewport(1366, 768);
await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
await delay(1800);
const navClick = async (label) => {
  await evaluate(`document.querySelector('nav [aria-label="${label}"]').click()`);
  await delay(400);
};
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  await send('Page.reload');
  await delay(1600);
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 768],
    [768, 1024],
    [390, 844]
  ]) {
    await viewport(width, height);
    check(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      mode + ' ' + width + ' sem overflow'
    );
    check(
      await evaluate("document.querySelector('main').getBoundingClientRect().left===0"),
      mode + ' ' + width + ' sem espaço lateral'
    );
    if (width >= 1200) {
      await navClick('Cadastros');
      check(
        await evaluate("document.getElementById('navigation-panel').textContent.includes('Fornecedores')"),
        'Cadastros abre'
      );
      const point = await evaluate(
        "(()=>{const r=document.getElementById('navigation-panel').getBoundingClientRect();return {x:r.x+30,y:r.y+30}})()"
      );
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
      await delay(500);
      check(
        await evaluate("!!document.getElementById('navigation-panel')"),
        'ponteiro entra no painel sem fechar'
      );
      await evaluate('document.querySelector(\'#navigation-panel a[href="/customers"]\').click()');
      await delay(500);
      check(
        await evaluate("location.pathname==='/customers' && !document.getElementById('navigation-panel')"),
        'filho navega e fecha'
      );
      await navClick('Configurações');
      await press('Escape', 'Escape', 27);
      check(await evaluate("!document.getElementById('navigation-panel')"), 'Escape fecha');
      await navClick('Configurações');
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: width - 20,
        y: 350,
        button: 'left',
        clickCount: 1
      });
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: width - 20,
        y: 350,
        button: 'left',
        clickCount: 1
      });
      await delay(400);
      check(await evaluate("!document.getElementById('navigation-panel')"), 'clique fora fecha');
    } else {
      await button('Abrir navegação');
      check(
        await evaluate(
          "document.querySelector('nav[aria-label=\"Navegação principal\"]').textContent.includes('Configurações') && !document.getElementById('navigation-panel')"
        ),
        'Drawer com mesmos grupos'
      );
      await evaluate('document.querySelector(\'nav a[href="/dashboard"]\').click()');
      await delay(400);
      check(
        await evaluate('!document.querySelector(\'nav[aria-label="Navegação principal"]\')'),
        'rota fecha Drawer'
      );
    }
  }
  await viewport(1366, 768);
  await navClick('Cadastros');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync('tmp/top-navigation-' + mode + '.png', Buffer.from(shot.data, 'base64'));
  await press('Escape', 'Escape', 27);
}
await navClick('Configurações');
await evaluate('document.querySelector(\'#navigation-panel a[href="/admin/users"]\').click()');
await delay(500);
check(await evaluate("location.pathname==='/admin/users'"), 'Usuários mantém rota');
await navClick('Administração');
await evaluate('document.querySelector(\'#navigation-panel a[href="/admin/companies"]\').click()');
await delay(500);
check(await evaluate("location.pathname==='/admin/companies'"), 'Empresas mantém rota');
await evaluate(
  'document.querySelector(\'button[aria-controls="user-menu"]\')?.click() || document.querySelector(\'button[aria-haspopup="true"]:not(nav button)\').click()'
);
await delay(400);
check(
  await evaluate("document.getElementById('user-menu').textContent.includes('Trocar de loja')"),
  'menu conta preservado'
);
await evaluate(
  "[...document.querySelectorAll('[role=menuitemradio]')].find(x=>x.textContent==='Sistema').click()"
);
check(await evaluate("localStorage.getItem('erp.themeMode')==='system'"), 'tema Sistema compartilhado');
await evaluate(
  "[...document.querySelectorAll('[role=menuitem]')].find(x=>x.textContent.includes('Trocar de loja')).click()"
);
await delay(400);
check(
  await evaluate("document.querySelector('[role=dialog]').textContent.includes('Consulta de lojas')"),
  'consulta loja preservada'
);
console.log(checks + ' verificações navegação superior');
ws.close();
