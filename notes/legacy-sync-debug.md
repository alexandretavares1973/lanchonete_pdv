# Depuração da integração de pedidos locais

O erro reportado continua mostrando `responsibleId = 1783799792072`, valor compatível com `Date.now()` usado no localStorage pelo cadastro local de responsáveis, não com um ID oficial de `cashier_responsibles`.

A inspeção do código mostrou que a sincronização estava enviando esse número no payload e que o banco possui responsáveis oficiais. A correção em andamento remove esse campo numérico do payload, resolve o responsável por nome/CPF ou usuário autenticado e só permite inserir uma sessão com um ID oficial validado.

A tentativa de abrir `/reports` no preview redirecionou para o login OAuth. A rota `/local-login` abriu corretamente e exibe as credenciais de demonstração `admin/admin`, permitindo continuar a validação manual pelo login local.

A rota `/local-login` aceitou `admin/admin` e abriu o Dashboard corretamente no preview. A sessão local está autenticada para continuar a reprodução do botão de integração.

A navegação direta para `/reports` redireciona novamente para o OAuth mesmo após o login local; isso ocorre porque o hook de autenticação online é inicializado junto com a autenticação local. Portanto, a reprodução manual direta do relatório ficou bloqueada por essa redireção, mas o código do fluxo foi corrigido para não enviar o ID local.
