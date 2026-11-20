# TORQUEBOX — checkout Pix em reais (Brasil)

O site **torque-box.com** mostra produtos QIFOR com preços em reais e cobra por meio da API da Pixou, sem redirecionamento. O Pix é criado e confirmado pelo servidor: o navegador nunca recebe a chave privada.

## Preços configurados (valores preliminares)
- 1 frasco de 120 mL: R$ 39,90 + R$ 9,90 de frete = R$ 49,80.
- Kit de 2: R$ 69,90 com frete grátis.
- Kit de 3: R$ 94,90 com frete grátis.
- Pedidos com subtotal a partir de R$ 79,90 também têm frete grátis.

Os preços são **de teste** até confirmar custo posto no Brasil, tributos, embalagem, entrega ao consumidor, taxas da operadora e reserva para devoluções. Ainda não há cálculo dinâmico de frete por CEP: apenas a tabela fixa acima. Não prometa entrega em 7 dias sem confirmar com o fornecedor.

## Configuração do checkout

1. No Cloudflare Pages, mantenha o D1 ligado com nome `TORQUEBOX_DB`.
2. Mantenha o token Pixou como Secret `PIXOU_SECRET_TOKEN` no ambiente de produção. Nunca coloque o token em código, GitHub ou conversa.
3. A tabela existente `torque_orders` continua compatível. Em pedidos brasileiros, a coluna `brl_total_cents` contém o valor cobrado; as antigas colunas `usd_*_cents` ficam em zero e `fx_rate` recebe 1 somente por compatibilidade retroativa, pois **não há mais conversão de câmbio**.
4. Confirme a conexão GitHub → Cloudflare e aguarde o novo deploy do repositório.
5. Verifique carrinho, kits, valores do orçamento Pix, CPF/dados exigidos pela operadora (se houver), endereço com UF e CEP brasileiros, confirmação de pagamento e tela de agradecimento.
6. Não efetue pagamentos reais somente para testar aparência; faça teste autorizado com valor baixo e possibilidade de estorno verificados.
7. Consulte pedidos pagos no D1 antes de enviar mercadoria.

**Atenção:** não há integração automática com fornecedor, cotação de frete por CEP, confirmação de postagem ou e-mails transacionais. O lojista deve validar prazo e viabilidade da entrega.

## Testes

```sh
node --test tests/*.test.mjs
```

A interface no navegador exige Playwright e Chromium disponíveis. Os testes da API são separados.

Documentação: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) e [PIXOU API](https://www.pixoupay.com/apidocumentacao).
