// Browser integration checks use an isolated CDP target and intercepted API responses only.
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
await send('Emulation.setDeviceMetricsOverride', {
  width: 1366,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false
});

// The fixtures never leave this isolated tab; no backend writes or real tokens are involved.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
const scenario = new URLSearchParams(location.search).get('case') || 'full';
window.employeeTest = { calls: [], store: 1, created: null };
const nativeFetch = window.fetch;
let records = Array.from({length: 25}, (_, i) => ({ id: i+1, nome: 'Colaborador '+(i+1), userName: 'user'+(i+1), email: 'user'+(i+1)+'@example.invalid', ativo: true, idVinculosLoja: [99] }));
const permissions = scenario === 'none' ? [] : scenario === 'read' ? 'Funcionario.Visualizar' : ['Funcionario.Visualizar','Funcionario.Criar','Funcionario.Atualizar'];
const token = () => btoa('{}')+'.'+btoa(JSON.stringify({sub:'fixture',sid:'fixture-session',empresaId:1,funcionarioId:1,lojaId:window.employeeTest.store,Permissao:permissions}))+'.fixture';
const respond = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json'}});
window.fetch = async (url, options={}) => {
 if (!String(url).startsWith('http://localhost:5054/api')) return nativeFetch(url,options);
 const u = new URL(url), method = options.method || 'GET';
 window.employeeTest.calls.push({path:u.pathname,query:u.search,method,credentials:options.credentials,headers:Object.keys(options.headers||{})});
 if(u.pathname==='/api/auth/refresh') return respond({accessToken:token(),userName:'Fixture'});
 if(u.pathname==='/api/auth/trocar-loja') { window.employeeTest.store=JSON.parse(options.body).lojaId; return respond({accessToken:token()}); }
 if(u.pathname==='/api/FuncionarioLoja/minhasLojas') return respond([{id:1,empresaId:1,nome:'Centro',ativo:true},{id:2,empresaId:1,nome:'Filial',ativo:true}]);
 if(u.pathname==='/api/Funcionario/paginado') {
  if(scenario==='error') return respond({},403);
  if(scenario==='loading') await new Promise(r=>setTimeout(r,5000));
  const page=Number(u.searchParams.get('pagina')), size=Number(u.searchParams.get('tamanhoPagina')), search=u.searchParams.get('busca');
  const result = scenario==='empty'?[]:records.filter(r=>r.nome.toLowerCase().includes(search.toLowerCase()));
  return respond({itens:result.slice((page-1)*size,page*size),totalRegistros:result.length,pagina:page,tamanhoPagina:0});
 }
 if(u.pathname==='/api/Funcionario' && method==='POST') {
  const body=JSON.parse(options.body); window.employeeTest.createdKeys=Object.keys(body).sort();
  const r={id:100,nome:body.nome,userName:body.userName,email:body.email,ativo:true,idVinculosLoja:[101]}; records.push(r); return respond(r,201);
 }
 if(/^\\/api\\/Funcionario\\/\\d+$/.test(u.pathname)) {
  const id=Number(u.pathname.split('/').pop()), r=records.find(x=>x.id===id);
  if(method==='PUT') { const body=JSON.parse(options.body);window.employeeTest.updatedKeys=Object.keys(body).sort();Object.assign(r,body); }
  return respond(r);
 }
 throw Error('Unexpected API '+method+' '+u.pathname);
};
`
});
const nav = async (scenario) => {
  await send('Page.navigate', { url: 'http://localhost:5173/admin/employees?case=' + scenario });
  await delay(2200);
};
const main = () => evaluate("document.querySelector('main').innerText");
const choose = async (label, text) => {
  await evaluate(
    `(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith(${JSON.stringify(label)}));const e=document.getElementById(l.htmlFor)||l.parentElement.querySelector('[role=combobox]');e.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));})()`
  );
  await delay(200);
  await evaluate(
    `[...document.querySelectorAll('[role=option]')].find(e=>e.textContent===${JSON.stringify(text)}).click()`
  );
};
await nav('none');
check((await main()).includes('Você não possui permissão'), 'sem permissão mostra aviso');
check(
  await evaluate("!employeeTest.calls.some(x=>x.path.startsWith('/api/Funcionario/'))"),
  'sem permissão não consulta funcionários'
);
await nav('read');
check(
  !(await main()).includes('Novo funcionário') && !(await main()).includes('Editar'),
  'somente leitura esconde criar e editar'
);
await click('Detalhes');
check(
  await evaluate(
    "document.querySelector('[aria-labelledby=employee-title]').textContent.includes('user1@example.invalid')"
  ),
  'consulta DTO real'
);
await click('Fechar');
await nav('full');
check(
  (await main()).includes('Colaborador 1') && (await main()).includes('1–20 de 25'),
  'lista e total servidor'
);
check((await main()).includes('A API não informou'), 'fallback tamanho sinaliza limitação');
await evaluate('document.querySelector(\'[aria-label="Próxima página"]\').click()');
await delay(700);
check((await main()).includes('Colaborador 21'), 'paginação servidor');
await input('Buscar funcionário', 'Colaborador 25');
await delay(800);
check(
  (await main()).includes('1–1 de 1') &&
    (await evaluate(
      "employeeTest.calls.some(x=>x.query.includes('pagina=1')&&x.query.includes('busca=Colaborador+25'))"
    )),
  'busca com debounce reinicia página'
);
await input('Buscar funcionário', '');
await delay(800);
await click('Editar');
check(
  await evaluate("!document.querySelector('[aria-labelledby=employee-title] input[type=password]')"),
  'edição sem senha'
);
await input('Nome', 'Nome atualizado');
await click('Salvar alterações');
await delay(500);
check((await main()).includes('Nome atualizado'), 'edição atualiza lista');
check(
  await evaluate(
    "JSON.stringify(employeeTest.updatedKeys)===JSON.stringify(['ativo','email','nome','userName'])"
  ),
  'PUT whitelist'
);
await click('Novo funcionário');
await click('Cadastrar');
check(
  await evaluate(
    "document.querySelector('[aria-labelledby=employee-title]').textContent.includes('Informe o nome')"
  ),
  'formulário valida obrigatórios'
);
await input('Nome', 'Novo teste');
await input('Usuário', 'newfixture');
await input('E-mail', 'new@example.invalid');
await input('Senha', 'fixture-password');
await choose('Tipo de usuário', 'Administrador de loja');
await choose('Loja inicial', 'Centro');
await click('Cadastrar');
await delay(600);
check(
  await evaluate(
    "JSON.stringify(employeeTest.createdKeys)===JSON.stringify(['email','idLoja','nome','senha','tipoUsuario','userName'])"
  ),
  'POST contrato oficial'
);
check(
  await evaluate("!document.querySelector('[aria-labelledby=employee-title]')"),
  'cadastro fecha formulário'
);
const before = await evaluate("employeeTest.calls.filter(x=>x.path==='/api/Funcionario/paginado').length");
await choose('Loja', 'Filial');
await delay(1000);
check((await main()).includes('Nome atualizado'), 'troca loja mantém lista empresarial');
const after = await evaluate("employeeTest.calls.filter(x=>x.path==='/api/Funcionario/paginado').length");
check(after === before, 'troca mesma empresa preserva cache');
check(
  await evaluate(
    "employeeTest.calls.every(c=>c.credentials==='include'&&!c.headers.some(h=>h.toLowerCase()==='x-loja-id'))"
  ),
  'credentials e ausência X-Loja-Id'
);
check(
  await evaluate(
    'employeeTest.calls.every(c=>!/^\\/api\\/(usuarios|funcionarios|perfis|lojas|usuarios-funcionarios)(\\/|$)/.test(c.path))'
  ),
  'nenhuma rota legada'
);
check(
  await evaluate("!JSON.stringify([localStorage,sessionStorage]).includes('fixture-password')"),
  'senha ausente de storage'
);
for (const width of [1920, 1366, 768, 390]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await delay(200);
  check(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'sem overflow global ' + width);
}
await nav('empty');
check((await main()).includes('Nenhum funcionário cadastrado'), 'empty state');
await nav('error');
check((await main()).includes('Você não possui permissão para esta operação'), '403 real da fronteira');
await nav('loading');
check(
  await evaluate('Boolean(document.querySelector(\'[aria-label="Carregando funcionários"]\'))'),
  'skeleton'
);
console.log(checks + ' verificações de navegador com API simulada.');
ws.close();
