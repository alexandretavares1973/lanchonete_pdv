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
