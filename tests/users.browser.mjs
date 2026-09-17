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

// Fixture só na aba isolada: o produto usa exclusivamente endpoints reais.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: String.raw`
const scenario=new URLSearchParams(location.search).get('case')||'normal';
const permissions=scenario==='denied'?[]:scenario==='view'?['Funcionario.Visualizar']:['Funcionario.Visualizar','Funcionario.Criar','Funcionario.Atualizar'];
const token=btoa('{}')+'.'+btoa(JSON.stringify({sub:'users-fixture',empresaId:1,lojaId:1,funcionarioId:1,Permissao:permissions}))+'.test';
window.calls=[];window.rows=Array.from({length:24},(_,i)=>({id:i+1,nome:'Pessoa '+(i+1),userName:'pessoa'+(i+1),email:'pessoa'+(i+1)+'@example.com',ativo:i%2===0,idVinculosLoja:[100+i]}));
const nativeFetch=fetch;
window.fetch=async(url,options={})=>{
 if(!String(url).startsWith('http://localhost:5054'))return nativeFetch(url,options);
 const u=new URL(url),method=options.method||'GET';calls.push({path:u.pathname,query:u.search,method,body:options.body?JSON.parse(options.body):null});
 const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 if(u.pathname==='/api/auth/refresh')return response({accessToken:token,userName:'Teste UI'});
 if(u.pathname==='/api/FuncionarioLoja/minhasLojas')return response([{id:1,empresaId:1,nome:'Loja Centro',ativo:true}]);
 if(u.pathname==='/api/Funcionario/paginado'){
  if(scenario==='loading')await new Promise(r=>setTimeout(r,4000));
  if(scenario==='error')return response({},500);
  if(scenario==='forbidden')return response({},403);
  const filtered=scenario==='empty'?[]:rows.filter(x=>x.nome.toLowerCase().includes((u.searchParams.get('busca')||'').toLowerCase()));
  const page=Number(u.searchParams.get('pagina')),size=Number(u.searchParams.get('tamanhoPagina'));
  return response({itens:filtered.slice((page-1)*size,page*size).map(x=>({...x,userName:'',email:'',ativo:false})),totalRegistros:filtered.length,pagina:page,tamanhoPagina:0});
 }
 if(u.pathname==='/api/Funcionario'&&method==='POST'){if(scenario==='save-error'){await new Promise(r=>setTimeout(r,500));return response({},500);}const dto=JSON.parse(options.body),value={...dto,id:25,ativo:true,idVinculosLoja:[999]};rows.push(value);return response(value,201);}
 const match=u.pathname.match(/^\/api\/Funcionario\/(\d+)$/);
 if(match){const value=rows.find(x=>x.id===Number(match[1]));if(method==='PUT')Object.assign(value,JSON.parse(options.body));return response(value);}
 throw Error('Endpoint inesperado '+u.pathname);
};`
});
const go = async (path = '/admin/users') => {
  await send('Page.navigate', { url: 'http://localhost:5173' + path });
  await delay(1400);
};
const labelInput = async (label, value) => {
  await input(label, value);
  await delay(50);
};
const body = () => evaluate('document.body.innerText');
await send('Page.bringToFront');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1366,
  height: 768,
  deviceScaleFactor: 1,
  mobile: false
});
await go();
check((await body()).includes('pessoa1@example.com'), 'listagem usa detalhe para email real');
check(await evaluate("document.querySelector('table').innerText.includes('Ativo')"), 'status real hidratado');
check(!(await body()).includes('Funcionário'), 'nomenclatura somente Usuários');
await click('Próxima');
await delay(500);
check((await body()).includes('pessoa11@example.com'), 'paginação server-side');
await labelInput('Buscar por nome', 'Pessoa 2');
await delay(800);
check(
  await evaluate("calls.some(c=>c.query.includes('busca=Pessoa+2')&&c.query.includes('pagina=1'))"),
  'busca debounce reinicia página'
);
await evaluate("[...document.querySelectorAll('a')].find(x=>x.textContent==='Novo usuário').click()");
await delay(400);
check((await body()).includes('Resumo do cadastro'), 'criação com resumo');
await labelInput('Nome completo', 'Teste Novo');
await labelInput('E-mail', 'novo@example.com');
await labelInput('Usuário (login)', 'novo');
await labelInput('Senha', 'Example9');
await labelInput('Confirmar senha', 'Mismatch9');
const select = async (label, text) => {
  await evaluate(
    `(()=>{const l=[...document.querySelectorAll('form label')].find(x=>x.textContent.startsWith(${JSON.stringify(label)}));document.getElementById(l.htmlFor).dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))})()`
  );
  await delay(100);
  await evaluate(
    `[...document.querySelectorAll('[role=option]')].find(x=>x.textContent===${JSON.stringify(text)}).click()`
  );
  await delay(100);
};
await select('Loja', 'Loja Centro');
await select('Perfil de acesso', 'Vendedor');
await click('Criar usuário');
check((await body()).includes('senhas não coincidem'), 'confirmação bloqueia envio');
check(
  await evaluate("!calls.some(c=>c.method==='POST'&&c.path==='/api/Funcionario')"),
  'senha divergente não chama API'
);
await labelInput('Confirmar senha', 'Example9');
await click('Criar usuário');
await delay(700);
check(await evaluate("location.pathname==='/admin/users'"), 'sucesso retorna listagem');
check(
  await evaluate(
    "JSON.stringify(Object.keys(calls.find(c=>c.method==='POST'&&c.path==='/api/Funcionario').body).sort())===JSON.stringify(['nome','userName','email','senha','tipoUsuario','idLoja'].sort())"
  ),
  'create DTO exato'
);
await evaluate('document.querySelector(\'a[aria-label="Editar usuário Pessoa 1"]\').click()');
await delay(500);
check(await evaluate("!document.querySelector('input[type=password]')"), 'edição sem senha');
await labelInput('Nome completo', 'Pessoa Editada');
await click('Salvar alterações');
await delay(500);
check(
  await evaluate(
    "JSON.stringify(Object.keys(calls.find(c=>c.method==='PUT').body).sort())===JSON.stringify(['nome','userName','email','ativo'].sort())"
  ),
  'update DTO exato'
);
await go('/admin/users?case=view');
check(
  !(await evaluate("[...document.querySelectorAll('a')].some(x=>x.textContent==='Novo usuário')")),
  'sem Criar oculta Novo usuário'
);
check(
  !(await evaluate('document.querySelector(\'a[aria-label^="Editar usuário"]\')!==null')),
  'sem Atualizar oculta editar'
);
await go('/admin/users?case=denied');
check((await body()).includes('não possui permissão'), 'sem Visualizar bloqueia');
check(await evaluate("!calls.some(c=>c.path.startsWith('/api/Funcionario/'))"), 'guard não dispara listagem');
await go('/admin/users?case=empty');
check((await body()).includes('Nenhum usuário encontrado'), 'empty real');
check((await body()).includes('Mostrando 0 a 0 de 0'), 'paginação vazia correta');
await go('/admin/users?case=error');
check((await body()).includes('Não foi possível concluir'), 'erro amigável');
await go('/admin/users?case=forbidden');
check((await body()).includes('não possui permissão'), '403 distinto de vazio');
await go('/admin/users?case=loading');
check(
  await evaluate('Boolean(document.querySelector(\'[role=status][aria-label="Carregando usuários"]\'))'),
  'loading skeleton'
);
await go();
// Detalhe, cancelamento e falha de mutation preservam dados e não duplicam gravação.
await go('/admin/users/1');
check(
  (await body()).includes('Dados do usuário') && (await body()).includes('1 vínculo(s) de loja'),
  'detalhe real sem interpretar vínculo como loja'
);
await go('/admin/users/new?case=save-error');
await labelInput('Nome completo', 'Preservar Form');
await labelInput('E-mail', 'preservar@example.com');
await labelInput('Usuário (login)', 'preservar');
await labelInput('Senha', 'Example9');
await labelInput('Confirmar senha', 'Example9');
await select('Loja', 'Loja Centro');
await select('Perfil de acesso', 'Vendedor');
await evaluate("(()=>{const b=document.querySelector('button[type=submit]');b.click();b.click()})()");
await delay(900);
check((await body()).includes('Não foi possível concluir'), 'erro de criação amigável');
check(
  await evaluate("[...document.querySelectorAll('input')].some(x=>x.value==='Preservar Form')"),
  'erro preserva formulário'
);
check(
  await evaluate("calls.filter(c=>c.path==='/api/Funcionario'&&c.method==='POST').length===1"),
  'duplo clique envia uma mutation'
);
await evaluate("[...document.querySelectorAll('a')].find(x=>x.textContent==='Cancelar').click()");
await delay(400);
check(await evaluate("location.pathname==='/admin/users'"), 'cancelar retorna lista');
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  for (const page of ['/admin/users', '/admin/users/new', '/admin/users/1/edit']) {
    await go(page);
    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1366, 768],
      [1024, 768],
      [768, 1024]
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false
      });
      await delay(400);
      if (width >= 1200) {
        await evaluate('document.querySelector(\'button[aria-label="Expandir menu lateral"]\')?.click()');
        await delay(250);
      }
      check(
        await evaluate('document.documentElement.scrollWidth<=innerWidth'),
        mode + ' ' + page + ' ' + width + ' sem overflow'
      );
      if (width >= 1200) {
        await evaluate('document.querySelector(\'button[aria-label="Recolher menu lateral"]\').click()');
        await delay(250);
        check(
          await evaluate('document.documentElement.scrollWidth<=innerWidth'),
          mode + ' ' + page + ' ' + width + ' mini sem overflow'
        );
      }
    }
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });
    await delay(400);
    const toggle = await evaluate(
      'document.querySelector(\'button[aria-label="Recolher menu lateral"]\')!==null'
    );
    if (toggle) {
      await evaluate('document.querySelector(\'button[aria-label="Recolher menu lateral"]\').click()');
      await delay(400);
    }
    check(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'mini ' + mode + ' ' + page);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      'tmp/users-' +
        mode +
        '-' +
        (page.endsWith('new') ? 'new' : page.endsWith('edit') ? 'edit' : 'list') +
        '.png',
      Buffer.from(shot.data, 'base64')
    );
  }
}
await evaluate('document.querySelector(\'button[aria-label="Configurações"]\').click()');
await delay(200);
check(
  await evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.textContent==='Usuários')"),
  'menu lateral Configurações no mini'
);
await evaluate(
  "[...document.querySelectorAll('[role=menuitem]')].find(x=>x.textContent==='Usuários').click()"
);
await delay(300);
check(await evaluate("location.pathname==='/admin/users'"), 'Configurações navega para Usuários');
await evaluate('document.querySelector(\'button[aria-label="Expandir menu lateral"]\').click()');
await delay(300);
check(
  await evaluate(
    "document.querySelector('button[aria-label=\"Configurações\"]').getAttribute('aria-expanded')==='true'"
  ),
  'submenu aberto na rota Usuários'
);
console.log(checks + ' verificações Usuários com API simulada');
ws.close();
