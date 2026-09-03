# Orientações do projeto

- Manter o escopo de RPG solo MVP. Ler docs/architecture.md antes de mudar regras.
- Nunca tornar exemplos narrativos (como frigideira) escolhas padrão.
- TypeScript + React + Vinext + Cloudflare; preservar lockfile.
- Executar npm run check antes de enviar mudanças.
- Testes não devem consumir APIs reais ou créditos.
- Segredos nunca entram no Git, logs ou mensagens. Não pedir tokens no chat.
- Estado do MVP ainda é temporário. Não anunciar persistência, login ou fallback antes de implementados e validados.
- Após conectar Supabase, toda autorização deve ser server-side e apoiada por RLS.
- Nunca alterar a rolagem ou duplicar efeitos ao repetir/fazer fallback de um turno.
- Documentar bloqueios reais de acesso e não contornar restrições de integração.
