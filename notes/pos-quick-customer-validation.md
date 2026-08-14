# Validação do atalho de cliente

O `/pos` carregou corretamente, mas exibiu `Nenhum Cardápio Aberto`, impedindo a visualização do seletor de cliente e do botão de cadastro rápido. A tela `/weekly-menu` possui um cardápio de 08/08/2026 fechado e sem itens; não foi aberto nem alterado durante a validação para evitar criar dados operacionais fora do pedido do usuário. O build e a suíte Vitest passaram após a implementação.
