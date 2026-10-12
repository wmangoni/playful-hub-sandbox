#!/usr/bin/env python3
"""
Orquestrador de geração e integração dos combatentes do Livro dos Monstros 3.5 (Devir)
no catálogo particionado de combate (ded_make_character/data/monstros/[a-z].json).
Uso: python ded_make_character/tools/mm35/gerar_combatentes.py [--lote 1]
"""

import os
import sys
import json
import argparse
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOOLS_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
ROOT_DIR = os.path.abspath(os.path.join(TOOLS_DIR, ".."))
DATA_DIR = os.path.join(ROOT_DIR, "data")
MONSTROS_DIR = os.path.join(DATA_DIR, "monstros")
INVENTARIO_PATH = os.path.join(SCRIPT_DIR, "inventario.json")
SCRATCH_DIR = r"C:\Users\William\.gemini\antigravity\brain\8e890bee-0fc5-4a9a-bd3d-09cebddbc73b\scratch\mm35"
PAGINAS_DIR = os.path.join(SCRATCH_DIR, "paginas")

sys.path.append(SCRIPT_DIR)
from dragons import gerar_ficha_dragao, NOMES_IDADES
from standard_monsters import achar_pagina_exata, extrair_secoes_rotuladas, enriquecer_combatente

def carregar_tabelas_dragoes():
    species_pages = {
        'dragao-azul': 83,
        'dragao-branco': 84,
        'dragao-negro': 86,
        'dragao-verde': 88,
        'dragao-vermelho': 89,
        'dragao-de-bronze': 91,
        'dragao-de-cobre': 93,
        'dragao-de-latao': 95,
        'dragao-de-ouro': 96,
        'dragao-de-prata': 98
    }
    ages_slugs = [slug for slug, _, _ in NOMES_IDADES]
    parsed_tables = {}
    import re
    for sp, pg in species_pages.items():
        fn = os.path.join(PAGINAS_DIR, f'{pg:03d}.json')
        with open(fn, encoding='utf-8') as f:
            d = json.load(f)
        for b in d['blocos']:
            txt = b['text'].replace('15412+45', '15d12+45')
            m_hd = re.findall(r'\b\d+d12[+-]\d+', txt)
            if len(m_hd) >= 12:
                lines = [l.strip() for l in txt.split('\n') if l.strip()]
                sp_ages = {}
                for idx, hd in enumerate(m_hd):
                    hd_idx = next(i for i, l in enumerate(lines) if hd in l)
                    prev_line = lines[hd_idx - 1]
                    if 'Grande Anci' in prev_line:
                        tam = prev_line.split()[-1]
                    else:
                        tam = prev_line
                    stats = [int(x) for x in lines[hd_idx+1 : hd_idx+7]]
                    sp_ages[ages_slugs[idx]] = {
                        'tamanho': tam,
                        'dados_vida_raw': hd,
                        'for': stats[0],
                        'des': stats[1],
                        'con': stats[2],
                        'int': stats[3],
                        'sab': stats[4],
                        'car': stats[5]
                    }
                parsed_tables[sp] = sp_ages
                break
    return parsed_tables

def executar_lote_1():
    print("=== Executando Lote 1 (A–D) ===")
    with open(INVENTARIO_PATH, encoding='utf-8') as f:
        inv = json.load(f)

    lote1_items = [
        i for i in inv
        if i['id'][0] in 'abcd'
        and i['status'] not in ('ja-existe', 'product-identity', 'modelo')
    ]
    print(f"Total de criaturas elegíveis no Lote 1: {len(lote1_items)}")

    dragoes_meta = [i for i in lote1_items if i['id'].startswith('dragao-')]
    nao_dragoes_meta = [i for i in lote1_items if not i['id'].startswith('dragao-')]

    print(f"  - Dragões verdadeiros a gerar: {len(dragoes_meta)}")
    print(f"  - Não-dragões a gerar: {len(nao_dragoes_meta)}")

    # 1. Gerar dragões
    tabelas_dragoes = carregar_tabelas_dragoes()
    novos_dragoes = []
    for meta in dragoes_meta:
        parts = meta['id'].split('-')
        if parts[1] == 'de':
            sp_key = '-'.join(parts[:3])
            age_slug = '-'.join(parts[3:])
        else:
            sp_key = '-'.join(parts[:2])
            age_slug = '-'.join(parts[2:])
        raw = tabelas_dragoes[sp_key][age_slug]
        ficha = gerar_ficha_dragao(meta, raw)
        novos_dragoes.append(ficha)

    print(f"[OK] {len(novos_dragoes)} dragoes gerados com sucesso.")

    # 2. Gerar não-dragões
    novos_nao_dragoes = []
    for meta in nao_dragoes_meta:
        p, txt = achar_pagina_exata(meta, PAGINAS_DIR)
        rotulos = extrair_secoes_rotuladas(txt)
        ficha = enriquecer_combatente(meta, rotulos, txt)
        novos_nao_dragoes.append(ficha)

    print(f"[OK] {len(novos_nao_dragoes)} nao-dragoes gerados com sucesso.")

    todos_novos = novos_dragoes + novos_nao_dragoes
    novos_por_letra = {}
    for c in todos_novos:
        letra = c['id'][0]
        novos_por_letra.setdefault(letra, []).append(c)

    # 3. Integrar nos arquivos particionados a.json, b.json, c.json, d.json
    for letra in 'abcd':
        arquivo = os.path.join(MONSTROS_DIR, f"{letra}.json")
        existentes = []
        if os.path.exists(arquivo):
            with open(arquivo, encoding='utf-8') as f:
                existentes = json.load(f)

        existentes_ids = {m['id'] for m in existentes}
        adicionar = [m for m in novos_por_letra.get(letra, []) if m['id'] not in existentes_ids]
        
        combinados = existentes + adicionar
        combinados.sort(key=lambda m: m['id'])

        with open(arquivo, 'w', encoding='utf-8') as f:
            json.dump(combinados, f, ensure_ascii=False, indent=2)

        print(f"[OK] {letra}.json atualizado: {len(existentes)} pre-existentes + {len(adicionar)} novos = {len(combinados)} total.")

    # 4. Remontar catálogo unificado e particionar/atualizar índice
    print("\nExecutando ferramentas de montagem e particionamento...")
    subprocess.run(["node", os.path.join(TOOLS_DIR, "montar-catalogo.js")], check=True)
    subprocess.run(["node", os.path.join(TOOLS_DIR, "particionar-catalogo.js")], check=True)

    # 5. Validação rigorosa
    print("\nValidando catalogo compilado...")
    res = subprocess.run(["node", os.path.join(TOOLS_DIR, "validar-catalogo.js")], capture_output=True, text=True)
    print(res.stdout)
    if res.returncode != 0 or "0 erro(s)" not in res.stdout:
        print("ERRO na validacao:", res.stderr)
        sys.exit(1)

    print("\n[SUCESSO] Lote 1 concluido com sucesso e 100% validado!")

def main():
    parser = argparse.ArgumentParser(description="Gerador de monstros MM 3.5")
    parser.add_argument("--lote", type=int, default=1, choices=[1, 2, 3], help="Número do lote a executar")
    args = parser.parse_args()

    if args.lote == 1:
        executar_lote_1()
    else:
        print(f"Lote {args.lote} ainda não configurado para execução automática.")

if __name__ == "__main__":
    main()
