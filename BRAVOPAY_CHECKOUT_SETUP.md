# TORQUEBOX — BravoPay em USD

O carrinho aceita um kit por pedido. O cliente escolhe 1, 2 ou 3 frascos, confere o total e segue para o checkout oficial da BravoPay na mesma aba. Adicionar outro kit substitui a seleção atual.

| Kit | Produto | Frete EUA | Total USD | Oferta |
| --- | --- | --- | --- | --- |
| 1 frasco | $19.95 | $4.99 | $24.94 | https://pagseguropix.org/c/torquebox-1-bottle-usd |
| 2 frascos | $29.95 | Grátis | $29.95 | https://pagseguropix.org/c/torquebox-2-bottles-usd |
| 3 frascos | $38.95 | Grátis | $38.95 | https://pagseguropix.org/c/torquebox-3-bottles-usd |

As ofertas pertencem ao produto físico `cmwodsga7000208l3ziho0hc8`, usam o modelo Gringa Drop e têm cartão habilitado. O total de um frasco inclui o frete no preço da oferta e no título do checkout.

## Implementação

- `assets/checkout-offers.js` contém somente os links públicos e os valores conferidos no painel e nas páginas publicadas.
- O carrinho rejeita combinações de kits e quantidades diferentes de um antes de escolher o link. Uma chave de armazenamento própria separa esse fluxo dos carrinhos antigos.
- Dados pessoais, endereço e cartão são informados à BravoPay. O site não recebe o cartão.
- Este fluxo de links públicos não usa chave de API nem precisa de um segredo na Cloudflare. A API pública consultada documenta valores em BRL; ela não é usada para gerar cobranças USD.
- O checkout publicado envia `X-Frame-Options: SAMEORIGIN` e `frame-ancestors 'self'`. A navegação direta foi aprovada; não há iframe ou proxy do formulário.

Os pagamentos e pedidos devem ser acompanhados no painel da BravoPay. O site não marca pedidos como pagos ao abrir o checkout ou quando o visitante volta.

## Verificação

Execute `node --test tests/*.test.mjs`. A conferência no navegador cobre os três kits, os respectivos totais, a troca de seleção, a persistência e a navegação na mesma aba. Uma cobrança real não faz parte dos testes de interface.
