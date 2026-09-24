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
    `(()=>{const b=[...document.querySelectorAll('button')].find(e=>(e.textContent.trim()===${JSON.stringify(text)}||e.getAttribute('aria-label')===${JSON.stringify(text)}));if(!b)throw Error('Botao ausente: '+${JSON.stringify(text)});b.click()})()`
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

// Fixtures restritas à aba CDP: nenhuma resposta simulada é incluída no produto.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: String.raw`
const scenario=new URLSearchParams(location.search).get('case')||'normal';
const token=btoa('{}')+'.'+btoa(JSON.stringify({sub:'business-fixture',empresaId:1,lojaId:1,funcionarioId:1,role:scenario==='denied'?'Vendedor':'Administrador'}))+'.test';
window.calls=[];
window.companies=[{id:1,nome:'Empresa Real Fixture',ativo:true,dataCadastro:'2026-01-01T00:00:00Z'},{id:2,nome:'Outra Empresa',ativo:false,dataCadastro:'2026-01-01T00:00:00Z'}];
window.stores=[{id:1,empresaId:1,nome:'Unidade Centro',razaoSocial:'Comercio Fixture',tipoPessoa:2,documento:'12ABC34501DE35',ativo:true,rua:'Avenida Principal',cidade:'Araguaina',uf:'TO',cep:'77800000',telefone:'63999999999',email:'loja@example.com',dataCadastro:'2026-01-01T00:00:00Z'},{id:2,empresaId:1,nome:'Unidade Norte',tipoPessoa:2,documento:'11222333000181',ativo:false}];
const nativeFetch=fetch;
window.fetch=async(url,options={})=>{
 if(!String(url).startsWith('http://localhost:5054'))return nativeFetch(url,options);
 const path=new URL(url).pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
 calls.push({path,method,body,headers:options.headers});
 const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 if(path==='/api/auth/refresh')return response({accessToken:token,userName:'Teste UI'});
 if(path==='/api/FuncionarioLoja/minhasLojas')return response([{id:1,empresaId:1,nome:'Unidade Centro',ativo:true}]);
 if(path==='/api/Empresa'){
  if(scenario==='loading')await new Promise(r=>setTimeout(r,5000));
  if(scenario==='error')return response({},500);
  if(scenario==='forbidden')return response({},403);
  return response(scenario==='empty-company'?[]:companies);
 }
 if(path.startsWith('/api/Empresa/')){const record=companies.find(x=>String(x.id)===path.split('/').pop());if(method==='PUT')Object.assign(record,body);return response(record);}
 if(path==='/api/Loja'&&method==='GET')return response(scenario==='empty-store'?[]:stores);
 if(path==='/api/Loja'&&method==='POST'){
  if(scenario==='save-error')return response({},422);
  const value={...body,id:3,ativo:true};stores.push(value);return response(value,201);
 }
 if(path.startsWith('/api/Loja/')&&method==='PUT'){const record=stores.find(x=>String(x.id)===path.split('/').pop());Object.assign(record,body);return response(record);}
 throw Error('Endpoint inesperado '+method+' '+path);
};`
});
const go = async (scenario = 'normal') => {
  await send('Page.navigate', { url: 'http://localhost:5173/admin/companies?case=' + scenario });
  await delay(1200);
};
const body = () => evaluate('document.body.innerText');
await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false
});
await go();
check((await body()).includes('Empresa Real Fixture'), 'empresa real');
check(/Total de lojas\s+2/.test(await body()), 'quantidade real');
await input('Buscar loja por nome', 'nao-existe-fixture');
await delay(300);
check((await body()).includes('Nenhuma loja encontrada'), 'busca local mostra vazio');
check(/Total de lojas\s+2/.test(await body()), 'busca preserva total da empresa');
await click('Limpar busca');
check(await evaluate("document.querySelectorAll('tbody tr').length===2"), 'limpar busca restaura lojas');
check((await body()).includes('12.ABC.345/01DE-35'), 'CNPJ alfanumerico');
check(await evaluate("document.querySelector('table').innerText.includes('E-MAIL')"), 'tabela compacta');
check(
  await evaluate(
    "!!document.querySelector('button[aria-label=Ativar]') && !!document.querySelector('button[aria-label=Inativar]')"
  ),
  'acoes de status corretas'
);
check(!(await body()).includes('Matriz'), 'nao infere matriz pelo nome');
await click('Visualizar dados da empresa');
check((await body()).includes('Perfil da empresa'), 'detalhe empresa');
await click('Editar empresa');
await input('Nome', 'Empresa Editada');
await click('Salvar alterações');
check(
  await evaluate(
    "calls.some(x=>x.method==='PUT'&&x.path==='/api/Empresa/1'&&Object.keys(x.body).length===2)"
  ),
  'update empresa oficial'
);
await evaluate('document.querySelector(\'button[aria-label="Visualizar dados da loja"]\').click()');
await delay(200);
check(
  (await body()).includes('Perfil da loja') && (await body()).includes('loja@example.com'),
  'detalhe loja completo'
);
await click('Editar loja');
await input('Nome / Nome fantasia', 'Unidade Editada');
await click('Salvar alterações');
check(
  await evaluate(
    "calls.some(x=>x.method==='PUT'&&x.path==='/api/Loja/1'&&x.body.nome==='Unidade Editada'&&x.body.empresaId===1)"
  ),
  'update loja'
);
await click('Inativar');
check((await body()).includes('Inativar loja?'), 'confirmacao inativacao');
await click('Cancelar');
check(
  await evaluate("calls.filter(x=>x.method==='PUT'&&x.path==='/api/Loja/1').length===1"),
  'cancelar nao altera status'
);
await click('Ativar');
await evaluate(
  "[...document.querySelectorAll('[role=dialog] button')].find(x=>x.textContent==='Ativar').click()"
);
await delay(500);
check(
  await evaluate("calls.some(x=>x.method==='PUT'&&x.path==='/api/Loja/2'&&x.body.ativo===true)"),
  'ativacao por PUT'
);
await click('Inativar');
await evaluate(
  "[...document.querySelectorAll('[role=dialog] button')].find(x=>x.textContent==='Inativar').click()"
);
await delay(500);
check(
  await evaluate("calls.some(x=>x.method==='PUT'&&x.path==='/api/Loja/1'&&x.body.ativo===false)"),
  'inativacao por PUT'
);
await click('Nova loja');
await input('Nome / Nome fantasia', 'Loja Criada');
await input('CNPJ', '12.ABC.345/01DE-35');
await click('Cadastrar loja');
check(
  await evaluate(
    "calls.some(x=>x.method==='POST'&&x.path==='/api/Loja'&&x.body.documento==='12ABC34501DE35'&&x.body.empresaId===1&&!('ativo' in x.body)&&!('nomeFantasia' in x.body))"
  ),
  'create DTO oficial e alfanumerico'
);
check(/Total de lojas\s+3/.test(await body()), 'cache atualiza quantidade');
check(await evaluate("calls.every(x=>x.method!=='DELETE')"), 'nenhum DELETE');
check(await evaluate("calls.every(x=>!('X-Loja-Id' in (x.headers||{})))"), 'nenhum X-Loja-Id');
await evaluate(
  "document.querySelector('[role=combobox]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))"
);
await delay(100);
// O primeiro combobox pode pertencer ao header; seleciona explicitamente pelo label Empresa.
await send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  key: 'Escape',
  code: 'Escape',
  windowsVirtualKeyCode: 27
});
await delay(100);
await evaluate(
  "(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.textContent==='Empresa');document.getElementById(l.htmlFor).dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))})()"
);
await delay(100);
await evaluate(
  "[...document.querySelectorAll('[role=option]')].find(x=>x.textContent==='Outra Empresa').click()"
);
await delay(500);
check(
  (await body()).includes('Para consultar as lojas desta empresa'),
  'outra empresa nao exibe lojas do JWT anterior'
);
check(!(await body()).includes('Unidade Editada'), 'sem vazamento entre empresas');
for (const [scenario, text] of [
  ['empty-company', 'Nenhuma empresa disponível'],
  ['empty-store', 'Nenhuma loja cadastrada'],
  ['error', 'Não foi possível'],
  ['forbidden', 'Você não possui permissão'],
  ['denied', 'Você não possui permissão']
]) {
  await go(scenario);
  check((await body()).includes(text), scenario);
  if (scenario === 'denied')
    check(
      await evaluate("!calls.some(x=>x.path==='/api/Empresa'||x.path==='/api/Loja')"),
      'guard nao consulta API'
    );
}
await go('loading');
check(
  await evaluate('document.querySelector(\'[aria-label="Carregando empresas e lojas"]\')!==null'),
  'loading skeleton'
);
await go('save-error');
await click('Nova loja');
await input('Nome / Nome fantasia', 'Preservar');
await input('CNPJ', '12ABC34501DE35');
await click('Cadastrar loja');
check((await body()).includes('A validação não foi concluída'), 'erro mutation');
check(
  await evaluate("[...document.querySelectorAll('input')].some(x=>x.value==='Preservar')"),
  'rascunho preservado'
);
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  await go();
  for (const screen of ['list', 'detail', 'create']) {
    if (screen === 'detail') await click('Visualizar dados da empresa');
    if (screen === 'create') await click('Nova loja');
    for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width === 390
      });
      await delay(200);
      check(
        await evaluate('document.documentElement.scrollWidth<=innerWidth'),
        mode + ' ' + screen + ' ' + width
      );
    }
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false
    });
    await delay(200);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tmp/business-' + mode + '-' + screen + '.png', Buffer.from(shot.data, 'base64'));
    if (screen !== 'list') await click(screen === 'detail' ? 'Voltar para a lista' : 'Cancelar');
  }
  await evaluate('document.querySelector(\'button[aria-label="Recolher menu lateral"]\')?.click()');
  await delay(200);
  check(await evaluate('document.documentElement.scrollWidth<=innerWidth'), mode + ' sidebar mini');
  await evaluate('document.querySelector(\'button[aria-label="Expandir menu lateral"]\')?.click()');
  await delay(200);
  check(await evaluate('document.documentElement.scrollWidth<=innerWidth'), mode + ' sidebar expandida');
}
console.log(checks + ' verificacoes Empresa/Loja com API simulada');
ws.close();
