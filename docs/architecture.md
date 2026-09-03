# Decisões e sequência do MVP

## Princípios
Mundo sério, magia presente e limitada, liberdade com consequência. Origem e objeto nunca vêm escolhidos. Ivo pode virar algoz pela história; não é imortal nem inimigo obrigatório. Não expandir mapa, inventário ou combate antes de testar o ciclo básico.

## Etapa 1 — repositório e CI
Código independente de Sites, TypeScript + testes + build e deploy preparado para Cloudflare. Dependências reproduzíveis pelo lockfile. Não há segredos nos arquivos.

## Etapa 2 — Supabase e estado autoritativo
Login, personagens e campanhas vinculados ao usuário. RLS para impedir leitura de partidas alheias. Servidor consulta o estado oficial; cliente envia somente campanha, ação e chave de idempotência. Alterações numéricas não são aceitas diretamente do cliente.

Tabelas planejadas: characters (owner_id e criação), campaigns (owner_id, personagem, estado, versão, memória), turns (campaign_id, request_id único, estado do processamento, intenção, rolagem, resultado e narrativa). Uma campanha só processa um turno por vez. Salvar reserva/rolagem e concluir com transação e verificação da versão; recuperação para turnos interrompidos. Não enviar credencial service_role ao navegador.

## Etapa 3 — provedores e fallback
Contrato independente: interpretar ação e narrar resultado. Workers AI é o padrão incluído e Gemini pessoal é opcional. Próximos adaptadores: Groq e OpenRouter, apenas com modelos confirmados como gratuitos, sem fallback pago. Quotas por usuário serão necessárias para os recursos compartilhados.

Timeout, 429 ou falha transitória podem selecionar próximo provedor. Respeitar Retry-After e limitar tentativas/tempo total. Chave inválida desabilita o provedor até correção. Não usar fallback para contornar recusas de segurança. Trocar modelos no mesmo serviço não renova quotas compartilhadas.

Ao mudar o provedor, preservar regras, memória, estado e rolagem persistida. Não repetir descontos nem sortear novos dados para a mesma ação. Validar saída antes de gravar. Todos indisponíveis: turno recuperável, erro legível e nenhum progresso fictício. Medir latência, falhas e tokens sem registrar chaves.

## Fora do escopo agora
Multiplayer, ranking, monetização, geração de imagens, inventário complexo e evolução mecânica do algoz.
