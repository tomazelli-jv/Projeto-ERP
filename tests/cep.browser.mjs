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

// Apenas o provedor público é simulado, incluindo transporte que ignora cancelamento.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.cepCalls=[];const original=fetch;window.fetch=async(url,options)=>{if(!String(url).startsWith('https://viacep.com.br/'))return original(url,options);cepCalls.push({url,headers:options.headers,credentials:options.credentials});const cep=String(url).split('/')[4];if(cep==='99999999')throw Error('offline');await new Promise(r=>setTimeout(r,cep==='01001000'?900:20));return new Response(JSON.stringify(cep==='00000000'?{erro:true}:{cep,logradouro:'Rua '+cep,bairro:'Bairro',localidade:'Cidade',uf:'SP'}));};`
});
const origin =
  'http://localhost:5173/@fs/' + process.cwd().replaceAll('\\', '/') + '/tests/fixtures/cep-harness.html';
const go = async (edit = false) => {
  await send('Page.navigate', { url: origin + (edit ? '?edit' : '') });
  await delay(1500);
};
const value = (label) =>
  evaluate(
    `(()=>{const l=[...document.querySelectorAll('label')].find(x=>x.textContent.startsWith('${label}'));return document.getElementById(l.htmlFor).value})()`
  );
await go(true);
check(await evaluate('cepCalls.length===0'), 'edicao nao consulta ao abrir');
await input('CEP', '12345');
await delay(450);
check(await evaluate('cepCalls.length===0'), 'incompleto nao consulta');
await input('CEP', '01001000');
await delay(450);
await input('CEP', '77804120');
await delay(1200);
check((await value('Rua')) === 'Rua 77804120', 'resposta antiga ignorada');
check((await value('Cidade')) === 'Cidade', 'cidade preenchida');
check((await value('UF')) === 'SP', 'UF preenchida');
check(
  await evaluate("cepCalls.every(x=>x.headers===undefined&&x.credentials==='omit')"),
  'sem autenticacao externa'
);
await input('CEP', '00000000');
await delay(500);
check(await evaluate("document.body.innerText.includes('CEP não encontrado')"), 'CEP inexistente');
await input('CEP', '99999999');
await delay(500);
check(
  await evaluate("document.body.innerText.includes('Preencha o endereço manualmente')"),
  'rede indisponivel'
);
await input('Rua', 'Manual');
check((await value('Rua')) === 'Manual', 'endereco manual livre');
for (const mode of ['light', 'dark']) {
  await evaluate(`localStorage.setItem('erp.themeMode','${mode}')`);
  await go();
  check((await value('CEP')) === '', mode + ' formulario disponivel');
}
console.log(checks + ' verificacoes CEP, somente API externa simulada');
ws.close();
