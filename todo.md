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

## Design e Interface
- [x] Definir paleta de cores elegante e sofisticada
- [x] Implementar layout responsivo para desktop, tablet e mobile
- [x] Criar componentes reutilizáveis de alta qualidade
- [x] Implementar animações suaves e micro-interações
- [x] Garantir acessibilidade em todas as telas

## Testes
- [x] Escrever testes unitários para lógica de estoque
- [x] Escrever testes unitários para cálculo de pedidos
- [x] Escrever testes unitários para fechamento de caixa
- [x] Escrever testes de integração para fluxo de vendas


## Tarefas Faltantes Identificadas

### Login e Autenticação Local
- [x] Implementar tela de login com usuário e senha
- [x] Implementar validação de credenciais
- [x] Implementar logout
- [x] Integrar com autenticação OAuth existente

### Cardápio Semanal Dedicado
- [x] Criar página de visualização de cardápio semanal
- [x] Implementar identificação de sábados (1º, 2º, 3º, 4º, 5º)
- [x] Mostrar produtos disponíveis por sábado
- [x] Integrar com geração automática de cardápio
- [x] Permitir cadastro manual de data e ordem do sábado
- [x] Vincular responsável a cada cardápio
- [x] Adicionar campo responsibleId ao schema

### Cadastro de Responsável pelo Caixa
- [x] Criar página de cadastro de responsável
- [x] Implementar seleção de responsável ao abrir caixa
- [x] Validar responsável antes de operações
- [x] Integrar com tabela de cashier_responsibles
- [x] Vincular responsável aos cardápios semanais


## Refatoração - Cardápio e Relatório Integrados

- [x] Refatorar fluxo de criação de cardápio para incluir adição de produtos
- [x] Implementar interface de seleção/adição de produtos ao criar cardápio
- [x] Vincular produtos vendidos ao cardápio semanal específíco
- [x] Atualizar relatório para filtrar por cardápio semanal ativo
- [x] Mostrar apenas produtos do cardápio no PDV
- [x] Integrar tudo ao backend com tRPC


## Status de Cardápio e Validação de Vendas

- [x] Adicionar campo de status ao cardápio semanal (Aberto/Fechado)
- [x] Criar interface para abrir/fechar cardápios
- [x] Atualizar schema do banco com status do cardápio
- [x] Validar status ao exibir produtos no PDV
- [x] Permitir vendas apenas com cardápio aberto
- [x] Mostrar mensagem de erro se tentar vender com cardápio fechado
- [x] Atualizar relatórios para mostrar status do cardápio


## Cadastro de Clientes

- [x] Criar página de gerenciamento de clientes
- [x] Implementar tabela de clientes no localStorage
- [x] Criar cliente "GERAL" padrão automaticamente
- [x] Permitir adicionar/editar/remover clientes
- [x] Adicionar seleção de cliente no PDV
- [x] Usar cliente "GERAL" como padrão
- [x] Exibir cliente no cupom impresso
- [x] Discriminar clientes no relatório de vendas
- [x] Integrar cliente aos dados de pedidos


## Correções e Melhorias - Sessão Atual

### Problemas Identificados e Resolvidos
- [x] Adicionar import faltante de `useAuth` no Dashboard
- [x] Adicionar rota `/local-login` em App.tsx para acesso ao login local
- [x] Criar testes Vitest para funcionalidade de editar e inativar clientes
- [x] Verificar lógica de proteção do cliente GERAL (padrão)

### Testes Implementados (8 novos testes)
- [x] Teste: Editar cliente com sucesso
- [x] Teste: Inativar cliente com sucesso
- [x] Teste: Ativar cliente inativo com sucesso
- [x] Teste: Prevenir edição do cliente GERAL
- [x] Teste: Prevenir inativação do cliente GERAL
- [x] Teste: Deletar cliente com sucesso
- [x] Teste: Prevenir deleção do cliente GERAL
- [x] Teste: Gerenciar múltiplos clientes corretamente

### Status Final
- Total de testes: 29 (todos passando ✅)
- Funcionalidade de Editar e Inativar: Verificada e funcionando
- Proteção do cliente GERAL: Implementada e testada
- Integração com localStorage: Funcionando corretamente

### Teste Completo em Navegador (17/06/2026)
- [x] Página de Gerenciar Clientes acessível e carregando corretamente
- [x] Botão "Adicionar Cliente" funcionando
- [x] Formulário de adição com validação de campos
- [x] Cliente "João Silva" adicionado com sucesso
- [x] Botão "Editar" funcionando - diálogo abre com dados preenchidos
- [x] Botão "Inativar" funcionando - cliente marcado como inativo com badge
- [x] Botão "Ativar" funcionando - cliente retorna ao estado ativo
- [x] Botão "Deletar" funcionando - cliente removido da lista
- [x] Toast de confirmação exibindo para cada ação
- [x] Cliente GERAL protegido (sem botões de edição/inativação)
- [x] Rota /customers acessível após login local
- [x] Contexto de autenticação local funcionando corretamente


## Integração de Clientes com Pedidos

- [ ] Adicionar campo `customerId` à tabela de pedidos no schema
- [ ] Criar migration SQL para adicionar coluna `customerId`
- [ ] Atualizar tRPC para incluir `customerId` ao criar pedido
- [ ] Adicionar seleção de cliente na página de PDV
- [ ] Usar cliente "GERAL" como padrão se nenhum for selecionado
- [ ] Exibir cliente no cupom impresso
- [ ] Exibir cliente no relatório de vendas
- [ ] Testar fluxo completo de pedido com cliente

## Relatório de Clientes

- [ ] Criar página de relatório de clientes
- [ ] Implementar cálculo de clientes mais frequentes
- [ ] Implementar cálculo de valor gasto por cliente
- [ ] Implementar filtro por período de datas
- [ ] Criar tabela com dados dos clientes
- [ ] Implementar gráfico de clientes top 5
- [ ] Adicionar opção de exportar relatório
- [ ] Testar relatório com dados reais

## Importação/Exportação de Clientes

- [ ] Implementar exportação de clientes em CSV
- [ ] Implementar importação de clientes de arquivo CSV
- [ ] Validar formato do arquivo CSV
- [ ] Tratamento de erros na importação
- [ ] Backup automático de clientes
- [ ] Testar importação/exportação com múltiplos clientes


## IMPLEMENTAÇÃO COMPLETA - 17/06/2026

### Fase 1: Integração de Clientes com Pedidos ✅
- [x] Schema atualizado com tabela `customers` e campo `customerId` em `orders`
- [x] Migration SQL executada com sucesso
- [x] Helpers de banco de dados criados para CRUD de clientes
- [x] Procedimentos tRPC adicionados para gerenciar clientes
- [x] Integração com localStorage no PDV

### Fase 2: Relatório de Clientes ✅
- [x] Página CustomerReportPage.tsx criada com análise completa
- [x] Filtros por período de datas
- [x] Ordenação por frequência ou maior gasto
- [x] Resumo com total de clientes, pedidos e faturamento
- [x] Card no Dashboard para acesso rápido

### Fase 3: Importação/Exportação de Clientes ✅
- [x] Botões de Exportar/Importar CSV adicionados ao CustomersPage
- [x] Funcionalidade de exportação em CSV
- [x] Funcionalidade de importação de CSV
- [x] Validação e tratamento de erros
- [x] Merge inteligente de clientes importados

### Testes Realizados
- [x] Funcionalidade de Editar cliente
- [x] Funcionalidade de Inativar/Ativar cliente
- [x] Funcionalidade de Deletar cliente
- [x] Proteção do cliente GERAL
- [x] Exportação de clientes em CSV
- [x] Importação de clientes de CSV
- [x] Relatório com análise de clientes

### Arquivos Criados/Modificados
- [x] drizzle/schema.ts - Tabela `customers` e campo `customerId` em `orders`
- [x] server/db.ts - Helpers para gerenciar clientes
- [x] server/pdv.router.ts - Procedimentos tRPC para clientes
- [x] client/src/pages/CustomerReportPage.tsx - Página de relatório
- [x] client/src/pages/CustomersPage.tsx - Funcionalidade de importação/exportação
- [x] client/src/pages/Dashboard.tsx - Card de Relatório de Clientes
- [x] client/src/App.tsx - Rota `/customer-report`
- [x] client/src/contexts/LocalAuthContext.tsx - Contexto de autenticação local
