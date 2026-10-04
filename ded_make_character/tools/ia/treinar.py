"""
Treino das redes da IA de combate (TASK_009 §6), em PyTorch.

    python ded_make_character/tools/ia/treinar.py --dados D:/.../ded-ia-dados/g0 --saida D:/.../ded-ia-dados/redes/v1 \
        [--anteriores D:/.../g0:0.3,D:/.../g1:0.1] [--geracao 1] [--epocas 10] [--lote 4096] [--semente 1] [--unica]

Lê os ramos e os extras gravados por `gerar-lutas.mjs` (float32, colunas em `resumo.json`), separa
treino e validação por confronto (15% pela validação, por um hash estável do número do confronto:
a mesma partição em todas as gerações), normaliza as entradas pelo treino e treina, por perfil
(marcial e recursos), um perceptron de 2 camadas ocultas (100 → 128 → 64 → 2): o logit da vitória
(entropia cruzada) e a margem (tanh, erro quadrático, peso 0,5). Cada lote tem metade de exemplos
de ramificação e metade de extras. As gerações anteriores (`--anteriores pasta:fração`) entram
subamostradas por essa fração (por confronto), em vez de com peso menor: o efeito é o mesmo e cabe na
memória. A melhoria fora da luta é medida só na geração atual (nas anteriores, π era outra política).

Mede a melhoria fora da luta (§6.3) na validação: em cada ponto, o resultado do caminho que a
política escolheria entre os sorteados (a maior nota, mas fica a escolha clássica se a melhor não
passar dela por δ), menos o do caminho 0 (π), para vários δ. O intervalo de 95% trata o confronto
como unidade (os 10 pontos de um confronto são parecidos). Grava `rede-<perfil>.json` (o formato de
`criarRede` em `js/rules/ia30.js`) e `relatorio.json`. Com `--unica`, treina também uma rede só para
os dois perfis e a mede em cada um (§3).
"""
import argparse
import glob
import json
import math
import os
import sys
import time

import numpy as np
import torch
import torch.nn as nn

PESO_MARGEM = 0.1  # nota = P(vitória) + 0,1 × margem (§4.4), igual a PESO_MARGEM de ia30.js
# a grade de δ do diagnóstico (a política usa DELTA_PADRAO de ia30.js, calibrado no espelho)
DELTAS = [0.0, 0.005, 0.01, 0.015, 0.02, 0.03, 0.1, 0.2]
DELTA_DIAGNOSTICO = 0.015
OCULTAS = (128, 64)


def resumo_de(pasta):
    with open(os.path.join(pasta, 'resumo.json'), encoding='utf-8') as f:
        return json.load(f)


def coletar(fontes, nome, colunas, perfil, semente):
    """
    As linhas de um perfil (None = todos) nos arquivos `nome-*.f32` das fontes, já separadas em treino
    e validação: `(treino, validacao)`, cada um com `X` (as entradas, float32) e as colunas de
    controle. Lê com np.memmap e copia só as linhas escolhidas (os dados inteiros não cabem na
    memória ao lado de tudo o mais); as fontes anteriores entram subamostradas pela fração.
    """
    c = {n: i for i, n in enumerate(colunas)}
    inicio = c['rodadas'] + 1
    controle = [n for n in ('vitoria', 'margem', 'confronto', 'ponto', 'caminho', 'eh_classica', 'perfil') if n in c] + ['fonte']
    escolhas = []
    for k, (pasta, fracao) in enumerate(fontes):
        for arquivo in sorted(glob.glob(os.path.join(pasta, f'{nome}-*.f32'))):
            M = np.memmap(arquivo, dtype=np.float32, mode='r').reshape(-1, len(colunas))
            base = np.ones(len(M), bool) if perfil is None else M[:, c['perfil']] == perfil
            if fracao < 1:
                base &= fica(M[:, c['confronto']], fracao)
            val = eh_validacao(M[:, c['confronto']])
            escolhas.append((M, base & ~val, base & val, k))
    out = []
    for parte in (1, 2):
        n = int(sum(e[parte].sum() for e in escolhas))
        d = {'X': np.empty((n, len(colunas) - inicio), np.float32), **{k: np.empty(n, np.float32) for k in controle}}
        i = 0
        for e in escolhas:
            linhas = e[0][e[parte]]
            d['X'][i:i + len(linhas)] = linhas[:, inicio:]
            for k in controle:
                d[k][i:i + len(linhas)] = e[3] if k == 'fonte' else linhas[:, c[k]]
            i += len(linhas)
            del linhas
        out.append(d)
    return out


def hash_de(confrontos, multiplicador):
    """Hash estável do número do confronto, de 0 a 65535 (os bits altos: os baixos herdam a paridade)."""
    c = confrontos.astype(np.uint64)
    return ((c * np.uint64(multiplicador)) % np.uint64(2 ** 32)) >> np.uint64(16)


def eh_validacao(confrontos):
    """15% dos confrontos, por um hash estável do número (a mesma partição em toda geração)."""
    return hash_de(confrontos, 2654435761) % np.uint64(100) < np.uint64(15)


def fica(confrontos, fracao):
    """Subamostra de uma geração anterior: confrontos inteiros (os caminhos de um ponto ficam juntos)."""
    return hash_de(confrontos, 2246822519).astype(np.float64) / 65536.0 < fracao


def media_desvio(blocos):
    """Média e desvio de cada coluna, somando em float64 por blocos (sem copiar tudo)."""
    soma = soma2 = None
    n = 0
    for X in blocos:
        for i in range(0, len(X), 1 << 17):
            b = X[i:i + (1 << 17)].astype(np.float64)
            soma = b.sum(0) if soma is None else soma + b.sum(0)
            soma2 = (b * b).sum(0) if soma2 is None else soma2 + (b * b).sum(0)
            n += len(b)
    mu = soma / n
    sd = np.sqrt(np.maximum(soma2 / n - mu * mu, 0))
    sd[sd < 1e-6] = 1.0
    return mu, sd


class Rede(nn.Module):
    def __init__(self, entradas):
        super().__init__()
        camadas, n = [], entradas
        for h in OCULTAS:
            camadas += [nn.Linear(n, h), nn.ReLU()]
            n = h
        camadas.append(nn.Linear(n, 2))
        self.rede = nn.Sequential(*camadas)

    def forward(self, x):
        return self.rede(x)


def nota(saida):
    """Nota da ação (§4.4), a mesma conta de criarRede.avaliar."""
    return torch.sigmoid(saida[:, 0]) + PESO_MARGEM * torch.tanh(saida[:, 1])


def perda(saida, vitoria, margem):
    bce = nn.functional.binary_cross_entropy_with_logits(saida[:, 0], vitoria)
    mse = ((torch.tanh(saida[:, 1]) - margem) ** 2).mean()
    return bce + 0.5 * mse


def em_blocos(rede, X, dispositivo, f, bloco=65536):
    with torch.no_grad():
        return [f(rede(torch.from_numpy(X[i:i + bloco]).to(dispositivo))) for i in range(0, len(X), bloco)]


def perda_de(rede, X, vit, marg, dispositivo, bloco=65536):
    """Perda média de um conjunto inteiro, em blocos (para caber na GPU)."""
    total = 0.0
    with torch.no_grad():
        for i in range(0, len(X), bloco):
            s = rede(torch.from_numpy(X[i:i + bloco]).to(dispositivo))
            total += perda(s, torch.from_numpy(vit[i:i + bloco]).to(dispositivo), torch.from_numpy(marg[i:i + bloco]).to(dispositivo)).item() * len(s)
    return total / max(1, len(X))


def melhoria_fora_da_luta(notas, v, m, confronto, ponto, caminho, classica, deltas=DELTAS):
    """
    Por δ: a média, entre os pontos, de (resultado do caminho que a política escolheria − resultado do
    caminho 0), com o intervalo de 95% robusto por confronto (os pontos de um confronto não são
    independentes). Mais o teto ruidoso (o melhor caminho sorteado, escolhido pelo resultado) e a
    média das alternativas.
    """
    grupo = confronto.astype(np.int64) * 100 + ponto.astype(np.int64)
    ordem = np.lexsort((caminho, grupo))
    g, c, n, v, m, h, conf = grupo[ordem], caminho[ordem], notas[ordem], v[ordem], m[ordem], classica[ordem], confronto[ordem]
    inicios = np.flatnonzero(np.r_[True, g[1:] != g[:-1]])
    fins = np.r_[inicios[1:], len(g)]
    validos = [(i, j) for i, j in zip(inicios, fins) if j - i >= 2 and c[i] == 0]
    def resumo(diffs, grupos_conf):
        d = np.array(diffs)
        if not len(d):
            return {'pontos': 0}
        media = d.mean()
        # erro-padrão robusto por confronto: soma dos resíduos de cada confronto
        _, idx = np.unique(np.array(grupos_conf), return_inverse=True)
        residuos = np.bincount(idx, weights=d - media)
        ep = math.sqrt((residuos ** 2).sum()) / len(d)
        return {'pontos': int(len(d)), 'confrontos': int(idx.max() + 1), 'vitoria': float(media), 'ic95': [float(media - 1.96 * ep), float(media + 1.96 * ep)]}
    out = {}
    for delta in deltas:
        dv, dm, cs, trocas = [], [], [], 0
        for i, j in validos:
            k = i + int(np.argmax(n[i:j]))
            hs = [x for x in range(i, j) if h[x] == 1]
            if hs and k != hs[0] and n[k] < n[hs[0]] + delta:
                k = hs[0]  # a escolha clássica fica, a menos que a melhor passe dela por δ
            dv.append(v[k] - v[i])
            dm.append(m[k] - m[i])
            cs.append(conf[i])
            trocas += k != i
        out[str(delta)] = {**resumo(dv, cs), 'margem': float(np.mean(dm)) if dm else None, 'trocas': trocas / max(1, len(validos))}
    out['teto_ruidoso'] = float(np.mean([v[i:j].max() - v[i] for i, j in validos])) if validos else None
    out['media_das_alternativas'] = float(np.mean([v[i + 1:j].mean() - v[i] for i, j in validos])) if validos else None
    return out


def treinar(nome, d, args, dispositivo):
    """Treina uma rede com os dados `d` (já normalizados). Devolve (rede, relatório)."""
    torch.manual_seed(args.semente)
    rng = np.random.default_rng(args.semente)
    Xr, vr, mr = torch.from_numpy(d['Xr']), torch.from_numpy(d['vr']), torch.from_numpy(d['mr'])
    Xe, ve, me = torch.from_numpy(d['Xe']), torch.from_numpy(d['ve']), torch.from_numpy(d['me'])
    rede = Rede(d['Xr'].shape[1]).to(dispositivo)
    otimizador = torch.optim.Adam(rede.parameters(), lr=1e-3)
    meio = args.lote // 2
    passos = max(1, (len(Xr) + len(Xe)) // args.lote)
    historico, melhor, estado_melhor, sem_melhora = [], float('inf'), None, 0
    for epoca in range(args.epocas):
        rede.train()
        t0 = time.time()
        for _ in range(passos):
            ir = torch.from_numpy(rng.integers(0, len(Xr), meio))
            partes = [(Xr[ir], vr[ir], mr[ir])]
            if len(Xe):
                ie = torch.from_numpy(rng.integers(0, len(Xe), meio))
                partes.append((Xe[ie], ve[ie], me[ie]))
            x, v, m = (torch.cat([p[k] for p in partes]).to(dispositivo, non_blocking=True) for k in range(3))
            l = perda(rede(x), v, m)
            otimizador.zero_grad()
            l.backward()
            otimizador.step()
        rede.eval()
        lv = 0.5 * (perda_de(rede, d['Xrv'], d['vrv'], d['mrv'], dispositivo) + (perda_de(rede, d['Xev'], d['vev'], d['mev'], dispositivo) if len(d['Xev']) else 0))
        notas = np.concatenate(em_blocos(rede, d['Xrv'], dispositivo, lambda s: nota(s).cpu().numpy())) if len(d['Xrv']) else np.zeros(0)
        a = d['atualrv']
        diag = melhoria_fora_da_luta(notas[a], d['vrv'][a], d['mrv'][a], d['confrv'][a], d['pontorv'][a], d['caminhorv'][a], d['classicarv'][a], deltas=[DELTA_DIAGNOSTICO])[str(DELTA_DIAGNOSTICO)]
        historico.append({'epoca': epoca + 1, 'perda_validacao': lv, 'melhoria': diag.get('vitoria'), 'segundos': time.time() - t0})
        print(f'  [{nome}] época {epoca + 1}: perda de validação {lv:.4f}, melhoria fora da luta {diag.get("vitoria", float("nan")):+.4f} ({time.time() - t0:.1f} s)')
        if math.isfinite(lv) and lv < melhor - 1e-4:
            melhor, estado_melhor, sem_melhora = lv, {k: t.detach().clone() for k, t in rede.state_dict().items()}, 0
        else:
            sem_melhora += 1
            if sem_melhora >= 2:
                break
    if estado_melhor is None:
        raise SystemExit(f'[{nome}] a perda de validação nunca foi um número: nada a exportar')
    rede.load_state_dict(estado_melhor)
    rede.eval()
    notas = np.concatenate(em_blocos(rede, d['Xrv'], dispositivo, lambda s: nota(s).cpu().numpy())) if len(d['Xrv']) else np.zeros(0)
    a = d['atualrv']  # só a geração atual: nas anteriores, o caminho 0 era outra política
    melhoria = melhoria_fora_da_luta(notas[a], d['vrv'][a], d['mrv'][a], d['confrv'][a], d['pontorv'][a], d['caminhorv'][a], d['classicarv'][a])
    return rede, {'historico': historico, 'perda_validacao': melhor, 'melhoria': melhoria, 'ramos_treino': int(len(Xr)), 'ramos_validacao': int(len(d['Xrv'])), 'extras_treino': int(len(Xe)), 'extras_validacao': int(len(d['Xev']))}


def exportar(rede, mu, sd, perfil, geracao, nomes_estado, nomes_acao, versao, extra, arquivo):
    lineares = [m for m in rede.rede if isinstance(m, nn.Linear)]
    json_rede = {
        'formato': 'ded-ia-rede', 'versaoEntradas': versao, 'perfil': perfil, 'geracao': geracao,
        'entradas': {'estado': len(nomes_estado), 'acao': len(nomes_acao), 'nomes': nomes_estado + nomes_acao},
        'normalizacao': {'media': [round(float(x), 6) for x in mu], 'desvio': [round(float(x), 6) for x in sd]},
        'camadas': [{'pesos': [[round(float(w), 7) for w in linha] for linha in l.weight.detach().cpu().numpy()], 'vies': [round(float(b), 7) for b in l.bias.detach().cpu().numpy()]} for l in lineares],
        'pesoMargem': PESO_MARGEM,
        'treino': extra,
    }
    with open(arquivo, 'w', encoding='utf-8') as f:
        json.dump(json_rede, f, ensure_ascii=False, separators=(',', ':'))


def main():
    sys.stdout.reconfigure(encoding='utf-8')  # o terminal do Windows não é UTF-8 (δ, acentos)
    p = argparse.ArgumentParser()
    p.add_argument('--dados', required=True)
    p.add_argument('--anteriores', default='', help='pasta:fração,… (as gerações anteriores, subamostradas)')
    p.add_argument('--saida', required=True)
    p.add_argument('--geracao', type=int, default=1)
    p.add_argument('--epocas', type=int, default=10)
    p.add_argument('--lote', type=int, default=4096)
    p.add_argument('--semente', type=int, default=1)
    p.add_argument('--unica', action='store_true')
    args = p.parse_args()
    dispositivo = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f'dispositivo: {dispositivo}')
    os.makedirs(args.saida, exist_ok=True)

    fontes = [(args.dados, 1.0)] + [(x.rsplit(':', 1)[0], float(x.rsplit(':', 1)[1])) for x in args.anteriores.split(',') if x]
    resumo = resumo_de(args.dados)
    for pasta, _ in fontes[1:]:
        r = resumo_de(pasta)
        if r['colunasRamos'] != resumo['colunasRamos'] or r['colunasExtras'] != resumo['colunasExtras']:
            raise SystemExit(f'{pasta}: colunas diferentes das da geração atual')
    cr, ce = resumo['colunasRamos'], resumo['colunasExtras']
    nomes = cr[cr.index('rodadas') + 1:]
    assert nomes == ce[ce.index('rodadas') + 1:], 'as entradas dos ramos e dos extras diferem'
    n_estado = next(i for i, n in enumerate(nomes) if n.startswith('tipo_'))
    nomes_estado, nomes_acao = nomes[:n_estado], nomes[n_estado:]
    relatorio = {'fontes': fontes, 'geracao': args.geracao, 'dispositivo': dispositivo, 'semente': args.semente, 'entradas': len(nomes), 'perfis': {}}

    def dados_de(perfil):
        """Treino e validação de um perfil, com as entradas normalizadas no lugar (float32)."""
        rt, rv = coletar(fontes, 'ramos', cr, perfil, args.semente)
        et, ev = coletar(fontes, 'extras', ce, perfil, args.semente)
        mu, sd = media_desvio([rt['X'], et['X']])
        for x in (rt['X'], et['X'], rv['X'], ev['X']):
            x -= mu.astype(np.float32)
            x /= sd.astype(np.float32)
        d = {'Xr': rt['X'], 'vr': rt['vitoria'], 'mr': rt['margem'], 'Xe': et['X'], 've': et['vitoria'], 'me': et['margem'],
             'Xrv': rv['X'], 'vrv': rv['vitoria'], 'mrv': rv['margem'], 'Xev': ev['X'], 'vev': ev['vitoria'], 'mev': ev['margem'],
             'confrv': rv['confronto'], 'pontorv': rv['ponto'], 'caminhorv': rv['caminho'].astype(np.int64), 'classicarv': rv['eh_classica'], 'perfilrv': rv['perfil'], 'atualrv': rv['fonte'] == 0}
        print(f'  validação: {len(np.unique(rv["confronto"]))} confrontos')
        return d, mu, sd

    perfis = [('marcial', 0), ('recursos', 1)]
    for nome, codigo in perfis + ([('unica', None)] if args.unica else []):
        d, mu, sd = dados_de(codigo)
        print(f'{nome}: {len(d["Xr"])} ramos e {len(d["Xe"])} extras de treino; {len(d["Xrv"])} ramos de validação')
        rede, rel = treinar(nome, d, args, dispositivo)
        relatorio['perfis'][nome] = rel
        mel = rel['melhoria']
        print(f'  [{nome}] melhoria fora da luta (vitória): ' + ', '.join(f'δ={x}: {mel[str(x)]["vitoria"]:+.4f} [{mel[str(x)]["ic95"][0]:+.4f}, {mel[str(x)]["ic95"][1]:+.4f}]' for x in DELTAS if mel[str(x)].get('pontos')) + f'; teto ruidoso {mel["teto_ruidoso"]:+.4f}, alternativas {mel["media_das_alternativas"]:+.4f}')
        if nome != 'unica':
            exportar(rede, mu, sd, nome, args.geracao, nomes_estado, nomes_acao, resumo['versaoEntradas'], {'fontes': fontes, 'perda_validacao': rel['perda_validacao'], 'melhoria': mel, 'semente': args.semente}, os.path.join(args.saida, f'rede-{nome}.json'))
        else:
            # a rede única medida em cada perfil, para comparar com as duas
            notas = np.concatenate(em_blocos(rede, d['Xrv'], dispositivo, lambda saida: nota(saida).cpu().numpy()))
            for pn, pc in perfis:
                m = (d['perfilrv'] == pc) & d['atualrv']
                rel[f'melhoria_{pn}'] = melhoria_fora_da_luta(notas[m], d['vrv'][m], d['mrv'][m], d['confrv'][m], d['pontorv'][m], d['caminhorv'][m], d['classicarv'][m])
                x = rel[f'melhoria_{pn}'][str(DELTA_DIAGNOSTICO)]
                print(f'  [única em {pn}] melhoria (δ={DELTA_DIAGNOSTICO}): {x["vitoria"]:+.4f} [{x["ic95"][0]:+.4f}, {x["ic95"][1]:+.4f}]')
        del d
    with open(os.path.join(args.saida, 'relatorio.json'), 'w', encoding='utf-8') as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)
    print(f'pronto: {args.saida}')


if __name__ == '__main__':
    main()
