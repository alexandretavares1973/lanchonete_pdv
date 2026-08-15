# Verificação visual — migração compartilhada

Em 15/08/2026, o dashboard carregou com a interface de clientes e os atalhos do PDV, cardápio, produtos e relatórios. A listagem de clientes veio da query compartilhada e exibiu registros reais do banco.

A rota `/reports` carregou a nova interface de Relatórios de Vendas com o texto informando que sessões, pedidos e cardápios vêm do banco compartilhado. Foram exibidos os filtros dos cardápios existentes. A tela informou “Nenhuma venda registrada”, o que é coerente com a regra atual de ignorar sessões sem `weeklyMenuId`; a consulta ao banco mostrou 22 sessões históricas sem vínculo e apenas dois cardápios oficiais. Nenhuma associação histórica foi feita automaticamente, pois o responsável e a data não identificam com segurança o cardápio correto.

Após recarregar o dashboard, a interface permaneceu estável e o console do navegador não apresentou novas mensagens. O loop de atualização causado pelo array padrão recriado em cada render foi corrigido removendo o estado espelho do Dashboard e memoizando coleções derivadas nos relatórios.
