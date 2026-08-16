# Lanchonete PDV - Todo List

## Autenticação e Usuários
- [x] Implementar tela de login com campos de usuário e senha
- [x] Implementar cadastro de responsável pelo caixa
- [x] Implementar logout e gerenciamento de sessão
- [x] Criar tabelas de usuários e responsáveis no banco de dados

## Cardápio Semanal
- [x] Implementar lógica para gerar cardápio apenas aos sábados
- [x] Criar identificação de cardápio por data e ordem (1º Sábado, 2º Sábado, etc.)
- [x] Implementar tabela de cardápio no banco de dados
- [x] Criar interface para visualizar cardápio do sábado atual

## Cadastro de Produtos
- [x] Criar tabela de produtos com nome, preço, quantidade
- [x] Implementar interface de cadastro de produtos
- [x] Implementar interface de edição de produtos
- [x] Implementar opção de marcar produto como indisponível manualmente
- [x] Implementar adição/incremento de quantidade de produtos

## Controle de Estoque
- [x] Implementar decremento automático de quantidade ao vender
- [x] Implementar lógica de indisponibilidade automática ao zerar estoque
- [x] Implementar atualização em tempo real da disponibilidade no cardápio
- [x] Criar histórico de movimentação de estoque

## Tela de PDV
- [x] Criar interface de seleção de itens do cardápio
- [x] Implementar seleção de quantidade de produtos
- [x] Implementar cálculo automático do valor total do pedido
- [x] Implementar carrinho de compras visual
- [x] Implementar remoção de itens do carrinho

## Formas de Pagamento
- [x] Implementar seleção de forma de pagamento (PIX, Cartão, Dinheiro)
- [x] Implementar botão de conclusão do pedido
- [x] Implementar confirmação de envio para impressão
- [x] Implementar validação de forma de pagamento

## Impressão de Pedidos
- [x] Implementar módulo de conexão com impressora
- [x] Implementar formatação de cupom para impressão
- [x] Implementar impressão simples (sem fiscal)
- [x] Implementar tratamento de erros de impressão

## Fechamento de Caixa
- [x] Implementar tela de abertura de caixa
- [x] Implementar tela de fechamento de caixa
- [x] Implementar opção de reabertura de caixa
- [x] Implementar validação de caixa aberto/fechado
- [x] Criar tabela de controle de caixa no banco de dados

## Relatórios
- [x] Implementar relatório de vendas do dia
- [x] Implementar listagem de itens vendidos com preço unitário e quantidade
- [x] Implementar cálculo de total recebido
- [x] Implementar discriminação de pagamentos (PIX, Dinheiro, Cartão)
- [x] Implementar exportação de relatório (PDF ou impressão)

## Correção Definitiva da Exibição do Cliente em Detalhes da Venda
- [x] Auditar e corrigir getAllCashierSessionsWithOrders no backend para garantir leftJoin com customers e retorno explícito de customerName em cada order
- [x] Atualizar as interfaces Order em ReportsPage e componentes relacionados para garantir customerName?: string | null
- [x] Inserir o rótulo do cliente de forma destacada no card do pedido (ex: Cliente: Nome ou GERAL) com suporte a fallback
- [x] Adicionar testes de regressão automatizados para verificar a presença de customerName no payload de pedidos e na renderização
- [x] Validar TypeScript, testar com Vitest, realizar build de produção e salvar checkpoint publicado


## Auditoria Concreta da Exibição do Cliente em Detalhes da Venda
- [x] Inspecionar todas as chamadas tRPC em ReportsPage.tsx para confirmar qual endpoint alimenta a lista de sessões e pedidos
- [x] Verificar no servidor se o roteador tRPC define output schema que possa omitir o campo customerName
- [x] Inspecionar o JSX do modal de detalhes em ReportsPage.tsx para garantir que a renderização de customerName / GERAL ocorre dentro do card do pedido
- [x] Executar chamada real ao endpoint tRPC pdv.cashier.getAllSessionsWithOrders via fetch autenticado e inspecionar o JSON bruto
- [x] Validar visualmente o modal "Detalhes da Venda" logado no navegador com os 4 pedidos do exemplo e confirmar a exibição do cliente e GERAL


## Inclusão do Cliente nos Cupons Impressos do PDV
- [x] Auditar o componente POSPage.tsx ou utilitário de impressão para localizar a montagem do texto do cupom
- [x] Atualizar a formatação do cupom para incluir explicitamente a linha "Cliente: [Nome do Cliente]" logo após o cabeçalho ou dados do pedido
- [x] Garantir fallback para "GERAL" quando nenhum cliente específico estiver selecionado
- [x] Adicionar teste unitário de regressão validando a presença do cliente e fallback no cupom
- [x] Validar TypeScript, testar com Vitest, realizar build e salvar checkpoint publicado
