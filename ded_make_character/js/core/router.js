/**
 * Roteador por hash (#/caminho?query). Funciona em hospedagem estática.
 * Padrões: '/', '/:modulo', '/:modulo/novo', '/:modulo/:id/editar'.
 * Suporta uma "guarda" assíncrona (ex.: formulário com alterações não salvas).
 */
function compile(pattern) {
  const keys = [];
  const source = pattern
    .split('/')
    .map(part => {
      if (part.startsWith(':')) {
        keys.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${source || '/'}$`), keys };
}

export function parseHash(hash) {
  const value = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = value.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  return { path: path.length > 1 ? path.replace(/\/+$/, '') : path, query: new URLSearchParams(queryPart) };
}

export function buildHash(path, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== '' && !(key === 'pagina' && Number(value) === 1)) params.set(key, value);
  }
  const qs = params.toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

export function createRouter({ routes, onRoute, onNotFound }) {
  const compiled = routes.map(route => ({ ...route, ...compile(route.pattern) }));
  let guard = null;
  let current = null;
  let skipCount = 0; // hashchanges provocados pelo próprio roteador (desfazer navegação)
  let guardPending = false;
  let maxIdx = 0;

  /** Numera cada entrada do histórico para saber a direção de uma navegação. */
  function stampEntry() {
    const state = history.state;
    if (state && typeof state.idx === 'number') {
      maxIdx = Math.max(maxIdx, state.idx);
      return state.idx;
    }
    const idx = ++maxIdx;
    history.replaceState({ ...(state || {}), idx }, '', location.href);
    return idx;
  }

  function match(path) {
    for (const route of compiled) {
      const m = route.regex.exec(path);
      if (!m) continue;
      const params = {};
      try {
        route.keys.forEach((key, i) => { params[key] = decodeURIComponent(m[i + 1]); });
      } catch {
        return null; // URL malformada (ex.: %E0%A4%A) → não encontrada
      }
      return { route, params };
    }
    return null;
  }

  async function resolve() {
    if (skipCount > 0) {
      skipCount -= 1;
      return;
    }
    const hash = location.hash || '#/';
    // Formulário com alterações: nunca re-renderiza a mesma rota (perderia o que foi digitado).
    if (guard && current && hash === current.hash) return;

    if (guard && current && hash !== current.hash) {
      const targetIdx = history.state?.idx;
      // Deslocamento no histórico: push (link) = +1 novo; Voltar/Avançar podem saltar vários passos.
      const delta = typeof targetIdx === 'number' ? targetIdx - current.idx : null;
      // Desfaz a navegação voltando à entrada do formulário, sem criar entradas mortas.
      skipCount += 1;
      history.go(delta == null ? -1 : -delta);
      if (guardPending) return; // já há uma confirmação aberta: não empilha outra
      guardPending = true;
      let allowed = false;
      try {
        allowed = await guard();
      } finally {
        guardPending = false;
      }
      if (!allowed) return;
      guard = null;
      // Repete a navegação original, respeitando a direção e o tamanho do salto.
      if (delta == null) location.hash = hash;
      else history.go(delta);
      return;
    }

    guard = null;
    const idx = stampEntry();
    const { path, query } = parseHash(hash);
    const found = match(path);
    current = { hash, path, query, idx, params: found?.params || {}, name: found?.route.name || null };
    if (found) await onRoute({ ...current, route: found.route });
    else await onNotFound(current);
  }

  return {
    start() {
      window.addEventListener('hashchange', resolve);
      if (!location.hash) history.replaceState(history.state, '', '#/');
      return resolve();
    },
    navigate(path, query) {
      const hash = buildHash(path, query);
      if (hash === location.hash) return resolve();
      location.hash = hash;
      return undefined;
    },
    /** Atualiza a query sem re-renderizar (ex.: digitação na busca). */
    replaceQuery(query) {
      if (!current) return;
      const hash = buildHash(current.path, query);
      history.replaceState(history.state, '', hash);
      current = { ...current, hash, query: parseHash(hash).query };
    },
    reload: () => resolve(),
    setGuard(fn) {
      guard = fn;
    },
    clearGuard() {
      guard = null;
    },
    get current() {
      return current;
    },
  };
}
