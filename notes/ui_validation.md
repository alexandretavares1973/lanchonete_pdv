# Validação visual — 2026-08-12

O preview abriu corretamente na tela de login local, exibindo campos de usuário e senha, link de recuperação e criação de conta.

Foi tentado o acesso com `admin/admin`, conforme contexto herdado, mas o ambiente retornou “Usuário ou senha inválidos”. Isso indica que essa conta de teste não está disponível neste banco/ambiente; não foi possível navegar visualmente até o Relatório de Vendas sem criar ou fornecer uma conta válida.

A checagem de saúde anterior confirmou servidor ativo, TypeScript sem erros, dependências OK e HMR aplicado ao ReportsPage.
