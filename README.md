# TorqueBox com checkout incorporado

O botão **Checkout** abre o formulário do Stripe dentro da página. O Worker cria a sessão com os kits, quantidades e frete do carrinho, em USD. A página mostra a confirmação depois que a sessão aparece como paga no Stripe.

## Testar

Use Node.js 22 ou posterior. Rode `npm test` para validar os preços, o frete e as rotas de checkout com respostas locais.

Para abrir o formulário do Stripe, coloque as chaves do mesmo sandbox em `.dev.vars` e rode `npx wrangler@4 dev`.

```dotenv
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

Adicione um kit ao carrinho, abra **Checkout** e use um [cartão de teste do Stripe](https://docs.stripe.com/testing). A interface indica quando as chaves estão em modo de teste.

## Publicar a loja

Conecte esta branch a um Worker com Static Assets ou rode `npx wrangler@4 deploy` na conta Cloudflare da loja. A configuração gera `dist/` com os arquivos públicos e serve a API no mesmo domínio.

Nas configurações do Worker, defina `STRIPE_PUBLISHABLE_KEY` e adicione `STRIPE_SECRET_KEY` como **Secret**. Valide primeiro com o sandbox. Para habilitar cobranças, use as duas chaves da conta Stripe em modo live na versão da loja.

Os dados para expedição ficam na sessão do pagamento no Stripe. Use o status pago do Stripe para confirmar pedidos.
