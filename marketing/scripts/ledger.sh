#!/usr/bin/env bash
# Guarda o ledger (o que já foi publicado) numa branch própria, "marketing-ledger", para o histórico do
# código não encher de commits de robô. A branch é órfã: só tem o ledger.json.
#
#   ledger.sh checkout   monta a branch em ./.ledger (cria, vazia, se ainda não existir no remoto)
#   ledger.sh commit     grava e envia o ledger.json se mudou
# LEDGER_DIR muda a pasta (padrão .ledger); LEDGER_BRANCH muda a branch. Requer git 2.42+ (worktree add --orphan).
set -euo pipefail

BRANCH="${LEDGER_BRANCH:-marketing-ledger}"
DIR="${LEDGER_DIR:-.ledger}"

case "${1:-}" in
  checkout)
    # Só cria a branch quando o remoto CONFIRMA que ela não existe (ls-remote sai com 2). Qualquer outra falha
    # (rede, permissão) aborta: criar um ledger vazio por engano faria a execução seguinte republicar tudo.
    rc=0
    git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1 || rc=$?
    if [ "$rc" -eq 0 ]; then
      git fetch --depth=1 origin "$BRANCH"
      git worktree add -B "$BRANCH" "$DIR" FETCH_HEAD
    elif [ "$rc" -eq 2 ]; then
      git worktree add --orphan -b "$BRANCH" "$DIR"
      printf '{
  "version": 1,
  "posts": {}
}
' > "$DIR/ledger.json"
    else
      echo "Não consegui consultar o remoto (git ls-remote saiu com $rc); abortando para não perder o ledger." >&2
      exit "$rc"
    fi
    ;;
  commit)
    cd "$DIR"
    git add ledger.json
    if git diff --cached --quiet; then
      echo "Ledger sem mudanças."
      exit 0
    fi
    git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit -q -m "ledger: $(date -u +%Y-%m-%dT%H:%MZ)"
    # Sem tentar "consertar": se o push for rejeitado, outra execução gravou antes (o workflow é serial, então
    # não deveria) ou faltou permissão. Falhar alto é melhor do que deixar o ledger divergir em silêncio.
    git push origin "HEAD:$BRANCH"
    ;;
  *)
    echo "uso: ledger.sh checkout|commit" >&2
    exit 2
    ;;
esac
