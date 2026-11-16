# TORQUEBOX — ativação do checkout Pix no Cloudflare Pages

O formulário de compra, a cotação USD→BRL e o QR Code ficam **dentro de `torque-box.com`**. A PIXOU processa o pagamento em reais, enquanto a Cloudflare armazena o pedido e verifica sua situação pela API. A chave privada nunca aparece no HTML ou JavaScript público.

## Antes de começar

- Confirme com a PIXOU que a conta pode **receber cobranças via API** e que os dados do adquirente estão aprovados.
- O comprador precisa de um aplicativo bancário que faça **Pix brasileiro**. Em geral, um consumidor dos EUA sem conta Pix não conseguirá pagar, embora o frete e os preços da loja estejam em USD.
- No momento, a operação de expedição é manual: pedidos pagos são registrados no banco D1; ainda não há integração com fornecedor, e-mail transacional nem emissão de documentos fiscais.

## 1. Criar o banco dos pedidos

1. Acesse o painel Cloudflare, vá em **Workers & Pages → D1 SQL Database** (ou **Storage & databases → D1**).
2. Crie um banco chamado **`torquebox-orders`**.
3. Dentro dele, abra a seção **Console**.
4. Execute o conteúdo do arquivo [`migrations/0001_torque_orders.sql`](migrations/0001_torque_orders.sql). Ele cria a tabela `torque_orders`.

## 2. Vincular o D1 ao site publicado

1. Abra **Workers & Pages → torquebox → Settings → Bindings → Add → D1 Database**.
2. Em **Variable name**, digite exatamente **`TORQUEBOX_DB`**.
3. Em **D1 database**, selecione **`torquebox-orders`**.
4. Salve para o ambiente **Production** (e Preview, se for testar previews).

## 3. Cadastrar o token privado da PIXOU

1. Dentro do projeto **torquebox**, abra **Settings → Variables and Secrets → Add**.
2. Em **Variable name**, use exatamente **`PIXOU_SECRET_TOKEN`**.
3. Em **Value**, cole o *Secret Token* completo criado em **PIXOU → Integrações → API**.
4. Selecione **Encrypt** para armazená-lo como **Secret** e salve no ambiente **Production**.
5. **Não envie o token no chat e nunca o adicione ao repositório, ao HTML nem ao JavaScript do navegador.**

## 4. Publicar e testar

1. Depois que os arquivos deste checkout estiverem publicados no GitHub, confirme que a Cloudflare implantou a versão mais recente de **torquebox**. Se você configurou o D1 ou Secret depois do deploy, faça **Redeploy**.
2. Abra `https://torque-box.com` e adicione um produto ao carrinho.
3. Clique **Checkout with Pix**. Confira o valor em dólar; o checkout calcula a conversão nos bastidores, sem mostrar um preço em reais no site.
4. Preencha os dados reais do comprador e o endereço de entrega nos Estados Unidos. Gere o código Pix.
5. Para testar a confirmação de verdade, faça um pagamento de pequeno valor **somente depois de verificar as taxas e a possibilidade de estorno da PIXOU**. Não use códigos Pix fictícios em produção.
6. No banco D1, consulte `SELECT id, status, usd_total_cents, brl_total_cents, fx_rate, fx_date, customer_email, shipping_address_json, paid_at FROM torque_orders ORDER BY created_at DESC LIMIT 20;`.
7. Só separe e envie o pedido depois que o status estiver **`paid`**. A página do comprador também consulta a API autenticada da PIXOU para confirmar o pagamento; o webhook sozinho não é aceito como prova.

## Regras implementadas

- Os preços e o frete são recalculados no servidor em **centavos de dólar**, sem confiar nos números enviados pelo navegador.
- Cotação **USD→BRL da PTAX/BCB via Frankfurter** em cache por até 15 minutos. Em dias sem nova publicação, usa-se a última cotação disponível, limitada a uma defasagem de 8 dias; se a consulta falhar, a compra não é gerada.
- O checkout **não mostra o valor em BRL** na página. Quando o Pix é criado, o valor convertido em BRL é fixado e salvo junto com a cotação e a data. O comprador confere o valor convertido ao escanear o QR Code ou abrir o código Pix no aplicativo bancário, antes de autorizar o pagamento.
- Endpoint de cobrança: `/api/pix/charge`; consulta: `/api/pix/status`; callback: `/api/pix/webhook`.
- A confirmação depende de consulta autenticada ao registro da PIXOU, conferindo identificador, método e valor da transação. A PIXOU não documenta assinatura digital do webhook no material usado nesta integração.
- Uma compra não é marcada como paga apenas porque o navegador ou o webhook afirmou isso.

## Testes locais

```sh
node --test tests/*.test.mjs
```

O teste de navegador exige Chromium e permissões de execução gráfica/headless; em ambientes que bloqueiam a inicialização do navegador, ele é ignorado, mas os testes de preço e segurança do servidor continuam.

Referências: [Cloudflare Pages Functions e Bindings](https://developers.cloudflare.com/pages/functions/bindings/), [D1](https://developers.cloudflare.com/d1/get-started/), [Frankfurter](https://frankfurter.dev/), [PIXOU API](https://www.pixoupay.com/apidocumentacao).
