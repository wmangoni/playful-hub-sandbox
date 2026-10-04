"""
Paridade da inferência JS × PyTorch (TASK_009 §6.3).

    python ded_make_character/tools/ia/paridade.py --rede D:/.../rede-recursos.json --saida paridade.json [--n 100]
    python ded_make_character/tools/ia/paridade.py --aleatoria --nomes nomes.json --saida tests/fixtures/ia-paridade.json

Monta a rede do JSON (o formato de `criarRede`) em PyTorch, em float32, sorteia `n` vetores de
entrada perto da normalização (média + desvio × normal) e grava a rede, os vetores (estado e ação)
e as notas que o PyTorch dá. O teste em JS confere que `criarRede(...).avaliar` dá o mesmo.
Com `--aleatoria`, a rede é pequena (100 → 8 → 4 → 2) e sorteada: é a do teste do CI.
"""
import argparse
import json
import sys

import numpy as np
import torch

PESO_MARGEM = 0.1


def rede_aleatoria(nomes, n_estado, semente):
    rng = np.random.default_rng(semente)
    tamanhos = [len(nomes), 8, 4, 2]
    camadas = [{'pesos': (rng.normal(size=(s, e)) * np.sqrt(2 / e)).round(6).tolist(), 'vies': rng.normal(size=s).round(6).tolist()} for e, s in zip(tamanhos, tamanhos[1:])]
    return {
        'formato': 'ded-ia-rede', 'versaoEntradas': 1, 'perfil': 'teste', 'geracao': 0,
        'entradas': {'estado': n_estado, 'acao': len(nomes) - n_estado, 'nomes': nomes},
        'normalizacao': {'media': rng.normal(size=len(nomes)).round(4).tolist(), 'desvio': (1 + rng.random(len(nomes))).round(4).tolist()},
        'camadas': camadas, 'pesoMargem': PESO_MARGEM,
    }


def notas_pytorch(rede, X):
    mu = torch.tensor(rede['normalizacao']['media'], dtype=torch.float32)
    sd = torch.tensor(rede['normalizacao']['desvio'], dtype=torch.float32)
    sd = torch.where(sd > 1e-9, sd, torch.ones_like(sd))
    x = (torch.tensor(X, dtype=torch.float32) - mu) / sd
    for k, l in enumerate(rede['camadas']):
        x = x @ torch.tensor(l['pesos'], dtype=torch.float32).T + torch.tensor(l['vies'], dtype=torch.float32)
        if k < len(rede['camadas']) - 1:
            x = torch.relu(x)
    return (torch.sigmoid(x[:, 0]) + rede.get('pesoMargem', PESO_MARGEM) * torch.tanh(x[:, 1])).tolist()


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    p = argparse.ArgumentParser()
    p.add_argument('--rede')
    p.add_argument('--aleatoria', action='store_true')
    p.add_argument('--nomes', help='JSON com { estado: [...], acao: [...] } (para --aleatoria)')
    p.add_argument('--saida', required=True)
    p.add_argument('--n', type=int, default=100)
    p.add_argument('--semente', type=int, default=7)
    args = p.parse_args()
    if args.aleatoria:
        with open(args.nomes, encoding='utf-8') as f:
            nomes = json.load(f)
        rede = rede_aleatoria(nomes['estado'] + nomes['acao'], len(nomes['estado']), args.semente)
    else:
        with open(args.rede, encoding='utf-8') as f:
            rede = json.load(f)
    ne = rede['entradas']['estado']
    rng = np.random.default_rng(args.semente)
    mu, sd = np.array(rede['normalizacao']['media']), np.array(rede['normalizacao']['desvio'])
    X = (mu + sd * rng.normal(size=(args.n, len(mu)))).round(4)
    notas = notas_pytorch(rede, X)
    with open(args.saida, 'w', encoding='utf-8') as f:
        json.dump({'rede': rede, 'casos': [{'estado': x[:ne].tolist(), 'acao': x[ne:].tolist(), 'nota': n} for x, n in zip(X, notas)]}, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{args.n} casos de paridade em {args.saida}')


if __name__ == '__main__':
    main()
