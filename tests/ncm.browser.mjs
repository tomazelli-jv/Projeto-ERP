// Regressao em navegador isolado via CDP; API simulada, sem credenciais reais.
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
    `(()=>{const b=[...([...document.querySelectorAll('[role=dialog]')].at(-1)?.querySelectorAll('button,a') ?? document.querySelectorAll('button,a'))].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
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
const native=fetch;const token=()=>btoa('{}')+'.'+btoa(JSON.stringify({sub:'ncm-browser-test',sid:'session-test',...(scenario==='none'?{}:{funcionarioId:1,empresaId:1,lojaId:window.dashTest.store})}))+'.test';
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
};
const select = async (label, option) => {
  await evaluate(
    `(()=>{const label=[...document.querySelectorAll('label')].find(e=>e.textContent.replaceAll('*','').trim()===${JSON.stringify(label)});const field=document.getElementById(label.htmlFor);field.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));})()`
  );
  await delay(100);
  await evaluate(
    `(()=>{const o=[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent===${JSON.stringify(option)});if(!o)throw Error('Opcao ausente');o.click();})()`
  );
  await delay(400);
};

await viewport(1440, 900);
await go('/dashboard');
await delay(500);
await evaluate(
  `Object.keys(localStorage).filter(k=>k.startsWith('erp.dev.ncm.v1:') && JSON.parse(k.slice('erp.dev.ncm.v1:'.length))[0]==='ncm-browser-test').forEach(k=>localStorage.removeItem(k))`
);
const openNcm = async () => {
  const mobile = await evaluate(`!!document.querySelector('button[aria-label="Abrir navegação"]')`);
  if (mobile) {
    await evaluate(`document.querySelector('button[aria-label="Abrir navegação"]').click()`);
    await delay(180);
    await evaluate(
      `[...document.querySelectorAll('nav button')].find(e=>e.textContent==='Produtos').click()`
    );
  } else await evaluate(`document.querySelector('nav button[aria-label="Produtos"]').click()`);
  await delay(180);
  await evaluate(
    `[...document.querySelectorAll('nav button')].filter(e=>e.textContent==='Cadastros').at(-1).click()`
  );
  await delay(180);
  await evaluate(
    `[...document.querySelectorAll('nav button')].find(e=>e.textContent.startsWith('NCM')).click()`
  );
  await delay(300);
};
const dialogText = () => evaluate(`document.querySelector('[aria-labelledby="ncm-title"]').innerText`);
await openNcm();
check((await dialogText()).includes('Consulta de NCM'), 'abre consulta');
check(await evaluate(`location.pathname==='/dashboard'`), 'preserva rota');
check(
  await evaluate(`document.querySelectorAll('[aria-labelledby="ncm-title"] th').length===4`),
  'quatro colunas sem código duplicado'
);
await input('Dados a pesquisar', '3305');
await delay(200);
check((await dialogText()).includes('xampus'), 'busca código');
await select('Pesquisar por', 'Descrição');
await input('Dados a pesquisar', 'zero inicial');
await delay(200);
check((await dialogText()).includes('00000001'), 'busca descrição');
await input('Dados a pesquisar', '');
await delay(200);
await click('Novo');
await click('Cadastrar NCM');
check((await dialogText()).includes('Informe o código'), 'código obrigatório');
await input('Código NCM', 'abc');
check(
  await evaluate(`document.querySelector('[aria-labelledby="ncm-title"] input').value===''`),
  'rejeita letras'
);
await input('Código NCM', '123');
await click('Cadastrar NCM');
check((await dialogText()).includes('exatamente 8 dígitos'), 'oito dígitos');
await input('Código NCM', '00000012');
await click('Cadastrar NCM');
check((await dialogText()).includes('Informe a descrição'), 'descrição obrigatória');
await input('Descrição', 'Teste com zero');
await click('Cadastrar NCM');
check((await dialogText()).includes('00000012'), 'preserva zero e cria');
check((await dialogText()).includes('Ativo'), 'ativo por padrão');
await click('Novo');
await input('Código NCM', '00000012');
await input('Descrição', 'Duplicado');
await click('Cadastrar NCM');
check((await dialogText()).includes('Já existe um cadastro'), 'duplicidade');
await click('Voltar');
check((await dialogText()).includes('Consulta de NCM'), 'volta');
await evaluate(`document.querySelector('button[aria-label="Editar 00000012"]').click()`);
await delay(200);
await input('Descrição', 'Descrição editada');
await click('Salvar alterações');
check((await dialogText()).includes('Descrição editada'), 'edita');
await evaluate(`document.querySelector('button[aria-label="Inativar 33051000"]').click()`);
await delay(200);
check((await body()).includes('Inativar NCM?'), 'confirma');
await evaluate(`document.querySelector('[aria-labelledby="confirm-dialog-title"] button').click()`);
await delay(400);
check(!(await body()).includes('Inativar NCM?'), 'cancela confirmação');
await evaluate(`document.querySelector('button[aria-label="Inativar 33051000"]').click()`);
await delay(200);
await click('Inativar');
check((await dialogText()).includes('Inativo'), 'inativa');
await click('Cancelar');
check(await evaluate(`!document.querySelector('#ncm-title')`), 'fecha');
await go('/products/new');
await delay(400);
await evaluate(
  `(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent==='NCM');document.getElementById(l.htmlFor).dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));})()`
);
await delay(200);
check(
  await evaluate(
    `![...document.querySelectorAll('[role="option"]')].some(e=>e.textContent.startsWith('33051000'))`
  ),
  'novo produto sem inativo'
);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
await delay(200);
// Prepara apenas o catálogo da identidade simulada para exercitar referência histórica sem ID.
await evaluate(
  `(async()=>{const {createMockProductsRepository}=await import('/src/features/products/mockProductsRepository.js');const r=createMockProductsRepository({key:'erp.dev.products.v1:'+JSON.stringify(['ncm-browser-test',1]),storage:localStorage});const p=await r.getById('demo-product-1');await r.update(p.id,{...p,ncm:'33051000'});})()`
);
await go('/products/demo-product-1/edit');
await delay(400);
check((await body()).includes('33051000 — Demonstração — xampus (inativo)'), 'existente preserva inativo');
await openNcm();
await evaluate(`document.querySelector('button[aria-label="Ativar 33051000"]').click()`);
await delay(300);
check(!(await dialogText()).includes('Inativo'), 'reativa');
await click('Cancelar');
await go('/products/new');
await delay(400);
await input('Nome', 'Rascunho NCM');
await evaluate(`document.querySelector('button[aria-label="Cadastrar NCM"]').click()`);
await delay(200);
await click('Novo');
await input('Código NCM', '00000099');
await evaluate(
  `(()=>{const d=document.querySelector('[aria-labelledby="ncm-title"]');const l=[...d.querySelectorAll('label')].find(e=>e.textContent.startsWith('Descrição'));const i=document.getElementById(l.htmlFor);Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(i,'Cadastro rápido');i.dispatchEvent(new Event('input',{bubbles:true}));})()`
);
await click('Cadastrar NCM');
await click('Cancelar');
await select('NCM', '00000099 — Cadastro rápido');
check((await body()).includes('00000099 — Cadastro rápido'), 'cadastro rápido selecionável');
check(
  await evaluate(`[...document.querySelectorAll('input')].some(e=>e.value==='Rascunho NCM')`),
  'preserva rascunho'
);
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  await go('/dashboard');
  await delay(400);
  for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
    await viewport(width, 900);
    await openNcm();
    check(
      await evaluate(
        `(()=>{const r=document.querySelector('[aria-labelledby="ncm-title"]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})()`
      ),
      `dialog ${mode} ${width}`
    );
    await click('Cancelar');
  }
}
await openNcm();
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
await delay(400);
check(await evaluate(`!document.querySelector('#ncm-title')`), 'Escape');
console.log(`${checks} verificações passaram`);
ws.close();
