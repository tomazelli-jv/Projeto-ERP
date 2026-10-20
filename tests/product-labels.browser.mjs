// Regressão em navegador isolado via CDP; sessão simulada, sem credenciais reais.
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
  await send('Page.bringToFront');
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const click = async (text) => {
  await evaluate(
    `(()=>{const b=[...document.querySelectorAll('[role=dialog] button,[role=dialog] a')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
  );
  await delay(1200);
};
const input = async (label, value) => {
  await evaluate(
    `(()=>{const l=[...document.querySelectorAll('[role=dialog] label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)}));const i=document.getElementById(l.htmlFor);Object.getOwnPropertyDescriptor(i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`
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
const native=fetch;const token=()=>btoa('{}')+'.'+btoa(JSON.stringify({sub:'labels-test',sid:'session-test',...(scenario==='none'?{}:{funcionarioId:1,empresaId:1,lojaId:window.dashTest.store})}))+'.test';
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
const body = () => evaluate('document.body.innerText');
const go = async (path) => {
  await send('Page.navigate', { url: 'http://localhost:5173' + path });
  // Aguarda a tela e suas queries em vez de presumir uma duração fixa de carregamento.
  for (let attempt = 0; attempt < 60; attempt++) {
    await delay(150);
    if (
      await evaluate(
        `Boolean(document.querySelector('main h1')) && !document.body.innerText.includes('Carregando')`
      )
    )
      return;
  }
  throw Error('A página não concluiu o carregamento: ' + path);
};
const select = async (label, option) => {
  await evaluate(
    `(()=>{const label=[...document.querySelectorAll('[role=dialog] label')].find(e=>e.textContent===${JSON.stringify(label)});const field=document.querySelector('[role=dialog]').querySelector('#'+CSS.escape(label.htmlFor));field.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));})()`
  );
  await delay(100);
  await evaluate(
    `(()=>{const o=[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent===${JSON.stringify(option)});if(!o)throw Error('Opcao ausente');o.click();})()`
  );
  await delay(400);
};

// Apenas a sessão e a abertura da impressão são simuladas. Dados vêm dos repositories reais.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.print=()=>{window.__printCalls=(window.__printCalls??0)+1};`
});
await viewport(1440, 900);
await go('/products');
await evaluate(`(async()=>{
 const owner=JSON.stringify(['labels-test',1]);
 for(const name of ['products','brands','product-groups'])localStorage.removeItem('erp.dev.'+name+'.v1:'+owner);
 const {productFixtures}=await import('/src/features/products/mockProductsRepository.js');
 const {createMockBrandsRepository}=await import('/src/features/brands/mockBrandsRepository.js');
 const {createMockGroupsRepository}=await import('/src/features/product-groups/mockGroupsRepository.js');
 const brand=await createMockBrandsRepository({storage:localStorage,key:'erp.dev.brands.v1:'+owner}).create({name:'Marca etiquetas',cnpj:'',contact:'',active:true});
 const group=await createMockGroupsRepository({storage:localStorage,key:'erp.dev.product-groups.v1:'+owner}).create({name:'Grupo etiquetas',description:'',active:true});
 const rows=productFixtures();rows[0].brandId=brand.id;rows[0].brand=brand.name;rows[0].groupId=group.id;rows[0].category=group.name;
 rows[2].name='Produto sem barcode '+('nome longo '.repeat(20));
 localStorage.setItem('erp.dev.products.v1:'+owner,JSON.stringify(rows));
})()`);
await go('/products');
const openLabels = async () => {
  const mobile = await evaluate(`!!document.querySelector('button[aria-label="Abrir navegação"]')`);
  if (mobile) {
    await evaluate(`document.querySelector('button[aria-label="Abrir navegação"]').click()`);
    await delay(200);
    await evaluate(
      `[...document.querySelectorAll('nav button')].find(e=>e.textContent==='Produtos').click()`
    );
  } else await evaluate(`document.querySelector('nav button[aria-label="Produtos"]').click()`);
  await delay(200);
  await evaluate(
    `[...document.querySelectorAll('nav button')].find(e=>e.textContent.startsWith('Etiquetas')).click()`
  );
  await delay(500);
};
const dialog = () => evaluate(`document.querySelector('[aria-labelledby="product-labels-title"]').innerText`);
const tick = async (prefix) => {
  await evaluate(
    `[...document.querySelectorAll('[role=dialog] input[type=checkbox]')].find(e=>e.getAttribute('aria-label').startsWith(${JSON.stringify(prefix)})).click()`
  );
  await delay(200);
};
await openLabels();
check(await evaluate(`location.pathname==='/products'`), 'modal preserva rota');
check(
  await evaluate(
    `[...document.querySelectorAll('button')].find(e=>e.textContent==='Pré-visualizar etiquetas').disabled`
  ),
  'sem seleção bloqueia prévia'
);
check(
  await evaluate(`document.querySelectorAll('[role=dialog] tbody tr').length===2`),
  'somente produtos ativos'
);
await select('Filtro', 'Código de barras');
await input('Pesquisa', '00012345678905');
await delay(300);
check(await evaluate(`document.querySelectorAll('[role=dialog] tbody tr').length===1`), 'busca GTIN real');
await tick('Selecionar Refrigerante');
await input('Quantidade de Refrigerante', '2');
await click('Limpar filtros');
await select('Filtro', 'Código');
await input('Pesquisa', '0003');
await delay(300);
check(await evaluate(`document.querySelectorAll('[role=dialog] tbody tr').length===1`), 'busca código');
await tick('Selecionar Produto sem barcode');
await input('Quantidade de Produto sem barcode', '3');
check((await dialog()).includes('Produtos selecionados: 2 · Total de etiquetas: 5'), 'quantidades 2 + 3');
await select('Grupo', 'Grupo etiquetas');
await click('Limpar filtros');
await select('Marca', 'Marca etiquetas');

check(await evaluate(`document.querySelectorAll('[role=dialog] tbody tr').length===1`), 'marca auxiliar');
await select('Grupo', 'Grupo etiquetas');
check(await evaluate(`document.querySelectorAll('[role=dialog] tbody tr').length===1`), 'grupo auxiliar');
await click('Limpar filtros');
await input('Quantidade de Refrigerante', '0');
check(
  await evaluate(
    `[...document.querySelectorAll('button')].find(e=>e.textContent==='Pré-visualizar etiquetas').disabled`
  ),
  'zero inválido'
);
await input('Quantidade de Refrigerante', '1,5');
check(
  await evaluate(
    `[...document.querySelectorAll('button')].find(e=>e.textContent==='Pré-visualizar etiquetas').disabled`
  ),
  'fracionário inválido'
);
await input('Quantidade de Refrigerante', '2');
await click('Pré-visualizar etiquetas');
check(await evaluate(`document.querySelectorAll('.product-label').length===5`), 'prévia com cinco etiquetas');
check(
  await evaluate(`document.querySelectorAll('.product-label-barcode').length===2`),
  'sem código não inventa barcode'
);
check(
  await evaluate(
    `[...document.querySelectorAll('.product-label-name')].every(e=>e.getBoundingClientRect().height<=25)`
  ),
  'nome longo limitado'
);
check(
  await evaluate(`document.querySelector('.product-label-barcode').textContent==='00012345678905'`),
  'zeros preservados'
);
await click('Voltar');
check((await dialog()).includes('Total de etiquetas: 5'), 'voltar preserva seleção e quantidades');
await evaluate(
  `(async()=>{const {createMockProductsRepository}=await import('/src/features/products/mockProductsRepository.js');await createMockProductsRepository({storage:localStorage,key:'erp.dev.products.v1:'+JSON.stringify(['labels-test',1])}).updatePrices([{productId:'demo-product-1',previousPriceCents:950,newPriceCents:1049}]);})()`
);
await click('Pré-visualizar etiquetas');
check(
  await evaluate(`document.querySelector('.product-label-price').textContent.includes('10,49')`),
  'prévia relê preço remarcado'
);
await click('Imprimir');
await delay(1000);
check(
  await evaluate(`!!document.querySelector('iframe[title="Impressão de etiquetas"]')`),
  'documento isolado'
);
check(
  await evaluate(`document.querySelector('iframe').contentWindow.__printCalls===1`),
  'print somente no iframe'
);
check(await evaluate(`!window.__printCalls`), 'não imprime janela ERP');
check(
  await evaluate(
    `document.querySelector('iframe').contentDocument.querySelectorAll('.product-label').length===5`
  ),
  'impressão contém lote completo'
);
check(
  await evaluate(
    `!document.querySelector('iframe').contentDocument.querySelector('button,nav,[role=dialog]')`
  ),
  'sem interface no print'
);
await click('Voltar');
await input('Quantidade de Refrigerante', '43');
await click('Pré-visualizar etiquetas');
check(await evaluate(`document.querySelectorAll('.product-label').length===20`), 'prévia limitada a vinte');
check((await dialog()).includes('20 de 46'), 'total completo informado');
await click('Imprimir');
await delay(700);
await send('Emulation.setEmulatedMedia', { media: 'print' });
check(
  await evaluate(
    `(()=>{const d=document.querySelector('iframe').contentDocument;return d.querySelectorAll('.product-label').length===46&&d.querySelectorAll('.label-sheet').length===3})()`
  ),
  '46 etiquetas em três folhas'
);
check(
  await evaluate(
    `(()=>{const f=document.querySelector('iframe'),w=f.contentWindow;return [...f.contentDocument.querySelectorAll('.product-label')].every(e=>w.getComputedStyle(e).breakInside==='avoid'&&e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1)})()`
  ),
  'print sem corte ou quebra interna'
);
check(
  await evaluate(
    `(()=>{const f=document.querySelector('iframe');return f.contentWindow.getComputedStyle(f.contentDocument.querySelector('.label-sheet')).breakAfter==='page'})()`
  ),
  'quebra de página no print'
);
await send('Emulation.setEmulatedMedia', { media: '' });
await click('Voltar');
for (const mode of ['light', 'dark']) {
  await evaluate(
    `localStorage.setItem('erp.themeMode','${mode}');window.dispatchEvent(new StorageEvent('storage',{key:'erp.themeMode'}))`
  );
  for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
    await viewport(width, 900);
    check(
      await evaluate(
        `(()=>{const r=document.querySelector('[aria-labelledby="product-labels-title"]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})()`
      ),
      'modal ' + mode + ' ' + width
    );
  }
  await click('Pré-visualizar etiquetas');
  check(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), 'prévia mobile ' + mode);
  await viewport(1440, 900);
  await evaluate(`document.querySelector('[role=dialog] > div').scrollTop=0`);
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tmp/labels-' + mode + '.png', Buffer.from(screenshot.data, 'base64'));
  await click('Voltar');
}
await click('Limpar seleção');
await input('Pesquisa', 'inexistente-zz');
await delay(300);
check((await dialog()).includes('Nenhum produto encontrado.'), 'vazio');
await click('Cancelar');
check(
  await evaluate(`location.pathname==='/products'&&!document.querySelector('[role=dialog]')`),
  'fecha sem navegar'
);
console.log(checks + ' verificacoes passaram');
ws.close();
