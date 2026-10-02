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
const native=fetch;const token=()=>btoa('{}')+'.'+btoa(JSON.stringify({sub:'brands-browser-test',sid:'session-test',...(scenario==='none'?{}:{funcionarioId:1,empresaId:1,lojaId:window.dashTest.store})}))+'.test';
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

// Fluxos públicos com sessão DEV isolada; somente o namespace de teste é limpo.
await viewport(1440, 900);
await go('/dashboard');
await delay(1000);
await evaluate(
  `Object.keys(localStorage).filter(key=>key.startsWith('erp.dev.brands.v1:') && JSON.parse(key.slice('erp.dev.brands.v1:'.length))[0]==='brands-browser-test').forEach(key=>localStorage.removeItem(key))`
);
const openBrands = async () => {
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
    `[...document.querySelectorAll('nav button')].filter(e=>e.textContent==='Cadastros').at(-1).click()`
  );
  await delay(200);
  await evaluate(
    `[...document.querySelectorAll('nav button')].find(e=>e.textContent.startsWith('Marcas')).click()`
  );
  await delay(400);
};
const dialogText = () => evaluate(`document.querySelector('[aria-labelledby="brands-title"]').innerText`);
await openBrands();
check((await dialogText()).includes('Consulta de marcas'), 'abre consulta');
check(await evaluate(`location.pathname==='/dashboard'`), 'mantém tela atual');
await click('Novo');
await click('Cadastrar marca');
check((await dialogText()).includes('Informe o nome'), 'nome obrigatório');
await input('Nome', 'Marca Browser');
await click('Cadastrar marca');
check((await dialogText()).includes('Marca Browser'), 'cria com opcionais vazios');
check((await dialogText()).includes('Ativa'), 'status inicial ativo');
await click('Novo');
await input('Nome', 'MARCA BROWSER');
await click('Cadastrar marca');
check((await dialogText()).includes('Já existe uma marca'), 'duplicidade');
await click('Voltar');
await click('Novo');
await input('Nome', 'Marca Alfa');
await input('CNPJ', '12.ABC.345/01DE-35');
await input('Contato', 'Equipe comercial');
await click('Cadastrar marca');
check((await dialogText()).includes('12.ABC.345/01DE-35'), 'CNPJ alfanumérico');
await input('Dados a pesquisar', 'Browser');
await delay(250);
check(!(await dialogText()).includes('Marca Alfa'), 'busca nome');
await select('Pesquisar por', 'CNPJ');
await input('Dados a pesquisar', '12ABC');
await delay(250);
check((await dialogText()).includes('Marca Alfa'), 'busca documento');
await select('Pesquisar por', 'Contato');
await input('Dados a pesquisar', 'comercial');
await delay(250);
check((await dialogText()).includes('Marca Alfa'), 'busca contato');
await input('Dados a pesquisar', '');
await delay(250);
await evaluate(`document.querySelector('button[aria-label="Editar Marca Alfa"]').click()`);
await delay(150);
await input('Nome', 'Marca Alfa Editada');
await click('Salvar alterações');
check((await dialogText()).includes('Marca Alfa Editada'), 'edita');
await evaluate(`document.querySelector('button[aria-label="Inativar Marca Alfa Editada"]').click()`);
await delay(150);
check((await body()).includes('Inativar marca?'), 'confirma inativação');
await evaluate(`document.querySelector('[aria-labelledby="confirm-dialog-title"] button').click()`);
await delay(400);
check(!(await body()).includes('Inativar marca?'), 'cancela confirmação');
await evaluate(`document.querySelector('button[aria-label="Inativar Marca Alfa Editada"]').click()`);
await delay(150);
await click('Inativar');
check((await dialogText()).includes('Inativa'), 'inativa');
await evaluate(`document.querySelector('button[aria-label="Ativar Marca Alfa Editada"]').click()`);
await delay(300);
check(!(await dialogText()).includes('Inativa'), 'reativa');
await click('Cancelar');
check(await evaluate(`!document.querySelector('#brands-title')`), 'cancela consulta');
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  await go('/dashboard');
  await delay(500);
  for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
    await viewport(width, 900);
    await openBrands();
    check(
      await evaluate(
        `(()=>{const r=document.querySelector('[aria-labelledby="brands-title"]').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1})()`
      ),
      `dialog ${mode} ${width}`
    );
    await click('Cancelar');
  }
}
await viewport(1440, 900);
await go('/products/new');
await delay(500);
await select('Marca', 'Marca Browser');
check((await body()).includes('Marca Browser'), 'produto consome marcas');
console.log(`${checks} verificações passaram`);
ws.close();
