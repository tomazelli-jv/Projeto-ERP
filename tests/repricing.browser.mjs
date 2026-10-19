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
const native=fetch;const token=()=>btoa('{}')+'.'+btoa(JSON.stringify({sub:'repricing-test',sid:'session-test',...(scenario==='none'?{}:{funcionarioId:1,empresaId:1,lojaId:window.dashTest.store})}))+'.test';
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

// Usa os repositories reais, com identidade isolada e apenas autenticação simulada.
await viewport(1440, 900);
await go('/products/repricing');
await evaluate(`(async()=>{
  const {createMockProductsRepository,productFixtures}=await import('/src/features/products/mockProductsRepository.js');
  const {createMockGroupsRepository}=await import('/src/features/product-groups/mockGroupsRepository.js');
  const {createMockBrandsRepository}=await import('/src/features/brands/mockBrandsRepository.js');
  const owner=JSON.stringify(['repricing-test',1]);
  for(const name of ['products','product-groups','brands'])localStorage.removeItem('erp.dev.'+name+'.v1:'+owner);
  const group=await createMockGroupsRepository({storage:localStorage,key:'erp.dev.product-groups.v1:'+owner}).create({name:'Grupo teste',description:'',active:true});
  const brand=await createMockBrandsRepository({storage:localStorage,key:'erp.dev.brands.v1:'+owner}).create({name:'Marca teste',cnpj:'',contact:'',active:true});
  const rows=productFixtures(); rows[0].groupId=group.id;rows[0].category=group.name;rows[0].brandId=brand.id;rows[0].brand=brand.name;
  for(let i=4;i<=14;i++)rows.push({...rows[2],id:'price-test-'+i,code:'T'+i,name:'Produto teste '+i});
  localStorage.setItem('erp.dev.products.v1:'+owner,JSON.stringify(rows));
})()`);
await go('/products/repricing');
const tick = async (label) => {
  await evaluate(
    `(()=>{const e=[...document.querySelectorAll('input[type=checkbox]')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)}&&e.getClientRects().length);if(!e||e.disabled)throw Error('Checkbox indisponivel');e.click()})()`
  );
  await delay(250);
};
const stored = () =>
  evaluate(`JSON.parse(localStorage.getItem('erp.dev.products.v1:'+JSON.stringify(['repricing-test',1])))`);
check((await body()).includes('Remarcação de preços'), 'rota dedicada');
check(!(await body()).includes('Aplicar alterações'), 'sem confirmação antes da prévia');
await select('Filtro', 'Código de barras');
await input('Pesquisa', '00012345678905');
await delay(400);
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro GTIN');
await tick('Selecionar Refrigerante demonstração 2L');
await click('Limpar filtros');
check((await body()).includes('1 produtos selecionados'), 'seleção mantida ao limpar filtros');
await select('Filtro', 'Código');
await input('Pesquisa', '0003');
await delay(400);
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro código');
await tick('Selecionar Shampoo demonstração');
await click('Limpar filtros');
await select('Grupo', 'Grupo teste');
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro grupo real');
await select('Marca', 'Marca teste');
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro marca real');
await click('Limpar filtros');
await input('Pesquisa', 'Óleo');
await select('Status', 'Inativos');
check(
  await evaluate(`document.querySelector('tbody input[type=checkbox]').disabled`),
  'inativo não selecionável'
);
await click('Limpar filtros');
await click('Limpar seleção');
await tick('Selecionar todos os produtos visíveis');
check((await body()).includes('10 produtos selecionados'), 'selecionar somente página atual');
await click('Próxima');
check((await body()).includes('10 produtos selecionados'), 'seleção entre páginas');
await tick('Selecionar todos os produtos visíveis');
check((await body()).includes('13 produtos selecionados'), 'seleção múltipla de páginas');
await click('Limpar seleção');
await click('Anterior');
await tick('Selecionar Refrigerante demonstração 2L');
await tick('Selecionar Shampoo demonstração');
await input('Valor do ajuste', '5');
check((await stored())[0].priceCents === 950, 'digitar não persiste');
await click('Gerar prévia');
check((await body()).includes('Com alteração: 2'), 'resumo da prévia');
check((await stored())[0].priceCents === 950, 'prévia não persiste');
await input('Novo preço de Refrigerante', '0');
await delay(200);
check(!(await body()).includes('Aplicar alterações'), 'preço zero bloqueia confirmação');
await input('Novo preço de Refrigerante', '10,49');
await delay(200);
check((await body()).includes('Ajustado manualmente'), 'edição individual indicada');
await click('Aplicar alterações');
check(await evaluate(`Boolean(document.querySelector('[role=dialog]'))`), 'confirmação separada');
check((await stored())[0].priceCents === 950, 'abrir confirmação não persiste');
await click('Voltar');
check((await body()).includes('Ajustado manualmente'), 'voltar preserva prévia');
await click('Aplicar alterações');
await click('Confirmar remarcação');
check((await body()).includes('2 produtos foram remarcados com sucesso.'), 'feedback do lote');
check((await stored())[0].priceCents === 1049, 'lote persistido no catálogo');
check((await body()).includes('0 produtos selecionados'), 'limpa seleção após sucesso');
check(
  await evaluate(`document.querySelector('tbody').innerText.includes('10,49')`),
  'invalidação atualiza listagem'
);
await go('/products');
check(
  await evaluate(`document.querySelector('tbody').innerText.includes('10,49')`),
  'consulta recebe novo preço'
);
await go('/products/repricing');
await tick('Selecionar Refrigerante demonstração 2L');
await select('Tipo de ajuste', 'Valor');
await input('Valor do ajuste', '-1,00');
await click('Gerar prévia');
check((await body()).includes('Reduções: 1'), 'redução por valor');
await select('Tipo de ajuste', 'Definir preço');
check(!(await body()).includes('Aplicar alterações'), 'mudar regra invalida prévia');
await input('Valor do ajuste', '10,49');
await click('Gerar prévia');
check((await body()).includes('Sem alteração: 1'), 'sem alteração não aplica');
await input('Valor do ajuste', '9,99');
await click('Gerar prévia');
await evaluate(
  `(async()=>{const {createMockProductsRepository}=await import('/src/features/products/mockProductsRepository.js');await createMockProductsRepository({storage:localStorage,key:'erp.dev.products.v1:'+JSON.stringify(['repricing-test',1])}).updatePrices([{productId:'demo-product-1',previousPriceCents:1049,newPriceCents:1200}]);})()`
);
await click('Aplicar alterações');
await click('Confirmar remarcação');
check((await body()).includes('foi alterado depois'), 'conflito visível');
check((await stored())[0].priceCents === 1200, 'não sobrescreve conflito');
await click('Voltar');
await click('Gerar prévia');
await click('Aplicar alterações');
await click('Confirmar remarcação');
check((await stored())[0].priceCents === 999, 'regenerar permite confirmar');

for (const mode of ['light', 'dark']) {
  await evaluate(
    `localStorage.setItem('erp.themeMode','${mode}');window.dispatchEvent(new StorageEvent('storage',{key:'erp.themeMode'}))`
  );
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 900],
    [768, 1024],
    [390, 844]
  ]) {
    await viewport(width, height);
    check(
      await evaluate(`document.documentElement.scrollWidth<=innerWidth`),
      'responsivo ' + mode + ' ' + width
    );
  }
  await viewport(1440, 900);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tmp/repricing-' + mode + '.png', Buffer.from(shot.data, 'base64'));
}
await viewport(390, 844);
await tick('Selecionar Refrigerante demonstração 2L');
await input('Valor do ajuste', '20,00');
await click('Gerar prévia');
await click('Aplicar alterações');
check(
  await evaluate(`document.querySelector('[role=dialog]').getBoundingClientRect().width<=innerWidth`),
  'confirmação mobile'
);
await click('Voltar');
await click('Limpar seleção');
await input('Pesquisa', 'inexistente-zzzz');
await delay(400);
check((await body()).includes('Nenhum produto encontrado.'), 'estado vazio');
check(
  await evaluate(`window.dashTest.calls.every(c=>!c.path.toLowerCase().includes('product'))`),
  'sem endpoints inventados'
);
console.log(checks + ' verificacoes passaram');
ws.close();
