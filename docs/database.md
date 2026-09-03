# Banco de dados — Cronicas

Projeto Supabase: `ldxjykligttssfihgjou`, região `sa-east-1` (São Paulo).
Projeto independente de Devtrine. Nenhuma credencial está neste documento.

## Migração aplicada
`20260903191241_create_game_persistence.sql` foi aplicada no Supabase hospedado. O arquivo usa a versão retornada pelo histórico remoto, preservando o SQL executado. Foi exportado após a aplicação; não reaplicar manualmente a mesma migração no projeto já configurado.

- `characters`: escolhas explícitas do personagem, vinculadas a um usuário Auth.
- `campaigns`: estado canônico, versão, localização e memória do narrador.
- `turns`: ação, request_id, sequência, rolagem, interpretação, resultado e narrativa.

## Autorização
RLS habilitada nas três tabelas. `authenticated` tem apenas SELECT dos registros cujo owner_id corresponde a auth.uid(). `anon` não tem acesso. Escritas são reservadas ao serviço de backend, que deverá validar a sessão e a propriedade da campanha antes de usar suas credenciais privilegiadas. Esse backend ainda não está implementado.

Chaves estrangeiras compostas impedem campanhas/personagens/turnos com donos diferentes. Índices apoiam leitura por jogador e histórico por campanha. Um request_id e uma sequência não podem se repetir na mesma campanha. Só pode existir um turno não concluído por campanha; uma falha deve ser retomada com o mesmo request_id e rolagem.

A estrutura não implementa sozinha a transação do jogo: reserva, retries, resultado e conclusão precisam ser integrados ao servidor. Não gravar chaves de IA no estado, histórico ou erros. `updated_at` deverá ser atualizado pelo backend na mesma transação.

## Verificação realizada
`supabase/tests/persistence.sql` foi executado no banco em transação com rollback. Verificou:
- acesso à própria partida e isolamento de outro usuário;
- bloqueio de escrita pelo cliente e leitura anônima;
- rejeição de vínculos entre donos diferentes;
- rejeição de request duplicado e turno concorrente;
- limites de vida, correspondência de versão e integridade de conclusão.

Os usuários e registros de teste foram revertidos. Contagem final das três tabelas: zero. Advisors de segurança: sem alertas na data da migração.

Os testes SQL exigem um banco Supabase e não são executados pelo CI de aplicação atual. Tipos TypeScript foram gerados a partir do banco real em `lib/database.types.ts`.

## Próxima integração
Login no frontend, validação de sessão no backend, criação de campanha, listagem/retomada de partidas e processamento transacional de turnos. O jogo publicado ainda usa estado temporário; não anunciar salvamento automático até essa integração ser concluída e testada.
