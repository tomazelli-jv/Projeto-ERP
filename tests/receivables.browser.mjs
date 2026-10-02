// Regressao em navegador isolado via CDP; API simulada, sem credenciais reais.
import fs from 'node:fs';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
for (const old of await (await fetch('http://localhost:9230/json')).json()) {
  if (old.type === 'page' && old.url.includes('/financial/receivables'))
    await fetch(`http://localhost:9230/json/close/${old.id}`);
}
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
    `(()=>{const b=[...document.querySelectorAll('main button, main a'),...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
  );
  await delay(1200);
};
const input = async (label, value) => {
  await evaluate(
    `(()=>{const l=[...(document.querySelector('[role="dialog"]')??document).querySelectorAll('label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)}));const i=document.getElementById(l.htmlFor);Object.getOwnPropertyDescriptor(i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`
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
const native=fetch;const token=()=>btoa('{}')+'.'+btoa(JSON.stringify({sub:'receivables-test',sid:'session-test',...(scenario==='none'?{}:{funcionarioId:1,empresaId:1,lojaId:window.dashTest.store})}))+'.test';
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
// Testes de interface com sessão e CEP isolados; Clientes usa seu repository real, sem HTTP simulado.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
const original=window.fetch;window.fetch=(url,options)=>String(url).startsWith('https://viacep.com.br/')?Promise.resolve(new Response(JSON.stringify({cep:'77800-000',logradouro:'Rua de teste',bairro:'Bairro de teste',localidade:'Palmas',uf:'TO'}))):original(url,options);
`
});
const body = () => evaluate('document.body.innerText');
const go = async (path) => {
  await send('Page.navigate', { url: 'http://localhost:5173' + path });
  for (let attempt = 0; attempt < 60; attempt++) {
    await delay(150);
    if (
      await evaluate("!!document.querySelector('main h1') && !document.body.innerText.includes('Carregando')")
    )
      break;
  }
  await waitFor(
    `!!document.querySelector('main tbody') || document.body.innerText.includes('Nenhum título a receber encontrado.') || document.body.innerText.includes('Nenhum registro foi apagado')`
  );
};
const waitFor = async (expression) => {
  for (let i = 0; i < 50; i++) {
    if (await evaluate(expression)) return;
    await delay(150);
  }
  throw Error('Tempo excedido: ' + expression);
};
const select = async (label, option) => {
  await evaluate(
    `(()=>{const label=[...document.querySelectorAll('label,p')].find(e=>e.textContent.replaceAll('*','').trim()===${JSON.stringify(label)});const field=label.htmlFor?document.getElementById(label.htmlFor):document.querySelector('[aria-labelledby~="'+label.id+'"]');field.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));})()`
  );
  await delay(100);
  await evaluate(
    `(()=>{const o=[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent===${JSON.stringify(option)});if(!o)throw Error('Opcao ausente');o.click();})()`
  );
  await delay(400);
};
// Usa storage dedicado ao usuário de teste; não modifica cadastros da sessão real.
await viewport(1440, 900);
await go('/financial/receivables');
await evaluate(`(()=>{
 const customer={type:'PERSON',status:'ACTIVE',name:'Cliente Teste Financeiro',document:'52998224725',address:{},financial:{allowReceivables:true,creditLimit:0}};
 localStorage.setItem('erp.dev.customers.v1:'+JSON.stringify(['receivables-test',1]),JSON.stringify([
 {...customer,id:'test-enabled'}, {...customer,id:'test-inactive',name:'Cliente Inativo',status:'INACTIVE'},
 {...customer,id:'test-disabled',name:'Cliente Sem Permissao',financial:{allowReceivables:false}},
 {...customer,id:'test-company',type:'COMPANY',name:'',tradeName:'Empresa Alfanumerica',document:'12ABC34501DE35'}]));
 localStorage.setItem('erp.dev.receivables.v1:'+JSON.stringify(['receivables-test',1,1]),JSON.stringify({version:1,titles:[],payments:[],history:[]}));
})()`);
await go('/financial/receivables');
check((await body()).includes('Demonstração local'), 'banner DEV');
await waitFor(`document.body.innerText.includes('Nenhum título a receber encontrado.')`);
check((await body()).includes('Nenhum título a receber encontrado.'), 'estado vazio');
const chooseCustomer = async (query, name) => {
  await input('Cliente', query);
  await delay(200);
  await evaluate(
    `(()=>{const o=[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent.includes(${JSON.stringify(name)}));if(!o)throw Error('Cliente ausente');o.click()})()`
  );
  await delay(150);
};
const action = async (label, document) => {
  await evaluate(`document.querySelector('button[aria-label="${label} ${document}"]').click()`);
  await delay(700);
};
await click('Novo título');
await click('Cadastrar título');
check((await body()).includes('valor total maior que zero'), 'valor obrigatório');
await input('Valor total', '100,00');
await input('Primeiro vencimento', '2027-01-31');
await click('Cadastrar título');
check((await body()).includes('Selecione o cliente.'), 'cliente obrigatório');
await input('Cliente', 'Cliente');
await delay(150);
const options = await evaluate(
  `Array.from(document.querySelectorAll('[role="option"]')).map(e=>e.textContent).join(' ')`
);
check(
  options.includes('Cliente Teste Financeiro') &&
    !options.includes('Cliente Inativo') &&
    !options.includes('Cliente Sem Permissao'),
  'somente clientes elegíveis'
);
await chooseCustomer('529.982', 'Cliente Teste Financeiro');
await click('Cadastrar título');
check((await body()).includes('Informe a descrição.'), 'descrição obrigatória');
await input('Descrição', 'Parcelamento browser');
await input('Documento', 'BROWSER-3');
await input('Número de parcelas', '3');
check(
  (await body()).includes('28/02/2027') && (await body()).includes('31/03/2027'),
  'datas mensais na prévia'
);
check((await body()).includes('33,34'), 'centavo na última parcela');
await click('Cadastrar título');
check((await body()).includes('Título cadastrado.'), 'criação parcelada');
check(await evaluate(`document.querySelectorAll('main tbody tr').length===3`), 'três parcelas na lista');
await go('/financial/receivables');
check(await evaluate(`document.querySelectorAll('main tbody tr').length===3`), 'persistência após refresh');
await action('Receber', 'BROWSER-3');
await input('Valor da baixa', '40,00');
await select('Forma de pagamento', 'PIX');
await click('Confirmar recebimento');
check((await body()).includes('não superar o saldo atual'), 'sobrepagamento bloqueado');
await input('Valor da baixa', '10,00');
await input('Desconto', '1,00');
await input('Juros', '0,20');
await input('Multa', '0,10');
check((await body()).includes('9,30'), 'total dinâmico');
await click('Confirmar recebimento');
check(
  (await body()).includes('Recebimento registrado.') &&
    (await body()).includes('Parcial') &&
    (await body()).includes('23,33'),
  'baixa parcial e saldo'
);
await action('Cancelar título', 'BROWSER-3');
check((await body()).includes('não pode ser cancelado sem estorno'), 'cancelamento de parcial bloqueado');
await click('Voltar');
await action('Editar', 'BROWSER-3');
check(
  await evaluate(
    `Array.from(document.querySelector('[role="dialog"]').querySelectorAll('input:disabled')).length>=3`
  ),
  'cliente emissão e valor bloqueados após baixa'
);
await input('Descrição', 'Descrição editada');
await click('Salvar alterações');
check((await body()).includes('Título atualizado.'), 'edição');
await action('Receber', 'BROWSER-3');
await select('Forma de pagamento', 'Dinheiro');
await click('Confirmar recebimento');
check((await body()).includes('Recebido'), 'baixa total');
await action('Visualizar', 'BROWSER-3');
check((await body()).includes('Descrição editada'), 'dados no detalhe');
await click('Recebimentos');
check((await body()).includes('PIX') && (await body()).includes('Dinheiro'), 'recebimentos reais exibidos');
await click('Histórico');
check(
  (await body()).includes('Título criado') &&
    (await body()).includes('Título editado') &&
    (await body()).includes('Recebimento registrado'),
  'histórico real'
);
await click('Fechar');
await click('Novo título');
await chooseCustomer('12.ABC', 'Empresa Alfanumerica');
await input('Descrição', 'Cancelar browser');
await input('Documento', 'CANCELAR');
await input('Valor total', '50,00');
await click('Cadastrar título');
check((await body()).includes('Vencimento inválido'), 'vencimento obrigatório');
await input('Primeiro vencimento', '2027-02-01');
await click('Cadastrar título');
check((await body()).includes('Título cadastrado.'), 'uma parcela com CNPJ alfanumérico');
await action('Cancelar título', 'CANCELAR');
await click('Cancelar título');
check((await body()).includes('Título cancelado.'), 'cancelamento sem recebimento');
await select('Status', 'Cancelado');
check(await evaluate(`document.querySelectorAll('main tbody tr').length===1`), 'filtro status');
await click('Limpar filtros');
await select('Filtro', 'Descrição');
await input('Busca', 'Descrição editada');
for (let i = 0; i < 40; i++) {
  await delay(150);
  if (
    await evaluate(
      `document.querySelectorAll('main tbody tr').length===1 && document.querySelector('main tbody').innerText.includes('Descrição editada')`
    )
  )
    break;
}
check(await evaluate(`document.querySelectorAll('main tbody tr').length===1`), 'busca descrição');
await click('Limpar filtros');
await select('Filtro', 'Vencimento');
await input('Vencimento inicial', '2027-03-01');
await delay(400);
check(await evaluate(`document.querySelectorAll('main tbody tr').length===1`), 'filtro vencimento');
await click('Limpar filtros');
await select('Filtro', 'Período de recebimentos');
await input('Recebimentos de', '2026-01-01');
await input('Recebimentos até', '2026-12-31');
await delay(300);
check((await body()).includes('32,63'), 'card soma recebimentos líquidos');
// Inclui mais parcelas para exercitar paginação sem depender dos registros anteriores.
await click('Novo título');
await chooseCustomer('Cliente Teste', 'Cliente Teste Financeiro');
await input('Descrição', 'Paginação');
await input('Valor total', '60,00');
await input('Primeiro vencimento', '2027-04-10');
await input('Número de parcelas', '6');
await click('Cadastrar título');
await select('Itens por página', '5');
check(await evaluate(`document.querySelectorAll('main tbody tr').length===5`), 'paginação tamanho');
await evaluate(`document.querySelector('button[aria-label="Go to page 2"]').click()`);
await delay(500);
check(await evaluate(`document.querySelectorAll('main tbody tr').length===5`), 'segunda página');
for (const mode of ['light', 'dark']) {
  await evaluate(
    `localStorage.setItem('erp.themeMode','${mode}');window.dispatchEvent(new StorageEvent('storage',{key:'erp.themeMode'}))`
  );
  for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
    await viewport(width, width < 800 ? 844 : 900);
    check(
      await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),
      `lista sem overflow ${mode} ${width}`
    );
  }
  await viewport(1366, 768);
  await click('Novo título');
  check(
    await evaluate(
      `(()=>{const d=document.querySelector('[role="dialog"]').getBoundingClientRect();return d.left>=0&&d.right<=innerWidth&&d.height<=innerHeight})()`
    ),
    `modal ${mode}`
  );
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync(
    `tmp/receivables-${mode}.png`,
    Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64')
  );
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await delay(300);
  check(await evaluate(`!document.querySelector('[role="dialog"]')`), `Escape ${mode}`);
}
await evaluate(
  `localStorage.setItem('erp.dev.receivables.v1:'+JSON.stringify(['receivables-test',1,1]),'{}')`
);
await go('/financial/receivables');
check((await body()).includes('Nenhum registro foi apagado'), 'erro de storage visível');
check(
  await evaluate(
    `window.dashTest.calls.every(c=>c.path.startsWith('/api/auth/')||c.path==='/api/FuncionarioLoja/minhasLojas')`
  ),
  'nenhum endpoint financeiro inventado'
);
await evaluate(
  `Object.keys(localStorage).filter(k=>k.includes('receivables-test')).forEach(k=>localStorage.removeItem(k))`
);
console.log(`${checks} verificacoes passaram`);
ws.close();
