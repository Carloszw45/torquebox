# TorqueBox — Checklist para ativar Stripe em produção (NÃO ATIVADO)

Esta preparação está na branch `preparacao/stripe-usd-producao`, separada de `main`.
**O site público e os pagamentos Pixou existentes não mudam automaticamente.**
Não faça merge/promoção nem use chaves reais no Preview.

## O que está preparado no código

- Checkout Stripe embutido em inglês, em USD, envio apenas para endereços dos Estados Unidos.
- Preços definidos no servidor, mantidos: 1 frasco $19.95 + $4.99 de frete; 2 $29.95 frete grátis; 3 $38.95 frete grátis. Prazo informado de 10–15 **dias úteis**.
- Chaves restritas `rk_live_...` com **Checkout Sessions → Escrever**, somente na conta principal, são aceitas e recomendadas (também aceita `sk_live_...`).
- `STRIPE_MODE=live` é obrigatório para pagamentos reais e só funciona em `https://torque-box.com` e `https://www.torque-box.com`; em Preview, `sk_live_` não é aceito.
- `STRIPE_MODE=test` ou variável ausente só aceita chaves `pk_test_` / `sk_test_` fora do domínio público.
- Sessões e eventos são rejeitados se o modo `test/live` não corresponder; webhook verifica assinatura, ID da sessão e valor do pedido antes de marcar como pago.
- Removemos avaliações e notas fictícias deste candidato; testemunhos reais podem ser publicados depois, com autorização.

## Antes de publicar

1. Confirmar com o proprietário se a vitrine pública será substituída pela versão americana em inglês e se o Pixou Pay será retirado, mantido ou transferido para outro domínio.
2. Confirmar que a conta Stripe brasileira está **ativada para pagamentos reais e cobrança em USD**, e conferir a moeda de liquidação e as taxas de câmbio aplicáveis. Não pressupor que o saldo será liquidado em USD no Brasil.
3. Configurar *somente no ambiente Production* do Cloudflare Pages:
   - `STRIPE_MODE` = `live` (Text).
   - `STRIPE_PUBLISHABLE_KEY` = chave pública `pk_live_...` (Text).
   - `STRIPE_SECRET_KEY` = chave restrita `rk_live_...` com **Checkout Sessions → Escrever** (recomendado), ou chave `sk_live_...` (**Secret**).
   - `STRIPE_WEBHOOK_SECRET` = segredo `whsec_...` do webhook do **modo real** (**Secret**).
   - `TORQUEBOX_DB` = banco D1 **de produção** com a tabela `stripe_orders` da migração `migrations/0002_stripe_orders.sql`. Pode ser um D1 separado; não apontar para banco de testes.
4. Criar destino webhook no **modo real** da Stripe com a URL `https://torque-box.com/api/stripe/webhook` para:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
5. Verificar políticas públicas de privacidade, termos, reembolsos (apenas em caso de problema, sem devolução) e informações de suporte; conferir dados de estoque americano e prazo de 10–15 dias úteis.
6. Confirmar processo de cumprimento: monitoramento de pedidos pagos no D1, aviso interno e e-mail de confirmação/entrega. O código atual **não envia avisos automáticos ao vendedor nem reserva estoque**, então uma operação manual supervisionada é necessária até automatizar.
7. Confirmar impostos/taxas aplicáveis a vendas para diferentes estados dos EUA e as alegações técnicas do produto. Não publicar avaliações inventadas.
8. Após revisão explícita e aprovação da publicação, promover o código para `main`, configurar produção, fazer deploy e validar `/api/stripe/config` (deve retornar `mode: live` e somente chave `pk_live_`).
9. Fazer um pedido real de pequeno valor **somente com autorização** e verificar Stripe, confirmação de pagamento, webhook assinado e linha `stripe_orders.status=paid`.

## Segurança

- Nunca inserir `sk_live_`, `sk_test_` ou `whsec_` em GitHub, chat ou captura de tela.
- As chaves de Preview e Production são independentes.
- Não ativar produção sem webhook real, D1 preparado e processo de atender pedidos pagos.
- O exemplo de teste continua na branch `integracao/stripe-usd-teste`.
