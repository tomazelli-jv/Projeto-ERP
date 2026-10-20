# Etiquetas de produtos

Disponível em **Produtos → Etiquetas**, em um modal sem mudança de rota.
Utiliza o repository e as queries existentes de produtos, restritos ao ambiente
Development enquanto não houver integração oficial. Não cria endpoints nem
persistência própria.

- Somente produtos ativos; filtros por nome, código, GTIN, grupo e marca.
- Seleção preservada entre filtros e páginas; quantidade inteira positiva por
  produto, com limite total de 1.000 etiquetas.
- Prévia limitada a 20 etiquetas. A impressão inclui a quantidade completa.
- O preço é consultado novamente antes da prévia e da impressão.
- O GTIN existente aparece como texto, preservando zeros. Não são geradas barras
  escaneáveis nem códigos fictícios quando o produto não possui GTIN.

## Impressão

Modelo padrão de 60 × 35 mm, folhas A4, margens de 10 mm, três colunas e
sete linhas por folha. Um iframe dedicado contém somente as etiquetas; o
comando de impressão utiliza esse documento, sem a navegação do ERP.

Na janela do navegador, utilizar A4, escala de 100% e desativar cabeçalhos e
rodapés. A impressão física depende das configurações e margens da impressora;
não foi validada em equipamento físico. Não há integração com impressoras ou PDF.

## Validação

`node --test tests/product-labels.test.mjs` valida quantidades, paginação de
etiquetas e uso do preço atual. `node tests/product-labels.browser.mjs` usa Vite
na porta 5173 e um Chrome isolado com CDP na porta 9230. A sessão é simulada,
mas os repositories usados pelo teste são reais e ficam no namespace exclusivo
`labels-test`. O teste verifica seleção, filtros, prévia, remarcação, impressão
isolada, CSS de impressão e dimensões responsivas em Light e Dark.
