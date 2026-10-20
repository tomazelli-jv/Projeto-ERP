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
  if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
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
    `(()=>{const b=[...(document.querySelector('[role=dialog]') ?? document).querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
  );
  await delay(1200);
};
const input = async (label, value) => {
  await evaluate(
    `(()=>{const l=[...(document.querySelector('[role=dialog]') ?? document).querySelectorAll('label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)}));const i=document.getElementById(l.htmlFor);Object.getOwnPropertyDescriptor(i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`
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
    `(()=>{const label=[...(document.querySelector('[role=dialog]') ?? document).querySelectorAll('label')].find(e=>e.textContent.replace('*', '').trim()===${JSON.stringify(label)});const field=document.getElementById(label.htmlFor);field.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));})()`
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
await evaluate(
  `['brands','product-groups','units','ncm'].forEach(k=>localStorage.removeItem('erp.dev.'+k+'.v1:'+JSON.stringify(['dashboard-test',1])))`
);
await go('/products');
check((await body()).includes('Demonstração local'), 'mock identificado');
check(await evaluate(`document.querySelectorAll('tbody tr').length===5`), 'listagem');
await input('Buscar item', '00012345678905');
await delay(700);
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'busca GTIN com zeros');
await click('Mais filtros');
await click('Limpar filtros');
await evaluate(`document.querySelector('[aria-label="Tipo de item"] [role="button"]:nth-child(2)').click()`);
await delay(1200);
check(await evaluate(`document.querySelectorAll('tbody tr').length===3`), 'filtro produtos');
await evaluate(`document.querySelector('[aria-label="Tipo de item"] [role="button"]:nth-child(3)').click()`);
await delay(1200);
check(await evaluate(`document.querySelectorAll('tbody tr').length===2`), 'filtro serviços');
await select('Status', 'Inativos');
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro status');
await click('Limpar filtros');
await input('Grupo', 'Bebidas');
await delay(400);
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
await click('Próximo');
check(
  (await body()).includes('Informe o nome') && (await body()).includes('Selecione um grupo'),
  'obrigatórios da primeira etapa'
);
await input('Nome', 'Produto teste browser');
await input('Código interno', '000009');
await input('Código de barras / GTIN', '00012345678905');
await select('Unidade de medida', 'Selecione uma opção');
await click('Próximo');
check((await body()).includes('Selecione uma unidade.'), 'unidade obrigatória');
await select('Unidade de medida', 'UN — Unidade');
await click('Serviço');
await click('Confirmar');
await click('Produto');
await click('Confirmar');
check(
  await evaluate(`[...document.querySelectorAll('input')].some(i=>i.value==='00012345678905')`),
  'troca de tipo preserva rascunho'
);
await evaluate(`document.querySelector('button[aria-label="Cadastrar grupo"]').click()`);
await delay(500);
await click('Novo grupo');
await input('Nome', 'Grupo teste wizard');
await click('Salvar');
await click('Cancelar');
await select('Grupo', 'Grupo teste wizard');
await evaluate(`document.querySelector('button[aria-label="Cadastrar marca"]').click()`);
await delay(500);
await click('Nova marca');
await input('Nome', 'Marca teste wizard');
await click('Salvar');
await click('Cancelar');
await select('Marca', 'Marca teste wizard');
check((await body()).includes('Resumo do produto'), 'resumo presente');
await click('Próximo');
check((await body()).includes('Reforma tributária'), 'segunda etapa fiscal');
await select('NCM', '00000001 — Demonstração técnica — código com zero inicial');
await input('CST IBS/CBS', '001');
await input('Classificação tributária / cClassTrib', '000001');
await input('Alíquota CBS', '-1');
await click('Próximo');
check((await body()).includes('informe de 0 a 100'), 'alíquota inválida');
await input('Alíquota CBS', '1,25');
await click('Voltar');
check(
  await evaluate(`[...document.querySelectorAll('input')].some(i=>i.value==='Produto teste browser')`),
  'voltar preserva nome'
);
await click('Próximo');
check(
  await evaluate(`[...document.querySelectorAll('input')].some(i=>i.value==='000001')`),
  'voltar preserva tributação'
);
await click('Próximo');
await evaluate(`[...document.querySelectorAll('label')].find(e=>e.textContent==='Controla estoque').click()`);
await delay(100);
await input('Saldo inicial', '2,500');
await input('Estoque mínimo', '2,5');
await input('Estoque máximo', '1');
await click('Próximo');
check((await body()).includes('maior ou igual ao mínimo'), 'máximo coerente');
await input('Estoque máximo', '10');
await input('Localização', 'Prateleira teste');
await click('Próximo');
await input('Preço de venda', '-1');
await click('Salvar produto');
check((await body()).includes('Informe um preço de venda válido'), 'preço negativo rejeitado');
await input('Preço de venda', '123,45');
await input('Preço de custo', '10,10');
await input('Preço promocional', '100,00');
await input('Início da promoção', '2026-10-20');
await input('Fim da promoção', '2026-10-19');
await click('Salvar produto');
check((await body()).includes('posterior ao início'), 'período promocional');
await input('Fim da promoção', '2026-10-31');
await click('Voltar');
await click('Próximo');
check(
  await evaluate(`[...document.querySelectorAll('input')].some(i=>i.value==='123,45')`),
  'preço preservado ao voltar'
);
await click('Salvar produto');
check((await body()).includes('Item cadastrado com sucesso.'), 'criação produto');
await go('/products');
check((await body()).includes('Produto teste browser'), 'persistência');
await evaluate(`document.querySelector('a[aria-label="Visualizar item Produto teste browser"]').click()`);
await delay(500);
check(
  (await body()).includes('00012345678905') &&
    (await body()).includes('123,45') &&
    (await body()).includes('2,5'),
  'detalhe produto'
);
// O perfil reúne catálogo, estoque e campos fiscais sem inventar valores ainda indisponíveis.
check(!(await body()).includes('Demonstração local'), 'perfil sem banner');
check((await body()).includes('Última movimentação'), 'estoque no perfil');
check(
  await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent==='Transferir').disabled`),
  'estoque futuro desabilitado'
);
await evaluate(`document.getElementById('item-tab-0').focus()`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
check(await evaluate(`document.activeElement.id==='item-tab-1'`), 'navegação de abas por teclado');
await click('Tributação');
check(
  (await body()).includes('000001') && (await body()).includes('1,25 %'),
  'tributação salva aparece no perfil'
);
check(
  (await body()).includes('Reforma tributária') && (await body()).includes('CST IBS/CBS'),
  'campos fiscais preparados'
);
check(
  await evaluate(
    `document.getElementById('item-panel-0').hidden && !document.getElementById('item-panel-1').hidden`
  ),
  'painel associado à aba'
);
await click('Informações');
await click('Editar item');
await input('Nome', 'Produto teste atualizado');
await click('Próximo');
await click('Próximo');
check(
  await evaluate(
    `[...document.querySelectorAll('input')].some(i=>i.readOnly && i.value.includes('Aguardando integração'))`
  ),
  'saldo atual somente leitura'
);
await click('Próximo');
await click('Salvar alterações');
check((await body()).includes('Item atualizado com sucesso.'), 'edição');
await click('Novo item');
await click('Serviço');
await click('Confirmar');
check(!(await body()).includes('Código de barras / GTIN'), 'serviço oculta GTIN');
await input('Nome', 'Serviço teste browser');
await input('Código interno', 'S009');
await select('Grupo', 'Grupo teste wizard');
await select('Unidade de medida', 'H — Hora');
await input('Duração estimada (minutos)', '-1');
await click('Próximo');
check((await body()).includes('minutos inteiros'), 'duração validada');
await input('Duração estimada (minutos)', '60');
await input('Descrição do serviço', 'Descrição teste');
await click('Próximo');
await click('Próximo');
check((await body()).includes('Serviços não controlam estoque físico'), 'serviço sem estoque');
await click('Próximo');
await input('Preço de venda', '99,99');
await click('Salvar produto');
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
await select('Grupo', 'Grupo teste wizard');
await click('Próximo');
await click('Próximo');
await click('Próximo');
await input('Preço de venda', '1,00');
await click('Salvar produto');
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
      [768, 900],
      [390, 844]
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
  // Cada etapa é medida separadamente, inclusive o formulário fiscal mais longo.
  await go('/products/demo-product-1/edit');
  for (let stage = 0; stage < 4; stage++) {
    if (stage > 0) await click('Próximo');
    for (const width of [1440, 768, 390]) {
      await viewport(width, 900);
      check(
        await evaluate('document.documentElement.scrollWidth<=innerWidth'),
        `etapa ${stage + 1} ${mode} ${width}`
      );
      check(
        await evaluate(
          `(()=>{let b=[...document.querySelectorAll('button')].find(e=>e.textContent==='Cancelar');while(b&&getComputedStyle(b).position!=='fixed')b=b.parentElement;return !!b&&b.getBoundingClientRect().bottom<=innerHeight+1})()`
        ),
        `rodapé visível ${stage + 1} ${width}`
      );
    }
    await viewport(1440, 900);
    const capture = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`tmp/product-step-${stage + 1}-${mode}.png`, Buffer.from(capture.data, 'base64'));
  }
}
await go('/products/new');
await input('Nome', 'Rascunho');
await click('Cancelar');
check((await body()).includes('Descartar alterações?'), 'confirma cancelamento');
await click('Descartar');
await go('/products/new');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
check(
  await evaluate(
    `getComputedStyle(document.querySelector('[data-step-heading]').parentElement).animationName==='none'`
  ),
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
