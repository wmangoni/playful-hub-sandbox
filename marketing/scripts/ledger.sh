#!/usr/bin/env bash
# Guarda o ledger (o que já foi publicado) numa branch própria, "marketing-ledger", para o histórico do
# código não encher de commits de robô. A branch é órfã: só tem o ledger.json.
#
#   ledger.sh checkout   monta a branch em ./.ledger (cria, vazia, se ainda não existir no remoto)
#   ledger.sh commit     grava e envia o ledger.json se mudou
# LEDGER_DIR muda a pasta (padrão .ledger); LEDGER_BRANCH muda a branch.
set -euo pipefail

BRANCH="${LEDGER_BRANCH:-marketing-ledger}"
DIR="${LEDGER_DIR:-.ledger}"

case "${1:-}" in
  checkout)
    if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
      git fetch --depth=1 origin "$BRANCH"
      git worktree add -B "$BRANCH" "$DIR" FETCH_HEAD
    else
      git worktree add --orphan -b "$BRANCH" "$DIR"
      printf '{\n  "version": 1,\n  "posts": {}\n}\n' > "$DIR/ledger.json"
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
    # se outra execução gravou antes (não deveria, o workflow é serial), integra em vez de falhar
    git push origin "HEAD:$BRANCH" || { git pull --rebase origin "$BRANCH" && git push origin "HEAD:$BRANCH"; }
    ;;
  *)
    echo "uso: ledger.sh checkout|commit" >&2
    exit 2
    ;;
esac
