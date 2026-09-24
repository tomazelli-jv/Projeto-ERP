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
    `(()=>{const b=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
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

// Testes de interface com sessão e CEP isolados; Clientes usa seu repository real, sem HTTP simulado.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
const original=window.fetch;window.fetch=(url,options)=>String(url).startsWith('https://viacep.com.br/')?Promise.resolve(new Response(JSON.stringify({cep:'77800-000',logradouro:'Rua de teste',bairro:'Bairro de teste',localidade:'Palmas',uf:'TO'}))):original(url,options);
`
});
const body = () => evaluate('document.body.innerText');
const go = async (path) => {
  await send('Page.navigate', { url: 'http://localhost:5173' + path });
  await delay(1600);
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
await viewport(1440, 900);
await go('/customers');
await evaluate(
  `Object.keys(localStorage).filter(k=>k.startsWith('erp.dev.customers.v1:')&&k.includes('dashboard-test')).forEach(k=>localStorage.removeItem(k))`
);
await go('/customers');
check((await body()).includes('Demonstração local'), 'mock identificado');
check(await evaluate(`document.querySelectorAll('tbody tr').length===4`), 'listagem');
await input('Buscar cliente', '12.ABC.345/01DE-35');
await delay(700);
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'busca CNPJ');
await click('Limpar filtros');
await select('Tipo', 'Pessoa Física');
check(await evaluate(`document.querySelectorAll('tbody tr').length===2`), 'filtro PF');
await select('Tipo', 'Pessoa Jurídica');
check(await evaluate(`document.querySelectorAll('tbody tr').length===2`), 'filtro PJ');
await select('Status', 'Inativos');
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'filtro inativo');
await click('Limpar filtros');
await input('Buscar cliente', 'nenhum resultado xyz');
await delay(700);
check((await body()).includes('Nenhum cliente encontrado com os filtros informados.'), 'sem resultados');
await click('Limpar filtros');
await click('Novo cliente');
await input('Nome completo', 'Pessoa teste browser');
await input('CPF', '12345678900');
await click('Cadastrar cliente');
check((await body()).includes('CPF inválido'), 'CPF inválido mantém rascunho');
await input('CPF', '12345678909');
await input('Número', '42');
await input('Complemento', 'Sala teste');
await input('CEP', '77800000');
await delay(600);
check(
  await evaluate(
    `document.querySelector('input[value="Rua de teste"]')!==null && document.querySelector('input[value="42"]')!==null`
  ),
  'CEP preenche e preserva número'
);
await click('Cadastrar cliente');
check((await body()).includes('Cliente cadastrado com sucesso.'), 'criação PF');
await go('/customers');
check((await body()).includes('Pessoa teste browser'), 'persistência após refresh');
await click('Novo cliente');
await select('Tipo de cliente', 'Pessoa Jurídica');
await input('Razão social', 'Empresa teste browser');
await input('CNPJ', '11444777000161');
await click('Cadastrar cliente');
check((await body()).includes('Cliente cadastrado com sucesso.'), 'criação PJ');
await select('Por página', '5');
check(await evaluate(`document.querySelectorAll('tbody tr').length===5`), 'página 1');
await click('Próxima');
check(await evaluate(`document.querySelectorAll('tbody tr').length===1`), 'página 2');
await click('Anterior');
await input('Buscar cliente', 'Pessoa teste browser');
await delay(700);
await evaluate(`document.querySelector('button[aria-label^="Inativar cliente Pessoa teste"]').click()`);
await delay(200);
await click('Inativar');
check((await body()).includes('Cliente inativado com sucesso.'), 'inativação');
await click('Fechar');
await evaluate(`document.querySelector('button[aria-label^="Ativar cliente Pessoa teste"]').click()`);
await delay(200);
await click('Ativar');
check((await body()).includes('Cliente ativado com sucesso.'), 'reativação');
await click('Fechar');
await evaluate(`document.querySelector('a[aria-label^="Visualizar cliente Pessoa teste"]').click()`);
await delay(500);
check((await body()).includes('Perfil do cliente') && (await body()).includes('Sala teste'), 'detalhe');
await click('Editar cliente');
await input('Nome completo', 'Pessoa teste editada');
await click('Salvar alterações');
check((await body()).includes('Cliente atualizado com sucesso.'), 'edição');
await click('Novo cliente');
await input('Nome completo', 'Duplicado');
await input('CPF', '12345678909');
await click('Cadastrar cliente');
check((await body()).includes('Já existe um cliente com este documento.'), 'duplicado amigável');
for (const mode of ['light', 'dark']) {
  await evaluate(
    `localStorage.setItem('erp.themeMode','${mode}');window.dispatchEvent(new StorageEvent('storage',{key:'erp.themeMode'}))`
  );
  for (const width of [1920, 1440, 1366, 1024, 768]) {
    await viewport(width, 900);
    check(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      'form responsivo ' + mode + ' ' + width
    );
  }
  await viewport(1440, 900);
  await send('Page.captureScreenshot', { format: 'png' }).then((r) =>
    fs.writeFileSync('tmp/customers-form-' + mode + '.png', Buffer.from(r.data, 'base64'))
  );
  await go('/customers');
  for (const width of [1920, 1440, 1366, 1024, 768]) {
    await viewport(width, 900);
    check(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      'lista responsiva ' + mode + ' ' + width
    );
  }
  await viewport(1440, 900);
  await send('Page.captureScreenshot', { format: 'png' }).then((r) =>
    fs.writeFileSync('tmp/customers-list-' + mode + '.png', Buffer.from(r.data, 'base64'))
  );
  await go('/customers/new');
}
// Estados vazios/erro e animações reutilizadas também são verificados sem tocar dados reais.
await go('/customers/demo-pj-1');
check((await body()).includes('12.ABC.345/01DE-35'), 'perfil CNPJ alfanumérico');
for (const mode of ['light', 'dark']) {
  await evaluate(
    `localStorage.setItem('erp.themeMode','${mode}');window.dispatchEvent(new StorageEvent('storage',{key:'erp.themeMode'}))`
  );
  for (const width of [1920, 1440, 1366, 1024, 768]) {
    await viewport(width, 900);
    check(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      'perfil responsivo ' + mode + ' ' + width
    );
  }
}
await go('/customers/new');
check(
  await evaluate(`getComputedStyle(document.querySelector('.create-label')).transitionDuration==='0.5s'`),
  'animação de criação reutilizada'
);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
check(
  await evaluate(`getComputedStyle(document.querySelector('.create-label')).transitionDuration==='0s'`),
  'movimento reduzido'
);
await evaluate(`window.fetch=()=>Promise.reject(new Error('Falha de CEP simulada'))`);
await input('CEP', '01001000');
await delay(700);
check(
  (await body()).includes('Preencha o endereço manualmente.'),
  'falha de CEP permite preenchimento manual'
);
await input('Logradouro', 'Endereço manual');
check(
  await evaluate(`!!document.querySelector('input[value="Endereço manual"]')`),
  'endereço manual editável'
);
await evaluate(`localStorage.setItem('erp.dev.customers.v1:'+JSON.stringify(['dashboard-test',1]),'[]')`);
await go('/customers');
check((await body()).includes('Nenhum cliente cadastrado.'), 'lista vazia');
await evaluate(
  `localStorage.setItem('erp.dev.customers.v1:'+JSON.stringify(['dashboard-test',1]),'{corrompido')`
);
await go('/customers');
check(
  (await body()).includes('Não foi possível ler os clientes de demonstração'),
  'erro do repository visível'
);
await evaluate(`localStorage.removeItem('erp.dev.customers.v1:'+JSON.stringify(['dashboard-test',1]))`);
await go('/customers/inexistente');
check((await body()).includes('Cliente não encontrado.'), 'não encontrado');
check(
  await evaluate(`window.dashTest.calls.every(c=>!c.path.toLowerCase().includes('customer'))`),
  'nenhum endpoint Clientes inventado'
);
await evaluate(
  `Object.keys(localStorage).filter(k=>k.startsWith('erp.dev.customers.v1:')&&k.includes('dashboard-test')).forEach(k=>localStorage.removeItem(k))`
);
console.log(checks + ' verificacoes passaram');
ws.close();
