#!/usr/bin/env python3
"""
Mapeamento de Habilidades Especiais do MM 3.5 para o vocabulário EFEITOS de validar-catalogo.js (E3).
Gera: tools/mm35/especiais.json
Inclui contagem de ocorrências e ranking das habilidades não suportadas ('outro').
"""

import os
import re
import json
import unicodedata
from collections import Counter

OUTPUT_DIR = r"D:\Users\Home\Documents\repos\playful-hub-sandbox-ded-monstros\ded_make_character\tools\mm35"
SCRATCH_DIR = r"C:\Users\William\.gemini\antigravity\brain\8e890bee-0fc5-4a9a-bd3d-09cebddbc73b\scratch\mm35"
PAGINAS_DIR = os.path.join(SCRATCH_DIR, "paginas")

# Vocabulário oficial de EFEITOS de validar-catalogo.js
VOCABULARIO_EFEITOS = {
    'sopro', 'agarrar-aprimorado', 'constricao', 'engolir', 'engolfar', 'rasgar', 'bote',
    'atropelar', 'esmagar', 'veneno', 'presenca-aterradora', 'paralisia', 'condicao-ao-acertar',
    'dreno-energia', 'petrificacao', 'magia', 'aura', 'queimar', 'ataque-furtivo', 'evasao',
    'furia', 'destruir', 'inspirar-coragem', 'camuflagem', 'falha-de-magia', 'vorpal',
    'retribuicao', 'explosao-ao-morrer', 'imunidade-magia', 'refletir-magia', 'enredar',
    'cura-pelas-maos', 'outro'
}

# Regras de mapeamento direto (normalizado)
MAPA_DIRETO = [
    # Mapeamentos para EFEITOS do simulador
    (r'\bagarrar aprimorado\b', 'agarrar-aprimorado'),
    (r'\bconstri[çc][ãa]o\b', 'constricao'),
    (r'\bveneno\b', 'veneno'),
    (r'\bsopro\b', 'sopro'),
    (r'\bpresen[çc]a aterradora\b', 'presenca-aterradora'),
    (r'\bpetrifica[çc][ãa]o\b|\bolhar petrificante\b', 'petrificacao'),
    (r'\bdreno de energia\b', 'dreno-energia'),
    (r'\bdrenar energia\b', 'dreno-energia'),
    (r'\bbote\b', 'bote'),
    (r'\brasgar\b', 'rasgar'),
    (r'\bengolir\b', 'engolir'),
    (r'\bengolfar\b', 'engolfar'),
    (r'\bparalisia\b', 'paralisia'),
    (r'\batropelar\b', 'atropelar'),
    (r'\besmagar\b', 'esmagar'),
    (r'\baura\b', 'aura'),
    (r'\bqueimar\b', 'queimar'),
    (r'\bataque furtivo\b', 'ataque-furtivo'),
    (r'\bevas[ãa]o aprimorada\b', 'evasao'),
    (r'\bevas[ãa]o\b', 'evasao'),
    (r'\bf[úu]ria\b', 'furia'),
    (r'\bdestruir o (bem|mal|leal|ca[oó]tico)\b', 'destruir'),
    (r'\bcamuflagem\b', 'camuflagem'),
    (r'\bexplos[ãa]o ao morrer\b|\bmorte explosiva\b', 'explosao-ao-morrer'),
    (r'\bimunidade [aà] magia\b', 'imunidade-magia'),
    (r'\benredar\b', 'enredar'),
    (r'\bcura pelas m[ãa]os\b', 'cura-pelas-maos'),
    (r'\bdoen[çc]a\b', 'condicao-ao-acertar'),
    (r'\batordoamento\b', 'condicao-ao-acertar'),
    (r'\bcegueira\b', 'condicao-ao-acertar'),

    # Traços e Sentidos (mapeados para null pois são campos nativos ou informativos)
    (r'\bvis[ãa]o\b', None),
    (r'\bfaro\b', None),
    (r'\bsentido cego\b', None),
    (r'\bpercep[çc][ãa]o [àa]s cegas\b', None),
    (r'\btremor de terra\b|\bsensibilidade aos tremores\b', None),
    (r'\bcaracter[íi]sticas de (construto|constructo|morto[–\-]vivo|elemental|planta|limo|fada|verme|inseto|animal)\b', None),
    (r'\bredu[çc][ãa]o de (dano)?\b|\bredu[çc][ãa]o\b', None),
    (r'\bresist[êe]ncia [aà] magia\b|\brm\b', None),
    (r'\bresist[êe]ncia a (fogo|frio|eletricidade|[áa]cido|s[ôo]nico)\b|\bresist[êe]ncia\b', None),
    (r'\bimunidade\b', None),
    (r'\bvulnerabilidade\b', None),
    (r'\bregenera[çc][ãa]o\b', None),
    (r'\bcura acelerada\b', None),
    (r'\bincorp[óo]re[oa]\b', None),
    (r'\banf[íi]bio\b', None),
    (r'\bsem mente\b', None),
    (r'\bamorfo\b', None),
    (r'\bespanto\b', None),
    (r'\blinguagens\b|\btelepatia\b', None),
    (r'\bperfeita sa[úu]de\b', None),

    # Magias similares
    (r'\bhabilidades similares a magia\b|\bsimilares a magia\b|\bmagias\b', 'magia'),
]

def normalizar_hab(nome):
    nome = re.sub(r'\s*\((Ext|Sob|SM)\)', '', nome, flags=re.IGNORECASE).strip()
    return nome

def classificar_habilidade(nome):
    norm = normalizar_hab(nome)
    norm_low = unicodedata.normalize('NFKD', norm.lower())
    norm_low = "".join(c for c in norm_low if not unicodedata.combining(c))

    for padrao, efeito in MAPA_DIRETO:
        p_clean = "".join(c for c in unicodedata.normalize('NFKD', padrao) if not unicodedata.combining(c))
        if re.search(p_clean, norm_low):
            return efeito, norm

    return 'outro', norm

def coletar_especiais():
    # Coleta todas as habilidades das páginas do MM 3.5
    habilidades_contagem = Counter()

    for p in range(12, 295):
        fn = os.path.join(PAGINAS_DIR, f"{p:03d}.json")
        if not os.path.exists(fn):
            continue
        with open(fn, encoding="utf-8") as f:
            d = json.load(f)
        txt = d["texto"]

        # Busca linhas de Ataques Especiais e Qualidades Especiais
        for match in re.finditer(r'(?:Ataques Especiais|Qualidades Especiais)\s*:\s*([^\n\r]+)', txt, re.IGNORECASE):
            linha = match.group(1).strip()
            itens = [i.strip() for i in re.split(r'[,;]', linha) if i.strip()]
            for item in itens:
                if item and item not in ['—', '-', 'Nenhum']:
                    habilidades_contagem[item] += 1

    dicionario = {}
    ranking_outro = Counter()
    ranking_suportados = Counter()
    ranking_nulos = Counter()

    for hab_raw, contagem in habilidades_contagem.most_common():
        efeito, hab_limpa = classificar_habilidade(hab_raw)
        dicionario[hab_limpa] = {
            "efeito": efeito,
            "ocorrencias": contagem,
            "suportado": efeito in VOCABULARIO_EFEITOS and efeito != 'outro'
        }

        if efeito == 'outro':
            ranking_outro[hab_limpa] += contagem
        elif efeito is None:
            ranking_nulos[hab_limpa] += contagem
        else:
            ranking_suportados[efeito] += contagem

    saida = {
        "descricao": "Dicionário de mapeamento de habilidades especiais do Livro dos Monstros 3.5 para o vocabulário de combate (E3).",
        "total_habilidades_distintas": len(dicionario),
        "total_ocorrencias": sum(habilidades_contagem.values()),
        "ranking_efeitos_suportados": dict(ranking_suportados.most_common()),
        "ranking_habilidades_nao_suportadas_outro": dict(ranking_outro.most_common(50)),
        "ranking_tracos_e_sentidos_nulos": dict(ranking_nulos.most_common(20)),
        "habilidades": dicionario
    }

    caminho_json = os.path.join(OUTPUT_DIR, "especiais.json")
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=2)

    print(f"Dicionário de habilidades especiais gerado em: {caminho_json}")
    print(f"Total de habilidades catalogadas: {len(dicionario)}")
    print(f"Top 5 efeitos suportados: {ranking_suportados.most_common(5)}")
    print(f"Top 5 'outro' (a implementar no motor): {ranking_outro.most_common(5)}")
    return saida

if __name__ == "__main__":
    coletar_especiais()
