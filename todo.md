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


## Exibição do Cliente no Card de Estorno (ReportsPage.tsx)
- [x] Auditar o card de pedido no diálogo "Detalhes da Venda" em ReportsPage.tsx para confirmar onde o nome do cliente é exibido
- [x] Atualizar a renderização do card de pedido e do diálogo de estorno para exibir de forma evidente "Cliente: [Nome do Cliente]" com suporte a fallback GERAL
- [x] Garantir fallback para "GERAL" quando o pedido não tiver cliente vinculado
- [x] Adicionar teste unitário de regressão para a presença do cliente no card de estorno
- [x] Validar TypeScript, testar com Vitest, realizar build e salvar checkpoint publicado


## Inclusão do Cliente nos Relatórios Resumidos por Período (ReportsPage.tsx)
- [x] Auditar a função de cálculo de relatório e os blocos de exibição de pedidos filtrados por período em ReportsPage.tsx
- [x] Atualizar o resumo consolidado por período e os textos/PDFs gerados para listar explicitamente o cliente de cada pedido considerado no intervalo
- [x] Garantir fallback para "GERAL" quando o pedido do período não tiver cliente cadastrado
- [x] Adicionar teste unitário de regressão validando o resumo por período com clientes
- [x] Validar TypeScript, testar com Vitest, realizar build e salvar checkpoint publicado


## Remoção da Configuração de Cardápio Padrão do PDV
- [x] Auditar armazenamento e uso (constatado que era armazenado exclusivamente no localStorage como `"defaultWeeklyMenuId"` e consumido por `POSPage.tsx` via `selectPreferredOpenMenu`)
- [x] Remover a seção visual "Cardápio Padrão do PDV" da página de configurações (`SettingsPage.tsx`)
- [x] Remover a lógica de preferência em `POSPage.tsx`, restaurando a exigência de escolha manual quando houver múltiplos cardápios abertos (mantendo seleção automática apenas se houver um único cardápio aberto)
- [x] Atualizar os testes unitários em `server/pdv.test.ts` e validar 84 testes aprovados
- [x] Validar TypeScript, build de produção e salvar checkpoint publicado


## Regra de Cardápio Único Aberto
- [x] Validar e atualizar o backend (`server/db.ts`) para rejeitar transacionalmente a abertura de um cardápio (`status = "open"`) se já houver outro cardápio aberto, retornando o nome e a data do cardápio existente
- [x] Atualizar a página do cardápio semanal (`WeeklyMenuPage.tsx`) para verificar cardápios abertos e exibir aviso antes mesmo do backend ou tratar o erro
- [x] Criar um Diálogo (Dialog) dedicado na interface informando o bloqueio de abertura e instruindo o usuário a fechar primeiro o cardápio ativo com a mensagem exata solicitada
- [x] Adicionar testes automatizados em `server/pdv.test.ts` simulando a tentativa de abrir múltiplos cardápios simultaneamente e validando o bloqueio
- [x] Validar TypeScript, testar com Vitest (84 testes aprovados), realizar build e salvar checkpoint publicado


## Remoção do Filtro por Cardápio no Relatório de Vendas (ReportsPage.tsx)
- [x] Remover o estado `selectedMenuId` e a lógica de filtro de sessões baseada em cardápio em `ReportsPage.tsx`
- [x] Remover o bloco visual inteiro do filtro "Filtrar por Cardápio" (título, descrição e botões de seleção) da interface
- [x] Garantir que a listagem de sessões, totais e exportações (PDF, WhatsApp, Impressão) passem a depender exclusivamente do período selecionado
- [x] Executar testes Vitest, validar TypeScript, build de produção e inspecionar visualmente a tela limpa (validado via inspeção visual direta da URL publicada)


## Auditoria e Correção de SOPA e Limite de Estoque Baixo
- [x] Consultar no banco de dados os valores reais de `products.quantity = 2`, `products.isUnlimited = false` para SOPA e `menu_items.availableQuantity = 12` no cardápio ativo
- [x] Rastrear no código-fonte o uso da constante de estoque baixo (`LOW_STOCK_THRESHOLD` em `shared/stockAlerts.ts`), que estava com `3` por equívoco
- [x] Unificar o limiar de alerta de estoque baixo para `5` (`LOW_STOCK_THRESHOLD = 5`), corrigindo a divergência
- [x] Validar com 84 testes Vitest aprovados, TypeScript e build de produção
- [x] Salvar checkpoint e relatar a auditoria completa e os números reais ao usuário


## Sincronização de Estoque Global e Disponibilidade por Cardápio
- [x] Auditar no banco de dados todos os produtos e seus respectivos `menu_items` (encontrado produto SOPA com estoque global 2 e cardápio 12)
- [x] Ajustar `getAllWeeklyMenus` em `server/db.ts` para que a quantidade disponível no cardápio respeite sempre o teto do estoque global (`Math.min(rawMenuQty, globalQty)`)
- [x] Unificar o limiar de estoque baixo em 5 (`LOW_STOCK_THRESHOLD = 5`) em `shared/stockAlerts.ts` e validar testes
- [x] Executar testes Vitest (84 aprovados), TypeScript e build de produção com sucesso


## Correção do Alerta de Estoque Baixo no POS (POSPage.tsx)
- [x] Auditar `POSPage.tsx` para localizar a renderização do alerta de estoque baixo (verificar se usa a função compartilhada `isLowGlobalStock` e `getLowStockMessage`)
- [x] Ajustar o código do POS para que qualquer produto com quantidade global restante < 5 exiba o alerta oficial ("ALERTA: [Nome] tem quantidade no estoque menor que 5")
- [x] Validar testes unitários em `server/pdv.test.ts`, compilar o build de produção e salvar checkpoint publicado
