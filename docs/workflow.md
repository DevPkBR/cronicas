# Workflow do projeto

1. Mudanças em uma branch e pull request para main.
2. Actions instala pelo lockfile, verifica TypeScript, executa testes sem API e compila.
3. Com verificações aprovadas, integrar à main. Proteção de branch deve ser configurada no GitHub para torná-las obrigatórias.
4. Push na main valida novamente e publica no Cloudflare se CLOUDFLARE_DEPLOY_ENABLED=true.

## Ativar publicação
A aplicação usa Worker com API; GitHub Pages não executa o servidor do narrador.

No GitHub, Settings → Secrets and variables → Actions:
- Secret CLOUDFLARE_API_TOKEN: token restrito à conta/projeto, com permissão de editar Workers.
- Secret CLOUDFLARE_ACCOUNT_ID: conta de destino.
- Variable CLOUDFLARE_DEPLOY_ENABLED: true somente após definir a conta de destino e aprovar a publicação.

O workflow usa o environment production. Configurar revisores desse environment é opcional. Não exige pagamento de IA nem inclui credenciais no código. Sem a variável de habilitação, o deploy aparece como skipped; isso não significa publicação concluída.

O nome do Worker é cronicas. Antes de ativar, confirme que não existe outro Worker com esse nome que precise ser preservado. O primeiro deploy externo pode disponibilizar o jogo publicamente, conforme a configuração da conta.

O banco está configurado; o Worker precisa do segredo abaixo. Chaves de IA compartilhadas ficam para outra etapa. Não colocar valores secretos em issues, PRs, commits ou no chat.

## Regras de manutenção
- Corrigir teste/build com falha antes de integrar.
- Testes comuns não chamam provedores reais.
- Não alterar permissões do GitHub para contornar erros de integração.
- Não publicar automaticamente mudanças de schema até estabelecer migrações revisadas e recuperação.

## Ativar login e salvamento

1. Publique o Worker seguindo as etapas acima. Sem segredo, a demonstração funciona e a API de campanhas informa que o salvamento está indisponível.
2. No Supabase **Cronicas**, abra **Project Settings → API Keys**. Copie uma chave secreta do projeto (não a publicável). Não envie o valor ao chat.
3. No Cloudflare, abra **Workers & Pages → cronicas → Settings → Variables and Secrets**. Adicione **Secret** chamado `SUPABASE_SECRET_KEY`, cole o valor e aplique a configuração. Não use prefixo `NEXT_PUBLIC_` nem inclua o segredo em arquivos versionados.
4. No Supabase, abra **Authentication → URL Configuration**: Site URL deve ser a URL HTTPS publicada; inclua a mesma URL com `/` final em Redirect URLs. Para desenvolvimento, autorize explicitamente a origem local que usar.
5. Em **Authentication → Sign In / Providers**, mantenha e-mail/senha habilitados e confirmação de e-mail ativa. Configure SMTP próprio antes de abrir cadastros ao público: o SMTP padrão só envia a integrantes da organização e tem limites restritos. Não adicione jogadores à equipe administrativa para contornar essa restrição.
6. Com a conta de teste do responsável, cadastre-se, confirme o e-mail, entre e crie uma aventura. Configure sua chave de IA, conclua um turno, recarregue e retome. Saia, entre novamente e confira a mesma ficha. Verifique que outra conta não vê a campanha.

O SDK armazena a sessão de login no navegador para permitir retomada. A chave de IA é só memória: deve ser informada novamente após recarregar. A demonstração permanece sem conta e sem salvamento. O botão “Sair desta sessão” limpa a sessão local.

No desenvolvimento, use um arquivo `.dev.vars` ignorado pelo Git com `SUPABASE_SECRET_KEY` e rode `npm run dev`; o plugin do Cloudflare carrega esse arquivo. O build não exige segredo. A configuração atual usa `nodejs_compat` e uma data compatível com segredos em `process.env`.

Referências oficiais: [SMTP do Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [autenticação por senha](https://supabase.com/docs/guides/auth/passwords), [variáveis no Worker](https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/).
