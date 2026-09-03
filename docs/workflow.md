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

Banco e chaves de IA compartilhadas serão configurados em etapas posteriores. Não colocar valores secretos em issues, PRs, commits ou no chat.

## Regras de manutenção
- Corrigir teste/build com falha antes de integrar.
- Testes comuns não chamam provedores reais.
- Não alterar permissões do GitHub para contornar erros de integração.
- Não publicar automaticamente mudanças de schema até estabelecer migrações revisadas e recuperação.
