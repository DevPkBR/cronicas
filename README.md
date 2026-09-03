# Crônicas

MVP de RPG solo em português, com narrador de IA, ações livres e regras controladas pelo servidor. Mundo sério, magia limitada e rivalidade que surge das decisões.

## Estado atual
- Personagem com nome, origem, motivação e objeto escolhidos pelo jogador, sem valores preenchidos.
- Interface responsiva, histórico, ficha, d12, vida, energia e Centelha.
- Gemini 2.5 Flash-Lite com chave própria em memória; duas chamadas por turno.
- Demonstração de três cenas, claramente identificada como sem IA.
- Progresso ainda em memória: recarregar reinicia a partida.
- Supabase, login, persistência e fallback entre provedores são próximas etapas; não estão ativos.

## Stack e execução
TypeScript, React e Vinext (API compatível com Next.js, ainda experimental), Vite e Cloudflare Workers. A migração preserva o runtime testado do protótipo, com dependências fixadas no package-lock.json.

Node 22.13 ou superior:

```sh
npm ci
npm run dev
npm run check
```

`check` executa TypeScript, testes e build. Os testes da IA usam respostas simuladas e não consomem cota. O build não exige chaves. `npm run deploy` publica o build em Cloudflare mediante credenciais.

## GitHub Actions
Pushes na main e pull requests executam as verificações. Deploy após validação está preparado, mas fica desativado até configurar Cloudflare. Leia [docs/workflow.md](docs/workflow.md).

## Limites do experimento
O estado recebido do cliente ainda não é autenticado: não usar para ranking ou recompensas compartilhadas. Inventário fixo e recompensas narrativas. Não há progressão mecânica de níveis nem ficha independente de inimigo. A coerência narrativa depende do modelo. A chave do jogador não é armazenada, não aparece em URLs e não é registrada em logs. O uso gratuito depende da cota da conta no Google.

O protótipo original publicado em ChatGPT Sites continua independente; este repositório não modifica aquela publicação automaticamente.

## Próximo marco
Entrar, criar personagem, salvar, sair e continuar a mesma partida. Depois: Gemini → Groq → modelos gratuitos do OpenRouter, preservando uma única rolagem por turno. Decisões e etapas em [docs/architecture.md](docs/architecture.md).
