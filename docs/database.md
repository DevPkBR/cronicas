# Banco de dados — Cronicas

Projeto Supabase `ldxjykligttssfihgjou`, São Paulo. Independente de Devtrine.

## Migrações aplicadas

- `20260903191241_create_game_persistence.sql`: personagens, campanhas, turnos e RLS.
- `20260903194551_atomic_campaign_turns.sql`: criação atômica, reserva exclusiva, checkpoint e conclusão idempotente.

Arquivos exportados com as versões retornadas pelo histórico remoto e o SQL executado. Não reaplicar manualmente no projeto já configurado.

## Autorização

O navegador envia um access token do Supabase. O backend valida-o com `auth.getUser(token)` antes de acessar o banco com `SUPABASE_SECRET_KEY`; o proprietário vem exclusivamente dessa validação. Todas as consultas privilegiadas filtram esse proprietário.

RLS nas três tabelas permite apenas leitura dos próprios registros para `authenticated`. `anon` não tem acesso. Escritas e execução das funções são exclusivas de `service_role`; privilégios padrão de PUBLIC foram revogados. Chaves estrangeiras compostas impedem vínculos entre donos diferentes.

A chave publicável pode estar no navegador. A chave secreta é exclusiva do Worker, nunca do GitHub, frontend ou chat. O backend retorna 503 enquanto ela estiver ausente.

## Fluxo de um turno

1. Reservar request_id e d12 sob bloqueio da campanha. Só existe um turno inacabado por campanha.
2. A reserva concede uma licença de processamento por 120 segundos. Outra tentativa simultânea recebe conflito.
3. Interpretar a ação, resolver as regras e salvar interpretação e resultado antes de pedir a narrativa.
4. Validar a narrativa, atualizar a ficha e concluir o turno em uma única transação.
5. Em falha, liberar a licença sem perder rolagem ou resultado. Se o processo morrer, a licença expira. Repetições de turno concluído só devolvem a aventura atual.

Uma ação pendente precisa ser retomada antes de outra. Uma segunda aba com versão antiga recebe conflito e deve atualizar a aventura. O servidor aceita apenas campanha, request_id, ação e versão; rejeita ficha enviada pelo cliente. A criação também aceita uma identidade de requisição para evitar duplicação em retries.

Limite do MVP: 20 campanhas por conta; histórico exibido com abertura e até 100 turnos recentes, histórico completo no banco. O narrador recebe as últimas oito cenas e a memória resumida. Chaves de IA ficam apenas na memória da página e nas requisições ao provedor, nunca no banco.

## Verificação

`supabase/tests/persistence.sql` valida RLS, donos, permissões, unicidade e limites de ficha. `supabase/tests/atomic-turns.sql` valida criação idempotente, licença exclusiva, preservação de rolagem/resultado, rejeição de licença antiga, resultado mecânico imutável e conclusão única. Ambos executados no Supabase com fixtures revertidas em rollback, sem envio de e-mails.

Advisors de segurança sem alertas após a migração. Tipos regenerados do banco real. Os testes SQL exigem conexão privilegiada e não fazem parte do CI atual. Os testes automatizados da aplicação simulam Auth, banco e IA para verificar o contrato de retry sem consumir cotas.

## Pendências de ativação

Código de login e persistência implementado, mas ainda sem publicação Cloudflare nem teste completo com usuário real. Configure segredo do servidor, URL de retorno do Auth e entrega de e-mail conforme `docs/workflow.md`. O protótipo anterior no ChatGPT Sites continua independente.
