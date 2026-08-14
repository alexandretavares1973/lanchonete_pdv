# Validação do fluxo de cliente no POS

O login local `/local-login` abriu no preview e aceitou os campos `admin/admin`, com a tela pronta para submissão. A implementação atual do POS foi ajustada para iniciar `selectedCustomer` como `null`, bloquear a confirmação sem cliente e resetar cliente, pagamento e valor recebido após uma venda. O cupom passou a usar `lastCustomerName`, preservando o cliente da venda mesmo após limpar o estado para o próximo pedido.

O login local foi submetido com sucesso e o cartão Novo Pedido abriu `/pos`. O preview mostrou `Nenhum Cardápio Aberto`, portanto não foi possível avançar até o seletor de cliente nem executar uma venda manual, sem criar ou alterar um cardápio apenas para teste. A validação automatizada permanece disponível para a regra de cliente obrigatório e o reset.
