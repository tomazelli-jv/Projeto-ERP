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
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const click = async (text) => {
  await evaluate(
    `(()=>{const b=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
  );
  await delay(1200);
};
const input = async (label, value) => {
  await evaluate(
    `(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)}));const i=document.getElementById(l.htmlFor);Object.getOwnPropertyDescriptor(i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`
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
    `(()=>{const label=[...document.querySelectorAll('label')].find(e=>e.textContent===${JSON.stringify(label)});const field=document.getElementById(label.htmlFor);field.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));})()`
  );
  await delay(100);
  await evaluate(
    `(()=>{const o=[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent===${JSON.stringify(option)});if(!o)throw Error('Opcao ausente');o.click();})()`
  );
  await delay(400);
};
// Catálogo usa seu repository real; apenas a sessão é simulada neste navegador isolado.
await viewport(1440, 900);
await go('/products');
const clear = () =>
  evaluate(
    `Object.keys(localStorage).filter(k=>k.startsWith('erp.dev.products.v1:')&&k.includes('dashboard-test')).forEach(k=>localStorage.removeItem(k))`
  );
await clear();
await go('/products');
check((await body()).includes('Demonstração local'), 'mock identificado');
check(await evaluate(`document.querySelectorAll('tbody tr').length===5`), 'listagem');
await input('Buscar item', '00012345678905');
await delay(700);
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'busca GTIN com zeros');
await click('Limpar filtros');
await select('Tipo', 'Produtos');
check(await evaluate(`document.querySelectorAll('tbody tr').length===3`), 'filtro produtos');
await select('Tipo', 'Serviços');
check(await evaluate(`document.querySelectorAll('tbody tr').length===2`), 'filtro serviços');
await select('Status', 'Inativos');
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro status');
await click('Limpar filtros');
await select('Categoria', 'Bebidas');
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro categoria');
await click('Limpar filtros');
await input('Unidade', 'H');
await delay(300);
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro unidade');
await click('Limpar filtros');
await input('Buscar item', 'não existe xyz');
await delay(700);
check((await body()).includes('Nenhum item encontrado'), 'sem resultados');
await click('Limpar filtros');
await click('Novo item');
await input('Nome', 'Produto teste browser');
await input('Código interno', '000009');
await input('Preço de venda', '-1');
await click('Cadastrar item');
check((await body()).includes('Informe um preço de venda válido'), 'preço negativo rejeitado');
await input('Preço de venda', '123,45');
await input('Preço de custo', '10,10');
await input('Código de barras / GTIN', '00012345678905');
await input('NCM', '01010101');
await evaluate(
  `Array.from(document.querySelectorAll('label')).find(e=>e.textContent==='Controla estoque').click()`
);
await delay(100);
await input('Estoque mínimo', '-1');
await click('Cadastrar item');
check((await body()).includes('Estoque mínimo deve ser não negativo'), 'estoque mínimo validado');
await input('Estoque mínimo', '2,5');
await click('Cadastrar item');
check((await body()).includes('Item cadastrado com sucesso.'), 'criação produto');
await go('/products');
check((await body()).includes('Produto teste browser'), 'persistência');
await evaluate(`document.querySelector('a[aria-label="Visualizar item Produto teste browser"]').click()`);
await delay(500);
check(
  (await body()).includes('01010101') && (await body()).includes('123,45') && (await body()).includes('2,5'),
  'detalhe produto'
);
await click('Editar produto');
await input('Nome', 'Produto teste atualizado');
await click('Salvar alterações');
check((await body()).includes('Item atualizado com sucesso.'), 'edição');
await click('Novo item');
await select('Tipo do item', 'Serviço');
check(
  !(await body()).includes('Código de barras / GTIN') &&
    !(await body()).includes('Controla estoque') &&
    !(await body()).includes('Preço de custo'),
  'serviço oculta campos de produto'
);
await input('Nome', 'Serviço teste browser');
await input('Código interno', 'S009');
await input('Unidade de cobrança', 'H');
await input('Duração estimada (minutos)', '-1');
await input('Preço de venda', '99,99');
await click('Cadastrar item');
check((await body()).includes('Duração deve ser'), 'duração validada');
await input('Duração estimada (minutos)', '60');
await input('Descrição do serviço', 'Descrição teste');
await click('Cadastrar item');
check((await body()).includes('Item cadastrado com sucesso.'), 'criação serviço');
await evaluate(`document.querySelector('a[aria-label="Visualizar item Serviço teste browser"]').click()`);
await delay(500);
check(
  (await body()).includes('Descrição teste') && !(await body()).includes('Configuração de estoque'),
  'detalhe serviço'
);
await click('Voltar para a lista');
await select('Por página', '5');
await click('Próxima');
check(await evaluate(`document.querySelectorAll('tbody tr').length===2`), 'paginação');
await evaluate(
  `document.querySelector('button[aria-label="Inativar item Produto teste atualizado"]').click()`
);
await delay(100);
await click('Inativar');
check((await body()).includes('Item inativado com sucesso.'), 'inativação');
await click('Fechar');
await evaluate(`document.querySelector('button[aria-label="Ativar item Produto teste atualizado"]').click()`);
await delay(100);
await click('Ativar');
check((await body()).includes('Item ativado com sucesso.'), 'reativação');
await click('Fechar');
await click('Novo item');
await input('Nome', 'Duplicado');
await input('Código interno', '000009');
await input('Preço de venda', '1,00');
await click('Cadastrar item');
check((await body()).includes('Já existe um item com este código interno.'), 'código duplicado');
for (const mode of ['light', 'dark']) {
  await evaluate(
    `localStorage.setItem('erp.themeMode','${mode}');window.dispatchEvent(new StorageEvent('storage',{key:'erp.themeMode'}))`
  );
  for (const path of ['/products', '/products/new', '/products/demo-service-1']) {
    await go(path);
    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1366, 768],
      [1024, 900],
      [768, 900]
    ]) {
      await viewport(width, height);
      check(
        await evaluate('document.documentElement.scrollWidth<=innerWidth'),
        'responsivo ' + mode + ' ' + path + ' ' + width
      );
    }
    await viewport(1440, 900);
    await send('Page.captureScreenshot', { format: 'png' }).then((r) =>
      fs.writeFileSync(
        'tmp/products-' +
          (path.endsWith('new') ? 'form' : path.includes('demo') ? 'profile' : 'list') +
          '-' +
          mode +
          '.png',
        Buffer.from(r.data, 'base64')
      )
    );
  }
}
await go('/products/new');
check(
  await evaluate(`getComputedStyle(document.querySelector('.create-label')).transitionDuration==='0.5s'`),
  'animação compartilhada'
);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
check(
  await evaluate(`getComputedStyle(document.querySelector('.create-label')).transitionDuration==='0s'`),
  'movimento reduzido'
);
await evaluate(`localStorage.setItem('erp.dev.products.v1:'+JSON.stringify(['dashboard-test',1]),'[]')`);
await go('/products');
check((await body()).includes('Nenhum produto ou serviço cadastrado.'), 'empty');
await evaluate(`localStorage.setItem('erp.dev.products.v1:'+JSON.stringify(['dashboard-test',1]),'{err')`);
await go('/products');
for (let attempt = 0; attempt < 30 && !(await body()).includes('Não foi possível ler os itens'); attempt++)
  await delay(150);
check((await body()).includes('Não foi possível ler os itens'), 'erro');
await clear();
await go('/products/inexistente');
check((await body()).includes('Item não encontrado.'), 'não encontrado');
check(
  await evaluate(`window.dashTest.calls.every(c=>!c.path.toLowerCase().includes('product'))`),
  'sem HTTP inventado'
);
console.log(checks + ' verificacoes passaram');
ws.close();
