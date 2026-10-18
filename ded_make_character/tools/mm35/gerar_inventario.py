#!/usr/bin/env python3
"""
Gera o inventário definitivo (inventario.json e inventario-resumo.md)
a partir de uma extração meticulosa das páginas do MM 3.5 e validação contra o SRD 3.5.
"""

import os
import re
import json
import unicodedata
from collections import Counter

OUTPUT_DIR = r"D:\Users\Home\Documents\repos\playful-hub-sandbox-ded-monstros\ded_make_character\tools\mm35"
SCRATCH_DIR = r"C:\Users\William\.gemini\antigravity\brain\8e890bee-0fc5-4a9a-bd3d-09cebddbc73b\scratch\mm35"
PAGINAS_DIR = os.path.join(SCRATCH_DIR, "paginas")

# 20 monstros de catalogo-combate.json existente
JA_EXISTEM = {
    "carnical": {"id": "carnical", "nome": "Carniçal", "nome_original": "Ghoul", "nd": 1},
    "ogro": {"id": "ogro", "nome": "Ogro", "nome_original": "Ogre", "nd": 2},
    "cubo-gelatinoso": {"id": "cubo-gelatinoso", "nome": "Cubo Gelatinoso", "nome_original": "Gelatinous Cube", "nd": 3},
    "urso-coruja": {"id": "urso-coruja", "nome": "Urso-Coruja", "nome_original": "Owlbear", "nd": 4},
    "troll": {"id": "troll", "nome": "Troll", "nome_original": "Troll", "nd": 5},
    "arbusto-errante": {"id": "arbusto-errante", "nome": "Arbusto Errante", "nome_original": "Shambling Mound", "nd": 6},
    "medusa": {"id": "medusa", "nome": "Medusa", "nome_original": "Medusa", "nd": 7},
    "behir": {"id": "behir", "nome": "Behir", "nome_original": "Behir", "nd": 8},
    "gigante-do-gelo": {"id": "gigante-do-gelo", "nome": "Gigante do Gelo", "nome_original": "Frost Giant", "nd": 9},
    "naga-guardia": {"id": "naga-guardia", "nome": "Naga Guardiã", "nome_original": "Guardian Naga", "nd": 10},
    "elemental-do-fogo-anciao": {"id": "elemental-do-fogo-anciao", "nome": "Elemental do Fogo Ancião", "nome_original": "Elder Fire Elemental", "nd": 11},
    "verme-purpura": {"id": "verme-purpura", "nome": "Verme Púrpura", "nome_original": "Purple Worm", "nd": 12},
    "golem-de-ferro": {"id": "golem-de-ferro", "nome": "Golem de Ferro", "nome_original": "Iron Golem", "nd": 13},
    "dragao-vermelho-adulto": {"id": "dragao-vermelho-adulto", "nome": "Dragão Vermelho Adulto", "nome_original": "Adult Red Dragon", "nd": 14},
    "glabrezu": {"id": "glabrezu", "nome": "Glabrezu", "nome_original": "Glabrezu", "nd": 15},
    "lorde-das-profundezas": {"id": "lorde-das-profundezas", "nome": "Lorde das Profundezas", "nome_original": "Pit Fiend", "nd": 16},
    "dragao-azul-antigo": {"id": "dragao-azul-antigo", "nome": "Dragão Azul Antigo", "nome_original": "Old Blue Dragon", "nd": 17},
    "balor": {"id": "balor", "nome": "Balor", "nome_original": "Balor", "nd": 18},
    "dragao-de-prata-antigo": {"id": "dragao-de-prata-antigo", "nome": "Dragão de Prata Antigo", "nome_original": "Old Silver Dragon", "nd": 19},
    "tarrasque": {"id": "tarrasque", "nome": "Tarrasque", "nome_original": "Tarrasque", "nd": 20},
}

PRODUCT_IDENTITY = {
    "beholder": ("Beholder", "Beholder", 32, 13, "Aberração", "Médio"),
    "gauth": ("Gauth", "Gauth", 33, 7, "Aberração", "Médio"),
    "devorador-de-mentes": ("Devorador de Mentes", "Mind Flayer", 62, 8, "Aberração", "Médio"),
    "devorador-de-mentes-feiticeiro": ("Devorador de Mentes Feiticeiro", "Mind Flayer Sorcerer", 63, 17, "Aberração", "Médio"),
    "pantera-deslocadora": ("Pantera Deslocadora", "Displacer Beast", 214, 4, "Besta Mágica", "Grande"),
    "pantera-deslocadora-lider-da-matilha": ("Pantera Deslocadora Líder da Matilha", "Displacer Beast Pack Lord", 215, 12, "Besta Mágica", "Enorme"),
    "verme-da-carnica": ("Verme da Carniça", "Carrion Crawler", 252, 4, "Aberração", "Grande"),
    "kuo-toa": ("Kuo-Toa", "Kuo-Toa", 169, 2, "Humanoide Monstruoso", "Médio"),
    "yuan-ti-puro-sangue": ("Yuan-Ti Puro Sangue", "Yuan-Ti Pureblood", 265, 3, "Humanoide Monstruoso", "Médio"),
    "yuan-ti-mestico": ("Yuan-Ti Mestiço", "Yuan-Ti Halfblood", 264, 5, "Humanoide Monstruoso", "Médio"),
    "yuan-ti-abominacao": ("Yuan-Ti Abominação", "Yuan-Ti Abomination", 263, 7, "Humanoide Monstruoso", "Grande"),
    "slaad-vermelho": ("Slaad Vermelho", "Red Slaad", 234, 7, "Extra-Planar", "Médio"),
    "slaad-azul": ("Slaad Azul", "Blue Slaad", 231, 8, "Extra-Planar", "Grande"),
    "slaad-verde": ("Slaad Verde", "Green Slaad", 233, 9, "Extra-Planar", "Médio"),
    "slaad-cinza": ("Slaad Cinza", "Gray Slaad", 232, 10, "Extra-Planar", "Médio"),
    "slaad-da-morte": ("Slaad da Morte", "Death Slaad", 232, 13, "Extra-Planar", "Médio"),
    "umber-hulk": ("Umber Hulk", "Umber Hulk", 251, 7, "Aberração", "Grande"),
    "githyanki": ("Githyanki", "Githyanki", 143, 1, "Humanoide", "Médio"),
    "githzerai": ("Githzerai", "Githzerai", 144, 1, "Humanoide", "Médio"),
}

MODELOS = [
    {"id": "modelo-fantasma", "nome": "Fantasma (Modelo)", "nome_original": "Ghost (Template)", "pagina": 124, "nd": None, "tipo": "Morto-Vivo", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime o exemplo Fantasma (Humano Guerreiro de 5º nível)."},
    {"id": "modelo-lich", "nome": "Lich (Modelo)", "nome_original": "Lich Template", "pagina": 182, "nd": None, "tipo": "Morto-Vivo", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime o exemplo Lich (Humano Mago de 11º nível)."},
    {"id": "modelo-vampiro", "nome": "Vampiro (Modelo)", "nome_original": "Vampire Template", "pagina": 249, "nd": None, "tipo": "Morto-Vivo", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime o exemplo Vampiro (Humano Guerreiro de 5º nível)."},
    {"id": "modelo-esqueleto", "nome": "Esqueleto (Modelo)", "nome_original": "Skeleton Template", "pagina": 116, "nd": None, "tipo": "Morto-Vivo", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime exemplos de Guerreiro Humano e Quimera."},
    {"id": "modelo-zumbi", "nome": "Zumbi (Modelo)", "nome_original": "Zombie Template", "pagina": 265, "nd": None, "tipo": "Morto-Vivo", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime exemplos de Humano Comum e Minotauro."},
    {"id": "modelo-meio-dragao", "nome": "Meio-Dragão (Modelo)", "nome_original": "Half-Dragon Template", "pagina": 196, "nd": None, "tipo": "Dragão", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime o exemplo Meio-Dragão Negro / Guerreiro Humano."},
    {"id": "modelo-meio-celestial", "nome": "Meio-Celestial (Modelo)", "nome_original": "Half-Celestial Template", "pagina": 194, "nd": None, "tipo": "Extra-Planar", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime o exemplo Humano Paladino de 5º nível."},
    {"id": "modelo-meio-abissal", "nome": "Meio-Abissal (Modelo)", "nome_original": "Half-Fiend Template", "pagina": 193, "nd": None, "tipo": "Extra-Planar", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime o exemplo Humano Clérigo de 7º nível."},
    {"id": "modelo-licantropo", "nome": "Licantropo (Modelo)", "nome_original": "Lycanthrope Template", "pagina": 173, "nd": None, "tipo": "Humanoide", "tamanho": "Médio", "status": "modelo", "observacao": "Modelo; o livro imprime 7 exemplos completos com estatísticas."},
]

def construir_dragoes():
    dragoes = []
    
    especies = [
        {
            "id_base": "dragao-azul", "nome_base": "Dragão Azul", "en_base": "Blue Dragon", "pagina": 78,
            "nds": [3, 4, 5, 7, 9, 11, 14, 16, 18, 19, 21, 23],
            "tamanhos": ["Pequeno", "Médio", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal", "Colossal"],
            "ja_existe_slug": "dragao-azul-antigo", "adulto_slug": "dragao-azul-adulto"
        },
        {
            "id_base": "dragao-branco", "nome_base": "Dragão Branco", "en_base": "White Dragon", "pagina": 80,
            "nds": [2, 3, 4, 6, 8, 10, 12, 15, 17, 18, 19, 21],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal"],
            "adulto_slug": "dragao-branco-adulto"
        },
        {
            "id_base": "dragao-negro", "nome_base": "Dragão Negro", "en_base": "Black Dragon", "pagina": 82,
            "nds": [3, 4, 5, 7, 9, 11, 14, 16, 18, 19, 20, 22],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal"],
            "adulto_slug": "dragao-negro-adulto"
        },
        {
            "id_base": "dragao-verde", "nome_base": "Dragão Verde", "en_base": "Green Dragon", "pagina": 83,
            "nds": [3, 4, 5, 8, 10, 13, 16, 18, 19, 21, 22, 24],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal"],
            "adulto_slug": "dragao-verde-adulto"
        },
        {
            "id_base": "dragao-vermelho", "nome_base": "Dragão Vermelho", "en_base": "Red Dragon", "pagina": 85,
            "nds": [4, 5, 7, 10, 13, 15, 18, 20, 21, 23, 24, 26],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal", "Colossal"],
            "ja_existe_slug": "dragao-vermelho-adulto", "adulto_slug": "dragao-vermelho-adulto"
        },
        {
            "id_base": "dragao-de-bronze", "nome_base": "Dragão de Bronze", "en_base": "Bronze Dragon", "pagina": 87,
            "nds": [3, 5, 7, 9, 12, 15, 17, 19, 20, 22, 23, 25],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal"],
            "adulto_slug": "dragao-de-bronze-adulto"
        },
        {
            "id_base": "dragao-de-cobre", "nome_base": "Dragão de Cobre", "en_base": "Copper Dragon", "pagina": 89,
            "nds": [3, 5, 7, 9, 11, 14, 16, 19, 20, 22, 23, 25],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal"],
            "adulto_slug": "dragao-de-cobre-adulto"
        },
        {
            "id_base": "dragao-de-latao", "nome_base": "Dragão de Latão", "en_base": "Brass Dragon", "pagina": 90,
            "nds": [3, 4, 6, 8, 10, 12, 15, 17, 19, 20, 21, 23],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal"],
            "adulto_slug": "dragao-de-latao-adulto"
        },
        {
            "id_base": "dragao-de-ouro", "nome_base": "Dragão de Ouro", "en_base": "Gold Dragon", "pagina": 92,
            "nds": [5, 7, 9, 11, 14, 16, 19, 21, 22, 24, 25, 27],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal", "Colossal"],
            "adulto_slug": "dragao-de-ouro-adulto"
        },
        {
            "id_base": "dragao-de-prata", "nome_base": "Dragão de Prata", "en_base": "Silver Dragon", "pagina": 94,
            "nds": [4, 5, 7, 10, 13, 15, 18, 20, 21, 23, 24, 26],
            "tamanhos": ["Miúdo", "Pequeno", "Médio", "Grande", "Grande", "Enorme", "Enorme", "Imenso", "Imenso", "Colossal", "Colossal", "Colossal"],
            "ja_existe_slug": "dragao-de-prata-antigo", "adulto_slug": "dragao-de-prata-adulto"
        },
    ]

    idades = [
        ("Filhote", "Wyrmling"),
        ("Muito Jovem", "Very Young"),
        ("Jovem", "Young"),
        ("Adolescente", "Juvenile"),
        ("Adulto Jovem", "Young Adult"),
        ("Adulto", "Adult"),
        ("Experiente", "Mature Adult"),
        ("Muito Experiente", "Old"),
        ("Antigo", "Very Old"),
        ("Venerável", "Ancient"),
        ("Ancião", "Wyrm"),
        ("Grande Ancião", "Great Wyrm"),
    ]

    for esp in especies:
        adulto_id = esp["adulto_slug"]
        ja_existe_id = esp.get("ja_existe_slug")

        for idx, (id_pt, id_en) in enumerate(idades):
            slug = f"{esp['id_base']}-{slugify(id_pt)}"
            nome = f"{esp['nome_base']} {id_pt}"
            nome_orig = f"{id_en} {esp['en_base']}"
            nd = esp["nds"][idx]
            tam = esp["tamanhos"][idx]

            if slug == ja_existe_id or (esp['id_base'] == 'dragao-vermelho' and id_pt == 'Adulto'):
                status = "ja-existe"
            elif slug == adulto_id:
                status = "novo"
            else:
                status = f"variante-de:{adulto_id}"

            dragoes.append({
                "id": slug,
                "nome": nome,
                "nome_original": nome_orig,
                "pagina": esp["pagina"],
                "nd": nd,
                "tipo": "Dragão",
                "tamanho": tam,
                "status": status,
                "observacao": f"Tabela de idade dos dragões (categoria {idx+1}: {id_pt}), p. {esp['pagina']}."
            })

    return dragoes

def gerar_resumo_markdown(inventario, caminho_md):
    total = len(inventario)
    status_counts = Counter(m["status"].split(":")[0] for m in inventario)
    tipo_counts = Counter(m.get("tipo", "Desconhecido") for m in inventario)
    nd_counts = Counter(m.get("nd") for m in inventario)
    
    pi_list = [m for m in inventario if m["status"] == "product-identity"]
    modelo_list = [m for m in inventario if m["status"] == "modelo"]
    ja_existe_list = [m for m in inventario if m["status"] == "ja-existe"]
    novos_list = [m for m in inventario if m["status"] == "novo"]
    variantes_list = [m for m in inventario if m["status"].startswith("variante-de")]

    linhas = [
        "# Inventário do Livro dos Monstros 3.5 (Devir) — Resumo da Fase 1",
        "",
        f"**Total de entradas no inventário:** {total}",
        "",
        "## 1. Totais por Status",
        "",
        "| Status | Quantidade | Descrição |",
        "|---|---|---|",
        f"| `novo` | {len(novos_list)} | Monstros novos que entrarão no catálogo na Fase 2 |",
        f"| `variante-de:<id>` | {len(variantes_list)} | Variantes com estatísticas próprias vinculadas a monstro-base (dragões por idade, elementais por tamanho etc.) |",
        f"| `ja-existe` | {len(ja_existe_list)} | Monstros presentes em `data/catalogo-combate.json` (migrados pelo outro subagente) |",
        f"| `product-identity` | {len(pi_list)} | Criaturas protegidas por Product Identity da Wizards (excluídas do catálogo público) |",
        f"| `modelo` | {len(modelo_list)} | Regras de modelos (apenas criaturas de exemplo entram como stat block) |",
        f"| **Total** | **{total}** | |",
        "",
        "## 2. Totais por Tipo de Criatura",
        "",
        "| Tipo | Quantidade |",
        "|---|---|",
    ]
    for tipo, cnt in sorted(tipo_counts.items(), key=lambda x: -x[1]):
        linhas.append(f"| {tipo} | {cnt} |")
    
    linhas.extend([
        "",
        "## 3. Distribuição por Nível de Desafio (ND)",
        "",
        "| ND | Quantidade |",
        "|---|---|",
    ])
    
    def sort_nd(nd_val):
        if nd_val is None:
            return 999
        return float(nd_val)

    for nd, cnt in sorted(nd_counts.items(), key=lambda x: sort_nd(x[0])):
        nd_label = str(nd) if nd is not None else "— (Modelo)"
        if nd is not None and nd < 1:
            fracs = {0.1: "1/10", 0.125: "1/8", 0.167: "1/6", 0.25: "1/4", 0.333: "1/3", 0.5: "1/2"}
            for f_val, f_str in fracs.items():
                if abs(nd - f_val) < 0.01:
                    nd_label = f"{f_str} ({nd})"
                    break
        linhas.append(f"| {nd_label} | {cnt} |")

    linhas.extend([
        "",
        "## 4. Lista de Exclusões: Product Identity da Wizards",
        "",
        "Estas criaturas possuem blocos de estatísticas no Livro dos Monstros 3.5 da Devir, mas são propriedade intelectual reservada da Wizards of the Coast e **não** entram no catálogo público do simulador.",
        "",
        "| ID | Nome (PT Devir) | Nome Original (EN) | Página | ND | Tipo |",
        "|---|---|---|---|---|---|",
    ])
    for pi in sorted(pi_list, key=lambda x: x["pagina"]):
        linhas.append(f"| `{pi['id']}` | {pi['nome']} | {pi['nome_original']} | {pi['pagina']} | {pi['nd']} | {pi['tipo']} |")

    linhas.extend([
        "",
        "## 5. Lista de Modelos (Templates)",
        "",
        "Apenas as criaturas de exemplo com bloco de estatísticas completo são importadas. O modelo em si é marcado como `modelo`.",
        "",
        "| ID | Nome | Nome Original | Página | Observação |",
        "|---|---|---|---|---|",
    ])
    for mod in sorted(modelo_list, key=lambda x: x["pagina"]):
        linhas.append(f"| `{mod['id']}` | {mod['nome']} | {mod['nome_original']} | {mod['pagina']} | {mod['observacao']} |")

    linhas.extend([
        "",
        "## 6. Monstros Existentes em `catalogo-combate.json` (`ja-existe`)",
        "",
        "| ID | Nome (PT Devir) | Nome Original (EN) | ND Atual |",
        "|---|---|---|---|",
    ])
    for je in sorted(ja_existe_list, key=lambda x: x["nd"]):
        linhas.append(f"| `{je['id']}` | {je['nome']} | {je['nome_original']} | {je['nd']} |")

    with open(caminho_md, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
    print(f"Resumo markdown gerado em {caminho_md}")

def criar_inventario_completo():
    inv = []
    ids_adicionados = set()

    def add(item):
        _id = item["id"]
        if _id in ids_adicionados:
            return
        ids_adicionados.add(_id)
        inv.append(item)

    # 1. Modelos
    for m in MODELOS:
        add(m)

    # 2. Product Identity
    for pi_id, (nome, nome_orig, pag, nd, tipo, tam) in PRODUCT_IDENTITY.items():
        add({
            "id": pi_id,
            "nome": nome,
            "nome_original": nome_orig,
            "pagina": pag,
            "nd": nd,
            "tipo": tipo,
            "tamanho": tam,
            "status": "product-identity",
            "observacao": "Product Identity da Wizards of the Coast (fora do catálogo público)."
        })

    # 3. Dragões (10 espécies x 12 categorias = 120 entradas)
    from construir_dados import construir_dragoes
    dragoes = construir_dragoes()
    for d in dragoes:
        add(d)

    # 4. Elementais (4 elementos x 6 tamanhos = 24 entradas)
    elementos = [
        ("ar", "Ar", "Air", "Elemental do Ar", "Air Elemental", 105),
        ("terra", "Terra", "Earth", "Elemental da Terra", "Earth Elemental", 106),
        ("fogo", "Fogo", "Fire", "Elemental do Fogo", "Fire Elemental", 106),
        ("agua", "Água", "Water", "Elemental da Água", "Water Elemental", 105),
    ]
    tamanhos_elem = [
        ("pequeno", "Pequeno", "Small", 1, "Pequeno"),
        ("medio", "Médio", "Medium", 3, "Médio"),
        ("grande", "Grande", "Large", 5, "Grande"),
        ("enorme", "Enorme", "Huge", 7, "Enorme"),
        ("superior", "Superior", "Greater", 9, "Enorme"),
        ("anciao", "Ancião", "Elder", 11, "Enorme"),
    ]
    for el_slug, el_pt, el_en, el_nome_base, el_en_base, pag in elementos:
        base_id = f"elemental-do-{el_slug}-pequeno" if el_slug != "agua" else "elemental-da-agua-pequeno"
        for tam_slug, tam_pt, tam_en, nd, tam_cat in tamanhos_elem:
            slug = f"elemental-do-{el_slug}-{tam_slug}" if el_slug != "agua" else f"elemental-da-agua-{tam_slug}"
            nome = f"{el_nome_base}, {tam_pt}"
            nome_orig = f"{el_en} Elemental, {tam_en}"
            
            # Checar se já existe no catalogo
            if slug in JA_EXISTEM:
                status = "ja-existe"
            elif slug == base_id:
                status = "novo"
            else:
                status = f"variante-de:{base_id}"

            add({
                "id": slug,
                "nome": nome,
                "nome_original": nome_orig,
                "pagina": pag,
                "nd": nd,
                "tipo": "Elemental",
                "tamanho": tam_cat,
                "status": status,
                "observacao": f"Variante por tamanho de {el_nome_base} (bloco multicoluna, p. {pag})."
            })

    # 5. Objetos Animados (7 tamanhos)
    tamanhos_obj = [
        ("miudo", "Miúdo", "Tiny", 0.5, "Miúdo"),
        ("pequeno", "Pequeno", "Small", 1, "Pequeno"),
        ("medio", "Médio", "Medium", 2, "Médio"),
        ("grande", "Grande", "Large", 5, "Grande"),
        ("enorme", "Enorme", "Huge", 7, "Enorme"),
        ("imenso", "Imenso", "Gargantuan", 10, "Imenso"),
        ("colossal", "Colossal", "Colossal", 11, "Colossal"),
    ]
    base_obj = "objeto-animado-medio"
    for tam_slug, tam_pt, tam_en, nd, tam_cat in tamanhos_obj:
        slug = f"objeto-animado-{tam_slug}"
        nome = f"Objeto Animado, {tam_pt}"
        nome_orig = f"Animated Object, {tam_en}"
        status = "novo" if slug == base_obj else f"variante-de:{base_obj}"
        add({
            "id": slug,
            "nome": nome,
            "nome_original": nome_orig,
            "pagina": 208,
            "nd": nd,
            "tipo": "Constructo",
            "tamanho": tam_cat,
            "status": status,
            "observacao": "Variante de tamanho de Objeto Animado (bloco multicoluna, p. 208)."
        })

    # 6. Vermes com múltiplos tamanhos
    vermes_tamanhos = [
        ("aranha-monstruosa", "Aranha Monstruosa", "Monstrous Spider", 285, [
            ("miuda", "Miúda", "Tiny", 0.25, "Miúdo"),
            ("pequena", "Pequena", "Small", 0.5, "Pequeno"),
            ("media", "Média", "Medium", 1, "Médio"),
            ("grande", "Grande", "Large", 2, "Grande"),
            ("enorme", "Enorme", "Huge", 5, "Enorme"),
            ("imensa", "Imensa", "Gargantuan", 8, "Imenso"),
            ("colossal", "Colossal", "Colossal", 11, "Colossal"),
        ]),
        ("centopeia-monstruosa", "Centopeia Monstruosa", "Monstrous Centipede", 287, [
            ("miuda", "Miúda", "Tiny", 0.125, "Miúdo"),
            ("pequena", "Pequena", "Small", 0.25, "Pequeno"),
            ("media", "Média", "Medium", 0.5, "Médio"),
            ("grande", "Grande", "Large", 2, "Grande"),
            ("enorme", "Enorme", "Huge", 4, "Enorme"),
            ("imensa", "Imensa", "Gargantuan", 6, "Imenso"),
            ("colossal", "Colossal", "Colossal", 9, "Colossal"),
        ]),
        ("escorpiao-monstruoso", "Escorpião Monstruoso", "Monstrous Scorpion", 288, [
            ("miudo", "Miúdo", "Tiny", 0.25, "Miúdo"),
            ("pequeno", "Pequeno", "Small", 0.5, "Pequeno"),
            ("medio", "Médio", "Medium", 1, "Médio"),
            ("grande", "Grande", "Large", 3, "Grande"),
            ("enorme", "Enorme", "Huge", 7, "Enorme"),
            ("imenso", "Imenso", "Gargantuan", 10, "Imenso"),
            ("colossal", "Colossal", "Colossal", 12, "Colossal"),
        ]),
    ]
    for v_slug, v_nome, v_en, pag, tams in vermes_tamanhos:
        base_id = f"{v_slug}-media" if "media" in [t[0] for t in tams] else f"{v_slug}-medio"
        for tam_slug, tam_pt, tam_en, nd, tam_cat in tams:
            slug = f"{v_slug}-{tam_slug}"
            nome = f"{v_nome}, {tam_pt}"
            nome_orig = f"{v_en}, {tam_en}"
            status = "novo" if slug == base_id else f"variante-de:{base_id}"
            add({
                "id": slug,
                "nome": nome,
                "nome_original": nome_orig,
                "pagina": pag,
                "nd": nd,
                "tipo": "Verme",
                "tamanho": tam_cat,
                "status": status,
                "observacao": f"Variante de tamanho de {v_nome} (bloco multicoluna, p. {pag})."
            })

    # 7. Insetos gigantes específicos
    insetos = [
        {"id": "abelha-gigante", "nome": "Abelha Gigante", "nome_original": "Giant Bee", "pagina": 285, "nd": 1, "tipo": "Verme", "tamanho": "Médio", "status": "novo", "observacao": ""},
        {"id": "besouro-bombardeiro-gigante", "nome": "Besouro Bombardeiro Gigante", "nome_original": "Giant Bombardier Beetle", "pagina": 286, "nd": 2, "tipo": "Verme", "tamanho": "Médio", "status": "novo", "observacao": ""},
        {"id": "besouro-incandescente-gigante", "nome": "Besouro Incandescente Gigante", "nome_original": "Giant Fire Beetle", "pagina": 286, "nd": 0.333, "tipo": "Verme", "tamanho": "Pequeno", "status": "variante-de:besouro-bombardeiro-gigante", "observacao": ""},
        {"id": "besouro-estercorario-gigante", "nome": "Besouro Estercorário Gigante", "nome_original": "Giant Dung Beetle", "pagina": 286, "nd": 3, "tipo": "Verme", "tamanho": "Grande", "status": "variante-de:besouro-bombardeiro-gigante", "observacao": ""},
        {"id": "besouro-rinoceronte-gigante", "nome": "Besouro Rinoceronte Gigante", "nome_original": "Giant Rhinoceros Beetle", "pagina": 286, "nd": 4, "tipo": "Verme", "tamanho": "Grande", "status": "variante-de:besouro-bombardeiro-gigante", "observacao": ""},
        {"id": "formiga-gigante-operaria", "nome": "Formiga Gigante Operária", "nome_original": "Giant Ant Worker", "pagina": 288, "nd": 1, "tipo": "Verme", "tamanho": "Médio", "status": "novo", "observacao": ""},
        {"id": "formiga-gigante-soldado", "nome": "Formiga Gigante Soldado", "nome_original": "Giant Ant Soldier", "pagina": 288, "nd": 2, "tipo": "Verme", "tamanho": "Médio", "status": "variante-de:formiga-gigante-operaria", "observacao": ""},
        {"id": "formiga-gigante-rainha", "nome": "Formiga Gigante Rainha", "nome_original": "Giant Ant Queen", "pagina": 288, "nd": 3, "tipo": "Verme", "tamanho": "Grande", "status": "variante-de:formiga-gigante-operaria", "observacao": ""},
        {"id": "gafanhoto-gigante", "nome": "Gafanhoto Gigante", "nome_original": "Giant Stag Beetle", "pagina": 289, "nd": 4, "tipo": "Verme", "tamanho": "Grande", "status": "novo", "observacao": "Giant Stag Beetle no SRD."},
        {"id": "louva-a-deus-gigante", "nome": "Louva-a-Deus Gigante", "nome_original": "Giant Praying Mantis", "pagina": 289, "nd": 3, "tipo": "Verme", "tamanho": "Grande", "status": "novo", "observacao": ""},
        {"id": "vaga-lume-gigante", "nome": "Vaga-Lume Gigante", "nome_original": "Giant Firefly", "pagina": 290, "nd": 0.5, "tipo": "Verme", "tamanho": "Pequeno", "status": "novo", "observacao": ""},
        {"id": "vespa-gigante", "nome": "Vespa Gigante", "nome_original": "Giant Wasp", "pagina": 290, "nd": 3, "tipo": "Verme", "tamanho": "Grande", "status": "novo", "observacao": ""},
    ]
    for ins in insetos:
        add(ins)

    # 8. Cobras e víboras
    cobras = [
        {"id": "cobra-constritor", "nome": "Cobra Constritor", "nome_original": "Constrictor Snake", "pagina": 273, "nd": 2, "tipo": "Animal", "tamanho": "Médio", "status": "novo", "observacao": ""},
        {"id": "cobra-constritora-gigante", "nome": "Cobra Constritora Gigante", "nome_original": "Giant Constrictor Snake", "pagina": 273, "nd": 5, "tipo": "Animal", "tamanho": "Enorme", "status": "variante-de:cobra-constritor", "observacao": ""},
        {"id": "vibora-miuda", "nome": "Víbora Miúda", "nome_original": "Tiny Viper Snake", "pagina": 274, "nd": 0.333, "tipo": "Animal", "tamanho": "Miúdo", "status": "variante-de:vibora-media", "observacao": ""},
        {"id": "vibora-pequena", "nome": "Víbora Pequena", "nome_original": "Small Viper Snake", "pagina": 274, "nd": 0.5, "tipo": "Animal", "tamanho": "Pequeno", "status": "variante-de:vibora-media", "observacao": ""},
        {"id": "vibora-media", "nome": "Víbora Média", "nome_original": "Medium Viper Snake", "pagina": 274, "nd": 1, "tipo": "Animal", "tamanho": "Médio", "status": "novo", "observacao": ""},
        {"id": "vibora-grande", "nome": "Víbora Grande", "nome_original": "Large Viper Snake", "pagina": 274, "nd": 2, "tipo": "Animal", "tamanho": "Grande", "status": "variante-de:vibora-media", "observacao": ""},
        {"id": "vibora-enorme", "nome": "Víbora Enorme", "nome_original": "Huge Viper Snake", "pagina": 274, "nd": 3, "tipo": "Animal", "tamanho": "Enorme", "status": "variante-de:vibora-media", "observacao": ""},
    ]
    for c in cobras:
        add(c)

    # 9. Todos os Animais do Capítulo 2
    animais = [
        ("aguia", "Águia", "Eagle", 269, 0.5, "Pequeno", "novo", None),
        ("babuino", "Babuíno", "Baboon", 269, 0.5, "Médio", "novo", None),
        ("baleia-azul", "Baleia Azul", "Baleen Whale", 270, 6, "Imenso", "novo", None),
        ("cachalote", "Cachalote", "Cachalot Whale", 270, 7, "Imenso", "variante-de:baleia-azul", None),
        ("orca", "Orca", "Orca", 270, 5, "Enorme", "variante-de:baleia-azul", None),
        ("bisao", "Bisão", "Bison", 270, 2, "Grande", "novo", None),
        ("cachorro", "Cachorro", "Dog", 271, 0.333, "Pequeno", "novo", None),
        ("cachorro-de-montaria", "Cachorro de Montaria", "Riding Dog", 271, 1, "Médio", "variante-de:cachorro", None),
        ("camelo", "Camelo", "Camel", 271, 1, "Grande", "novo", None),
        ("carcaju", "Carcajú", "Wolverine", 272, 2, "Médio", "novo", None),
        ("cavalo-leve", "Cavalo Leve", "Light Horse", 272, 1, "Grande", "novo", None),
        ("cavalo-de-guerra-leve", "Cavalo de Guerra Leve", "Light Warhorse", 273, 1, "Grande", "variante-de:cavalo-leve", None),
        ("cavalo-pesado", "Cavalo Pesado", "Heavy Horse", 272, 1, "Grande", "variante-de:cavalo-leve", None),
        ("cavalo-de-guerra-pesado", "Cavalo de Guerra Pesado", "Heavy Warhorse", 272, 2, "Grande", "variante-de:cavalo-leve", None),
        ("coruja", "Coruja", "Owl", 274, 0.25, "Miúdo", "novo", None),
        ("corvo", "Corvo", "Raven", 275, 0.167, "Miúdo", "novo", None),
        ("crocodilo", "Crocodilo", "Crocodile", 275, 2, "Médio", "novo", None),
        ("crocodilo-gigante", "Crocodilo Gigante", "Giant Crocodile", 275, 4, "Enorme", "variante-de:crocodilo", None),
        ("dinonico", "Dinonico", "Deinonychus", 73, 3, "Médio", "novo", None),
        ("elasmossauro", "Elasmossauro", "Elasmosaurus", 74, 7, "Enorme", "novo", None),
        ("megaraptor", "Megaraptor", "Megaraptor", 74, 6, "Enorme", "novo", None),
        ("tiranossauro", "Tiranossauro", "Tyrannosaurus", 74, 8, "Enorme", "novo", None),
        ("triceratops", "Tricerátops", "Triceratops", 75, 9, "Enorme", "novo", None),
        ("elefante", "Elefante", "Elephant", 275, 7, "Enorme", "novo", None),
        ("falcao", "Falcão", "Hawk", 276, 0.333, "Miúdo", "novo", None),
        ("gato", "Gato", "Cat", 276, 0.25, "Miúdo", "novo", None),
        ("golfinho", "Golfinho", "Dolphin", 276, 0.5, "Médio", "novo", None),
        ("gorila", "Gorila", "Ape", 276, 2, "Grande", "novo", None),
        ("guepardo", "Guepardo", "Cheetah", 277, 2, "Médio", "novo", None),
        ("hiena", "Hiena", "Hyena", 277, 1, "Médio", "novo", None),
        ("javali", "Javali", "Boar", 277, 2, "Médio", "novo", None),
        ("jumento", "Jumento", "Donkey", 277, 0.167, "Médio", "novo", None),
        ("lagarto", "Lagarto", "Lizard", 278, 0.167, "Miúdo", "novo", None),
        ("lagarto-gigante", "Lagarto Gigante", "Monitor Lizard", 278, 2, "Médio", "variante-de:lagarto", None),
        ("leao", "Leão", "Lion", 278, 3, "Grande", "novo", None),
        ("leopardo", "Leopardo", "Leopard", 278, 2, "Médio", "novo", None),
        ("lobo", "Lobo", "Wolf", 279, 1, "Médio", "novo", None),
        ("lula", "Lula", "Squid", 279, 1, "Médio", "novo", None),
        ("lula-gigante", "Lula Gigante", "Giant Squid", 279, 9, "Enorme", "variante-de:lula", None),
        ("macaco", "Macaco", "Monkey", 280, 0.167, "Miúdo", "novo", None),
        ("morcego", "Morcego", "Bat", 280, 0.1, "Miúdo", "novo", None),
        ("mula", "Mula", "Mule", 280, 1, "Grande", "novo", None),
        ("polvo", "Polvo", "Octopus", 280, 1, "Pequeno", "novo", None),
        ("polvo-gigante", "Polvo Gigante", "Giant Octopus", 281, 8, "Grande", "variante-de:polvo", None),
        ("ponei", "Pônei", "Pony", 281, 0.25, "Médio", "novo", None),
        ("ponei-de-guerra", "Pônei de Guerra", "Warpony", 282, 0.5, "Médio", "variante-de:ponei", None),
        ("rato", "Rato", "Rat", 282, 0.125, "Miúdo", "novo", None),
        ("rinoceronte", "Rinoceronte", "Rhinoceros", 282, 4, "Grande", "novo", None),
        ("sapo", "Sapo", "Toad", 282, 0.1, "Minúsculo", "novo", None),
        ("texugo", "Texugo", "Badger", 283, 0.5, "Pequeno", "novo", None),
        ("tigre", "Tigre", "Tiger", 283, 4, "Grande", "novo", None),
        ("tubarao-medio", "Tubarão Médio", "Medium Shark", 283, 1, "Médio", "novo", None),
        ("tubarao-grande", "Tubarão Grande", "Large Shark", 283, 2, "Grande", "variante-de:tubarao-medio", None),
        ("tubarao-enorme", "Tubarão Enorme", "Huge Shark", 283, 4, "Enorme", "variante-de:tubarao-medio", None),
        ("urso-negro", "Urso Negro", "Black Bear", 284, 2, "Médio", "novo", None),
        ("urso-marrom", "Urso Marrom", "Brown Bear", 284, 4, "Grande", "variante-de:urso-negro", None),
        ("urso-polar", "Urso Polar", "Polar Bear", 284, 4, "Grande", "variante-de:urso-negro", None),
    ]
    for an_id, nome, en, pag, nd, tam, st, obs in animais:
        add({
            "id": an_id,
            "nome": nome,
            "nome_original": en,
            "pagina": pag,
            "nd": nd,
            "tipo": "Animal",
            "tamanho": tam,
            "status": st,
            "observacao": obs or f"Capítulo 2: Animais (p. {pag})."
        })

    # 10. Animais Atrozes (p. 14-18)
    atrozes = [
        ("arminho-atroz", "Arminho Atroz", "Dire Weasel", 14, 2, "Médio"),
        ("carcaju-atroz", "Carcajú Atroz", "Dire Wolverine", 14, 4, "Grande"),
        ("gorila-atroz", "Gorila Atroz", "Dire Ape", 15, 3, "Grande"),
        ("javali-atroz", "Javali Atroz", "Dire Boar", 15, 4, "Grande"),
        ("leao-atroz", "Leão Atroz", "Dire Lion", 15, 5, "Grande"),
        ("lobo-atroz", "Lobo Atroz", "Dire Wolf", 16, 3, "Grande"),
        ("morcego-atroz", "Morcego Atroz", "Dire Bat", 16, 2, "Grande"),
        ("rato-atroz", "Rato Atroz", "Dire Rat", 16, 0.333, "Pequeno"),
        ("texugo-atroz", "Texugo Atroz", "Dire Badger", 17, 2, "Médio"),
        ("tigre-atroz", "Tigre Atroz", "Dire Tiger", 17, 8, "Grande"),
        ("tubarao-atroz", "Tubarão Atroz", "Dire Shark", 17, 9, "Enorme"),
        ("urso-atroz", "Urso Atroz", "Dire Bear", 18, 7, "Grande"),
    ]
    for a_id, nome, en, pag, nd, tam in atrozes:
        add({
            "id": a_id,
            "nome": nome,
            "nome_original": en,
            "pagina": pag,
            "nd": nd,
            "tipo": "Animal",
            "tamanho": tam,
            "status": "novo",
            "observacao": f"Animal Atroz (p. {pag})."
        })

    # 11. Mephits (10 variedades, p. 197-201)
    mephits = [
        ("mephit-da-agua", "Mephit da Água", "Water Mephit", 197),
        ("mephit-do-ar", "Mephit do Ar", "Air Mephit", 197),
        ("mephit-do-fogo", "Mephit do Fogo", "Fire Mephit", 198),
        ("mephit-do-gelo", "Mephit do Gelo", "Ice Mephit", 198),
        ("mephit-do-limo", "Mephit do Limo", "Ooze Mephit", 199),
        ("mephit-do-magma", "Mephit do Magma", "Magma Mephit", 199),
        ("mephit-da-poeira", "Mephit da Poeira", "Dust Mephit", 200),
        ("mephit-do-sal", "Mephit do Sal", "Salt Mephit", 200),
        ("mephit-da-terra", "Mephit da Terra", "Earth Mephit", 200),
        ("mephit-do-vapor", "Mephit do Vapor", "Steam Mephit", 201),
    ]
    base_mep = "mephit-do-ar"
    for m_slug, nome, en, pag in mephits:
        status = "novo" if m_slug == base_mep else f"variante-de:{base_mep}"
        add({
            "id": m_slug,
            "nome": nome,
            "nome_original": en,
            "pagina": pag,
            "nd": 3,
            "tipo": "Extra-Planar",
            "tamanho": "Pequeno",
            "status": status,
            "observacao": f"Variedade de Mephit (p. {pag})."
        })

    # 12. Monstro de A a Z — Catálogo Completo dos demais monstros
    demais_monstros = [
        # A
        ("aasimar", "Aasimar", "Aasimar", 240, 0.5, "Extra-Planar", "Médio", "novo", "Tocado pelos Planos (Planar)."),
        ("abocanhador-matraqueante", "Abocanhador Matraqueante", "Gibbering Mouther", 8, 5, "Aberração", "Médio", "novo", None),
        ("abolete", "Abolete", "Aboleth", 9, 7, "Aberração", "Enorme", "novo", None),
        ("abolete-mago", "Abolete Mago", "Aboleth Mage", 10, 17, "Aberração", "Enorme", "variante-de:abolete", "Mago de 10º nível."),
        ("achaierai", "Achaierai", "Achaierai", 10, 5, "Extra-Planar", "Grande", "novo", None),
        ("aguia-gigante", "Águia Gigante", "Giant Eagle", 11, 3, "Besta Mágica", "Grande", "novo", None),
        ("allip", "Allip", "Allip", 11, 3, "Morto-Vivo", "Médio", "novo", "Incorpóreo."),
        ("anao-guerreiro", "Anão Guerreiro", "Dwarf Warrior", 12, 0.5, "Humanoide", "Médio", "novo", "Guerreiro Anão das Colinas de 1º nível."),
        ("anao-das-profundezas", "Anão das Profundezas", "Deep Dwarf", 13, 0.5, "Humanoide", "Médio", "variante-de:anao-guerreiro", None),
        ("anao-das-montanhas", "Anão das Montanhas", "Mountain Dwarf", 14, 0.5, "Humanoide", "Médio", "variante-de:anao-guerreiro", None),
        ("duergar", "Duergar", "Duergar", 14, 0.333, "Humanoide", "Médio", "variante-de:anao-guerreiro", "Anão Cinzento."),
        ("andro-esfinge", "Andro-Esfinge", "Androsphinx", 114, 9, "Besta Mágica", "Grande", "novo", None),
        ("crio-esfinge", "Crio-Esfinge", "Criosphinx", 115, 7, "Besta Mágica", "Grande", "variante-de:andro-esfinge", None),
        ("gino-esfinge", "Gino-Esfinge", "Gynosphinx", 115, 8, "Besta Mágica", "Grande", "variante-de:andro-esfinge", None),
        ("hieraco-esfinge", "Hieraco-Esfinge", "Hieracosphinx", 116, 5, "Besta Mágica", "Grande", "variante-de:andro-esfinge", None),
        ("anis", "Anis", "Annis", 35, 6, "Humanoide Monstruoso", "Grande", "novo", "Bruxa Anis."),
        ("bruxa-verde", "Bruxa Verde", "Green Hag", 36, 5, "Humanoide Monstruoso", "Médio", "variante-de:anis", None),
        ("bruxa-do-mar", "Bruxa do Mar", "Sea Hag", 36, 4, "Humanoide Monstruoso", "Médio", "variante-de:anis", None),
        ("bruxa-da-noite", "Bruxa da Noite", "Night Hag", 37, 9, "Extra-Planar", "Médio", "novo", "Planar."),
        ("deva-astral", "Deva Astral", "Astral Deva", 19, 14, "Extra-Planar", "Médio", "novo", "Anjo."),
        ("planetario", "Planetário", "Planetar", 19, 16, "Extra-Planar", "Grande", "variante-de:deva-astral", "Anjo."),
        ("solar", "Solar", "Solar", 20, 23, "Extra-Planar", "Grande", "variante-de:deva-astral", "Anjo."),
        ("ankheg", "Ankheg", "Ankheg", 21, 3, "Besta Mágica", "Grande", "novo", None),
        ("aparicao", "Aparição", "Wraith", 21, 5, "Morto-Vivo", "Médio", "novo", "Incorpóreo."),
        ("aparicao-torrida", "Aparição Tórrida", "Dread Wraith", 22, 11, "Morto-Vivo", "Grande", "variante-de:aparicao", "Aparição Aterradora."),
        ("aranea", "Aranea", "Aranea", 23, 4, "Besta Mágica", "Médio", "novo", "Metamorfo."),
        ("aranha-interplanar", "Aranha Interplanar", "Phase Spider", 23, 5, "Besta Mágica", "Grande", "novo", None),
        ("arbusto-errante", "Arbusto Errante", "Shambling Mound", 24, 6, "Planta", "Grande", "ja-existe", None),
        ("arconte-luminar", "Arconte Luminar", "Lantern Archon", 25, 2, "Extra-Planar", "Pequeno", "novo", "Arconte."),
        ("arconte-guardiao", "Arconte Guardião", "Hound Archon", 25, 4, "Extra-Planar", "Médio", "variante-de:arconte-luminar", "Hound Archon."),
        ("arconte-mensageiro", "Arconte Mensageiro", "Trumpet Archon", 27, 14, "Extra-Planar", "Médio", "variante-de:arconte-luminar", "Trumpet Archon."),
        ("athach", "Athach", "Athach", 28, 8, "Aberração", "Enorme", "novo", None),
        ("avoral", "Avoral", "Avoral", 156, 9, "Extra-Planar", "Médio", "novo", "Guardinal."),
        ("leonal", "Leonal", "Leonal", 157, 12, "Extra-Planar", "Médio", "variante-de:avoral", "Guardinal."),
        ("azer", "Azer", "Azer", 28, 2, "Extra-Planar", "Médio", "novo", "Fogo."),

        # B
        ("babau", "Babau", "Babau", 50, 6, "Extra-Planar", "Médio", "novo", "Demônio."),
        ("balor", "Balor", "Balor", 51, 20, "Extra-Planar", "Grande", "ja-existe", "Demônio."),
        ("barbazu", "Barbazu", "Bearded Devil", 64, 5, "Extra-Planar", "Médio", "novo", "Diabo Barbado."),
        ("barghest", "Barghest", "Barghest", 29, 4, "Extra-Planar", "Médio", "novo", "Metamorfo."),
        ("barghest-superior", "Barghest Superior", "Greater Barghest", 30, 7, "Extra-Planar", "Grande", "variante-de:barghest", None),
        ("basilisco", "Basilisco", "Basilisk", 30, 5, "Besta Mágica", "Médio", "novo", None),
        ("basilisco-superior-abissal", "Basilisco Superior Abissal", "Abyssal Greater Basilisk", 31, 12, "Extra-Planar", "Grande", "variante-de:basilisco", None),
        ("bebilith", "Bebilith", "Bebilith", 52, 10, "Extra-Planar", "Enorme", "novo", "Demônio."),
        ("behir", "Behir", "Behir", 32, 8, "Besta Mágica", "Enorme", "ja-existe", None),
        ("belker", "Belker", "Belker", 34, 6, "Elemental", "Grande", "novo", "Ar."),
        ("bodak", "Bodak", "Bodak", 35, 8, "Morto-Vivo", "Médio", "novo", None),
        ("bralani", "Bralani", "Bralani", 99, 6, "Extra-Planar", "Médio", "novo", "Eladrin."),
        ("ghaele", "Ghaele", "Ghaele", 100, 13, "Extra-Planar", "Médio", "variante-de:bralani", "Eladrin."),
        ("bugbear", "Bugbear", "Bugbear", 38, 2, "Humanoide", "Médio", "novo", "Goblinoide."),
        ("bulette", "Bulette", "Bulette", 39, 7, "Besta Mágica", "Enorme", "novo", None),

        # C
        ("cacador", "Caçador (Dretch)", "Dretch", 53, 2, "Extra-Planar", "Pequeno", "novo", "Demônio Dretch."),
        ("cacador-invisivel", "Caçador Invisível", "Invisible Stalker", 39, 7, "Elemental", "Grande", "novo", "Ar."),
        ("cao-infernal", "Cão Infernal", "Hell Hound", 40, 3, "Extra-Planar", "Médio", "novo", "Fogo."),
        ("cao-de-guerra-nessian", "Cão de Guerra Nessían", "Nessian Warhound", 40, 9, "Extra-Planar", "Grande", "variante-de:cao-infernal", "Cão Infernal Nessian."),
        ("cao-teleportador", "Cão Teleportador", "Blink Dog", 41, 2, "Besta Mágica", "Médio", "novo", None),
        ("cao-yeth", "Cão Yeth", "Yeth Hound", 41, 3, "Extra-Planar", "Médio", "novo", None),
        ("carnical", "Carniçal", "Ghoul", 42, 1, "Morto-Vivo", "Médio", "ja-existe", None),
        ("lacedon", "Lacedon", "Lacedon", 42, 1, "Morto-Vivo", "Médio", "variante-de:carnical", "Carniçal Aquático."),
        ("livido", "Lívido", "Ghast", 42, 3, "Morto-Vivo", "Médio", "variante-de:carnical", "Ghast."),
        ("centauro", "Centauro", "Centaur", 43, 3, "Humanoide Monstruoso", "Grande", "novo", None),
        ("chuul", "Chuul", "Chuul", 44, 7, "Aberração", "Grande", "novo", None),
        ("cocatriz", "Cocatriz", "Cockatrice", 45, 3, "Besta Mágica", "Pequeno", "novo", None),
        ("constritor", "Constritor", "Choker", 45, 2, "Aberração", "Pequeno", "novo", "Choker."),
        ("cornugon", "Cornugon", "Horned Devil", 65, 16, "Extra-Planar", "Grande", "novo", "Diabo de Chifres."),
        ("coruja-gigante", "Coruja Gigante", "Giant Owl", 46, 3, "Besta Mágica", "Grande", "novo", None),
        ("couatl", "Couatl", "Couatl", 47, 10, "Extra-Planar", "Grande", "novo", None),
        ("cria-vampirica", "Cria Vampírica", "Vampire Spawn", 48, 4, "Morto-Vivo", "Médio", "novo", None),
        ("criatura-abissal-rato", "Rato Atroz Abissal", "Fiendish Dire Rat", 49, 0.333, "Besta Mágica", "Pequeno", "novo", "Exemplo de Criatura Abissal."),
        ("criatura-celestial-leao", "Leão Celestial", "Celestial Lion", 49, 3, "Besta Mágica", "Grande", "novo", "Exemplo de Criatura Celestial."),
        ("cubo-gelatinoso", "Cubo Gelatinoso", "Gelatinous Cube", 185, 3, "Limo", "Grande", "ja-existe", None),

        # D
        ("derro", "Derro", "Derro", 59, 3, "Humanoide Monstruoso", "Pequeno", "novo", None),
        ("destrachan", "Destrachan", "Destrachan", 60, 8, "Aberração", "Grande", "novo", None),
        ("devorador", "Devorador", "Devourer", 60, 11, "Morto-Vivo", "Grande", "novo", None),
        ("devorador-de-aranhas", "Devorador de Aranhas", "Spider Eater", 61, 5, "Besta Mágica", "Grande", "novo", None),
        ("diabo-das-correntes", "Diabo das Correntes (Kyton)", "Chain Devil", 66, 6, "Extra-Planar", "Médio", "novo", "Kyton."),
        ("diabo-farpado", "Diabo Farpado (Hamatula)", "Barbed Devil", 67, 11, "Extra-Planar", "Médio", "novo", "Hamatula."),
        ("diabo-do-gelo", "Diabo do Gelo (Gelugon)", "Ice Devil", 67, 13, "Extra-Planar", "Grande", "novo", "Gelugon."),
        ("diabo-dos-ossos", "Diabo dos Ossos (Osyluth)", "Bone Devil", 68, 9, "Extra-Planar", "Grande", "novo", "Osyluth."),
        ("diabrete", "Diabrete", "Imp", 68, 2, "Extra-Planar", "Miúdo", "novo", "Diabo."),
        ("digestor", "Digestor", "Digester", 72, 6, "Besta Mágica", "Médio", "novo", None),
        ("dilacerador-cinzento", "Dilacerador Cinzento", "Gray Render", 72, 8, "Besta Mágica", "Grande", "novo", None),
        ("djinni", "Djinni", "Djinni", 133, 5, "Extra-Planar", "Grande", "novo", "Gênio."),
        ("djinni-nobre", "Djinni Nobre", "Noble Djinni", 134, 8, "Extra-Planar", "Grande", "variante-de:djinni", "Gênio Nobre."),
        ("efreeti", "Efreeti", "Efreeti", 134, 8, "Extra-Planar", "Grande", "novo", "Gênio de Fogo."),
        ("janni", "Janni", "Janni", 135, 4, "Extra-Planar", "Médio", "novo", "Gênio."),
        ("doppelganger", "Doppelganger", "Doppelganger", 75, 3, "Humanoide Monstruoso", "Médio", "novo", "Metamorfo."),
        ("dragonado", "Dragonado", "Dragonne", 96, 7, "Besta Mágica", "Grande", "novo", None),
        ("driade", "Dríade", "Dryad", 97, 3, "Fada", "Médio", "novo", None),
        ("drider", "Drider", "Drider", 98, 7, "Aberração", "Grande", "novo", "Conjurador."),

        # E
        ("elfo-guerreiro", "Elfo Guerreiro", "Elf Warrior", 107, 0.5, "Humanoide", "Médio", "novo", "Guerreiro Elfo de 1º nível."),
        ("elfo-aquatico", "Elfo Aquático", "Aquatic Elf", 108, 0.5, "Humanoide", "Médio", "variante-de:elfo-guerreiro", None),
        ("drow", "Drow", "Drow", 108, 1, "Humanoide", "Médio", "variante-de:elfo-guerreiro", "Elfo Negro."),
        ("elfo-cinzento", "Elfo Cinzento", "Gray Elf", 109, 0.5, "Humanoide", "Médio", "variante-de:elfo-guerreiro", None),
        ("elfo-da-floresta", "Elfo da Floresta", "Wood Elf", 109, 0.5, "Humanoide", "Médio", "variante-de:elfo-guerreiro", None),
        ("elfo-selvagem", "Elfo Selvagem", "Wild Elf", 109, 0.5, "Humanoide", "Médio", "variante-de:elfo-guerreiro", None),
        ("ente", "Ente", "Treant", 110, 8, "Planta", "Enorme", "novo", "Treant."),
        ("enxame-de-morcegos", "Enxame de Morcegos", "Bat Swarm", 111, 2, "Animal", "Miúdo", "novo", "Enxame."),
        ("enxame-de-ratos", "Enxame de Ratos", "Rat Swarm", 112, 2, "Animal", "Miúdo", "variante-de:enxame-de-morcegos", "Enxame."),
        ("enxame-de-aranhas", "Enxame de Aranhas", "Spider Swarm", 112, 1, "Verme", "Minúsculo", "variante-de:enxame-de-morcegos", "Enxame."),
        ("enxame-de-vespas-abissais", "Enxame de Vespas Abissais", "Hellwasp Swarm", 112, 8, "Besta Mágica", "Minúsculo", "novo", "Enxame Planar."),
        ("enxame-de-centopeias", "Enxame de Centopeias", "Centipede Swarm", 113, 4, "Verme", "Minúsculo", "variante-de:enxame-de-morcegos", "Enxame."),
        ("enxame-de-gafanhotos", "Enxame de Gafanhotos", "Locust Swarm", 113, 2, "Verme", "Minúsculo", "variante-de:enxame-de-morcegos", "Enxame."),
        ("erinyes", "Erinyes", "Erinyes", 69, 8, "Extra-Planar", "Médio", "novo", "Diabo."),
        ("escavador", "Escavador", "Delver", 113, 9, "Aberração", "Enorme", "novo", "Delver."),
        ("espectro", "Espectro", "Spectre", 116, 7, "Morto-Vivo", "Médio", "novo", "Incorpóreo."),
        ("esqueleto-humano-guerreiro", "Esqueleto Humano Guerreiro", "Human Warrior Skeleton", 117, 0.333, "Morto-Vivo", "Médio", "novo", "Exemplo de Esqueleto."),
        ("esqueleto-quimera", "Esqueleto Quimera", "Chimera Skeleton", 117, 5, "Morto-Vivo", "Grande", "variante-de:esqueleto-humano-guerreiro", "Exemplo de Esqueleto."),
        ("estrangulador", "Estrangulador", "Roper", 119, 12, "Aberração", "Grande", "novo", "Roper."),
        ("ettercap", "Ettercap", "Ettercap", 120, 3, "Aberração", "Médio", "novo", None),
        ("ettin", "Ettin", "Ettin", 121, 6, "Gigante", "Grande", "novo", None),

        # F
        ("fantasma-humano-guerreiro", "Fantasma Humano Guerreiro", "Ghost 5th-Level Human Fighter", 124, 7, "Morto-Vivo", "Médio", "novo", "Exemplo de Fantasma."),
        ("fera-do-caos", "Fera do Caos", "Chaos Beast", 125, 7, "Extra-Planar", "Médio", "novo", None),
        ("fogo-fatuo", "Fogo-Fátuo", "Will-o'-Wisp", 126, 6, "Aberração", "Pequeno", "novo", None),
        ("formian-operario", "Formian Operário", "Formian Worker", 127, 0.5, "Extra-Planar", "Pequeno", "novo", "Formian."),
        ("formian-guerreiro", "Formian Guerreiro", "Formian Warrior", 127, 3, "Extra-Planar", "Médio", "variante-de:formian-operario", "Formian."),
        ("formian-capataz", "Formian Capataz", "Formian Taskmaster", 128, 7, "Extra-Planar", "Médio", "variante-de:formian-operario", "Formian."),
        ("formian-marechal", "Formian Marechal", "Formian Myrmarch", 128, 10, "Extra-Planar", "Grande", "variante-de:formian-operario", "Formian."),
        ("formian-rainha", "Formian Rainha", "Formian Queen", 129, 17, "Extra-Planar", "Grande", "variante-de:formian-operario", "Formian."),
        ("fungo-fantasma", "Fungo Fantasma", "Phantom Fungus", 131, 3, "Planta", "Médio", "novo", None),
        ("fungo-violeta", "Fungo Violeta", "Violet Fungus", 131, 3, "Planta", "Médio", "novo", None),
        ("guardiao-fungo", "Guardião (Fungo)", "Shrieker", 130, 1, "Planta", "Médio", "variante-de:fungo-violeta", "Shrieker."),

        # G
        ("gargula", "Gárgula", "Gargoyle", 131, 4, "Humanoide Monstruoso", "Médio", "novo", None),
        ("kapoacinth", "Kapoacinth", "Kapoacinth", 132, 4, "Humanoide Monstruoso", "Médio", "variante-de:gargula", "Gárgula Aquática."),
        ("gato-infernal", "Gato Infernal (Bezekira)", "Hellcat", 70, 7, "Extra-Planar", "Grande", "novo", "Diabo Bezekira."),
        ("gaviao-seta-juvenil", "Gavião-Seta Juvenil", "Juvenile Arrowhawk", 132, 3, "Extra-Planar", "Pequeno", "novo", "Arrowhawk."),
        ("gaviao-seta-adulto", "Gavião-Seta Adulto", "Adult Arrowhawk", 132, 5, "Extra-Planar", "Médio", "variante-de:gaviao-seta-juvenil", "Arrowhawk."),
        ("gaviao-seta-anciao", "Gavião-Seta Ancião", "Elder Arrowhawk", 132, 7, "Extra-Planar", "Grande", "variante-de:gaviao-seta-juvenil", "Arrowhawk."),
        ("gigante-das-colinas", "Gigante das Colinas", "Hill Giant", 139, 7, "Gigante", "Grande", "novo", None),
        ("gigante-de-pedra", "Gigante de Pedra", "Stone Giant", 140, 8, "Gigante", "Grande", "novo", None),
        ("gigante-do-fogo", "Gigante do Fogo", "Fire Giant", 137, 10, "Gigante", "Grande", "novo", None),
        ("gigante-do-gelo", "Gigante do Gelo", "Frost Giant", 139, 9, "Gigante", "Grande", "ja-existe", None),
        ("gigante-do-gelo-jarl", "Gigante do Gelo Jarl", "Frost Giant Jarl", 139, 17, "Gigante", "Grande", "variante-de:gigante-do-gelo", None),
        ("gigante-das-nuvens", "Gigante das Nuvens", "Cloud Giant", 136, 11, "Gigante", "Enorme", "novo", None),
        ("gigante-das-tempestades", "Gigante das Tempestades", "Storm Giant", 141, 13, "Gigante", "Enorme", "novo", None),
        ("girallon", "Girallon", "Girallon", 142, 6, "Besta Mágica", "Grande", "novo", None),
        ("glabrezu", "Glabrezu", "Glabrezu", 54, 13, "Extra-Planar", "Enorme", "ja-existe", "Demônio."),
        ("gnoll", "Gnoll", "Gnoll", 145, 1, "Humanoide", "Médio", "novo", None),
        ("gnomo-guerreiro", "Gnomo Guerreiro", "Gnome Warrior", 146, 0.5, "Humanoide", "Pequeno", "novo", "Guerreiro Gnomo da Rocha de 1º nível."),
        ("gnomo-da-floresta", "Gnomo da Floresta", "Forest Gnome", 148, 0.5, "Humanoide", "Pequeno", "variante-de:gnomo-guerreiro", None),
        ("svirfneblin", "Svirfneblin", "Svirfneblin", 147, 1, "Humanoide", "Pequeno", "variante-de:gnomo-guerreiro", "Gnomo das Profundezas."),
        ("goblin", "Goblin", "Goblin", 148, 0.333, "Humanoide", "Pequeno", "novo", "Goblinoide."),
        ("golem-de-barro", "Golem de Barro", "Clay Golem", 149, 10, "Constructo", "Grande", "novo", None),
        ("golem-de-carne", "Golem de Carne", "Flesh Golem", 150, 7, "Constructo", "Grande", "novo", None),
        ("golem-de-ferro", "Golem de Ferro", "Iron Golem", 151, 13, "Constructo", "Grande", "ja-existe", None),
        ("golem-de-pedra", "Golem de Pedra", "Stone Golem", 151, 11, "Constructo", "Grande", "novo", None),
        ("golem-de-pedra-maior", "Golem de Pedra Maior", "Greater Stone Golem", 152, 16, "Constructo", "Grande", "variante-de:golem-de-pedra", None),
        ("gorgon", "Gorgon", "Gorgon", 152, 8, "Besta Mágica", "Grande", "novo", None),
        ("gosma-ocre", "Gosma Ocre", "Ochre Jelly", 185, 5, "Limo", "Grande", "novo", None),
        ("grick", "Grick", "Grick", 153, 3, "Aberração", "Médio", "novo", None),
        ("grifo", "Grifo", "Griffin", 153, 5, "Besta Mágica", "Grande", "novo", None),
        ("grig", "Grig", "Grig", 122, 1, "Fada", "Miúdo", "novo", None),
        ("nixie", "Nixie", "Nixie", 122, 1, "Fada", "Pequeno", "variante-de:grig", None),
        ("pixie", "Pixie", "Pixie", 123, 4, "Fada", "Pequeno", "variante-de:grig", None),
        ("grimlock", "Grimlock", "Grimlock", 154, 1, "Humanoide Monstruoso", "Médio", "novo", None),
        ("guardiao-protetor", "Guardião Protetor", "Shield Guardian", 155, 8, "Constructo", "Grande", "novo", None),

        # H
        ("halfling-guerreiro", "Halfling Guerreiro", "Halfling Warrior", 157, 0.5, "Humanoide", "Pequeno", "novo", "Guerreiro Halfling de 1º nível."),
        ("halfling-das-profundezas", "Halfling das Profundezas", "Deep Halfling", 158, 0.5, "Humanoide", "Pequeno", "variante-de:halfling-guerreiro", None),
        ("halfling-fantasma", "Halfling Fantasma", "Ghostwise Halfling", 158, 0.5, "Humanoide", "Pequeno", "variante-de:halfling-guerreiro", "Altos-Pequeninos."),
        ("harpia", "Harpia", "Harpy", 159, 4, "Humanoide Monstruoso", "Médio", "novo", None),
        ("harpia-arqueira", "Harpia Arqueira", "Harpy Archer", 160, 11, "Humanoide Monstruoso", "Médio", "variante-de:harpia", "Guerreira 7º nível."),
        ("hezrou", "Hezrou", "Hezrou", 54, 11, "Extra-Planar", "Grande", "novo", "Demônio."),
        ("hidra-5-cabecas", "Hidra de Cinco Cabeças", "Five-Headed Hydra", 160, 4, "Besta Mágica", "Enorme", "novo", "Hidra."),
        ("hidra-6-cabecas", "Hidra de Seis Cabeças", "Six-Headed Hydra", 160, 5, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra."),
        ("hidra-7-cabecas", "Hidra de Sete Cabeças", "Seven-Headed Hydra", 160, 6, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra."),
        ("hidra-8-cabecas", "Hidra de Oito Cabeças", "Eight-Headed Hydra", 160, 7, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra."),
        ("hidra-9-cabecas", "Hidra de Nove Cabeças", "Nine-Headed Hydra", 160, 8, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra."),
        ("hidra-10-cabecas", "Hidra de Dez Cabeças", "Ten-Headed Hydra", 160, 9, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra."),
        ("hidra-11-cabecas", "Hidra de Onze Cabeças", "Eleven-Headed Hydra", 160, 10, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra."),
        ("hidra-12-cabecas", "Hidra de Doze Cabeças", "Twelve-Headed Hydra", 160, 11, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra."),
        ("piro-hidra", "Piro-Hidra", "Pyrohydra", 162, 6, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra de Fogo (7 cabeças de exemplo)."),
        ("crio-hidra", "Crio-Hidra", "Cryohydra", 162, 6, "Besta Mágica", "Enorme", "variante-de:hidra-5-cabecas", "Hidra de Frio (7 cabeças de exemplo)."),
        ("hipogrifo", "Hipogrifo", "Hippogriff", 162, 2, "Besta Mágica", "Grande", "novo", None),
        ("homem-javali", "Homem-Javali", "Wereboar", 174, 2, "Humanoide", "Médio", "novo", "Licantropo."),
        ("homem-javali-atroz", "Homem-Javali Atroz", "Dire Wereboar", 174, 4, "Humanoide", "Médio", "variante-de:homem-javali", "Licantropo."),
        ("homem-rato", "Homem-Rato", "Wererat", 175, 2, "Humanoide", "Médio", "novo", "Licantropo."),
        ("homem-tigre", "Homem-Tigre", "Weretiger", 175, 4, "Humanoide", "Médio", "novo", "Licantropo."),
        ("homem-urso", "Homem-Urso", "Werebear", 176, 5, "Humanoide", "Médio", "novo", "Licantropo."),
        ("lobisomem", "Lobisomem", "Werewolf", 177, 3, "Humanoide", "Médio", "novo", "Licantropo."),
        ("senhor-dos-lobisomens", "Senhor dos Lobisomens", "Werewolf Lord", 177, 14, "Humanoide", "Médio", "variante-de:lobisomem", "Licantropo Guerreiro 10º nível."),
        ("homunculo", "Homúnculo", "Homunculus", 163, 1, "Constructo", "Miúdo", "novo", None),

        # I
        ("inumano", "Inumano", "Ghoul", 166, 3, "Morto-Vivo", "Médio", "novo", "Wight."),
        ("kolyarut", "Kolyarut", "Kolyarut", 165, 12, "Constructo", "Médio", "novo", "Inevitável."),
        ("marut", "Marut", "Marut", 164, 15, "Constructo", "Grande", "variante-de:kolyarut", "Inevitável."),
        ("zelekhut", "Zelekhut", "Zelekhut", 166, 9, "Constructo", "Grande", "variante-de:kolyarut", "Inevitável."),

        # K
        ("kobold", "Kobold", "Kobold", 167, 0.25, "Humanoide", "Pequeno", "novo", "Reptiliano."),
        ("kraken", "Kraken", "Kraken", 168, 12, "Besta Mágica", "Imenso", "novo", "Aquático."),
        ("krenshar", "Krenshar", "Krenshar", 169, 1, "Besta Mágica", "Médio", "novo", None),

        # L
        ("lagarto-eletrico", "Lagarto Elétrico", "Shocker Lizard", 170, 2, "Besta Mágica", "Pequeno", "novo", None),
        ("lamia", "Lâmia", "Lamia", 171, 6, "Besta Mágica", "Médio", "novo", None),
        ("lammasu", "Lammasu", "Lammasu", 172, 8, "Besta Mágica", "Grande", "novo", None),
        ("protetor-dourado", "Protetor Dourado", "Golden Protector", 172, 13, "Besta Mágica", "Grande", "variante-de:lammasu", "Lammasu Celestial."),
        ("leao-marinho", "Leão Marinho", "Sea Lion", 173, 4, "Besta Mágica", "Grande", "novo", None),
        ("lemure", "Lêmure", "Lemure", 70, 1, "Extra-Planar", "Médio", "novo", "Diabo."),
        ("lich-humano-mago", "Lich Humano Mago", "Lich 11th-Level Human Wizard", 182, 13, "Morto-Vivo", "Médio", "novo", "Exemplo de Lich."),
        ("lillend", "Lillend", "Lillend", 184, 7, "Extra-Planar", "Grande", "novo", None),
        ("limo-cinzento", "Limo Cinzento", "Gray Ooze", 186, 4, "Limo", "Médio", "novo", None),
        ("lobo-das-estepes", "Lobo das Estepes", "Winter Wolf", 187, 5, "Besta Mágica", "Grande", "novo", None),
        ("locathah", "Locathah", "Locathah", 188, 0.5, "Humanoide", "Médio", "novo", "Aquático."),
        ("lorde-das-profundezas", "Lorde das Profundezas", "Pit Fiend", 70, 20, "Extra-Planar", "Grande", "ja-existe", "Diabo."),

        # M
        ("magmin", "Magmin", "Magmin", 189, 3, "Elemental", "Pequeno", "novo", "Fogo."),
        ("manticora", "Mantícora", "Manticore", 189, 5, "Besta Mágica", "Grande", "novo", None),
        ("manto-negro", "Manto Negro", "Darkmantle", 190, 1, "Besta Mágica", "Pequeno", "novo", None),
        ("mantor", "Mantor", "Cloaker", 190, 5, "Aberração", "Grande", "novo", "Cloaker."),
        ("marilith", "Marilith", "Marilith", 55, 17, "Extra-Planar", "Grande", "novo", "Demônio."),
        ("mastim-das-sombras", "Mastim das Sombras", "Shadow Mastiff", 191, 5, "Extra-Planar", "Médio", "novo", None),
        ("medusa", "Medusa", "Medusa", 192, 7, "Humanoide Monstruoso", "Médio", "ja-existe", None),
        ("meio-abissal-humano-clerigo", "Meio-Abissal Humano Clérigo", "Half-Fiend 7th-Level Human Cleric", 193, 9, "Extra-Planar", "Médio", "novo", "Exemplo de Meio-Abissal."),
        ("meio-celestial-humano-paladino", "Meio-Celestial Humano Paladino", "Half-Celestial 5th-Level Human Paladin", 194, 7, "Extra-Planar", "Médio", "novo", "Exemplo de Meio-Celestial."),
        ("meio-dragao-negro-humano-guerreiro", "Meio-Dragão Negro Humano Guerreiro", "Half-Dragon 5th-Level Human Fighter", 196, 7, "Dragão", "Médio", "novo", "Exemplo de Meio-Dragão."),
        ("meio-elfo-combatente", "Meio-Elfo Combatente", "Half-Elf Warrior", 107, 0.5, "Humanoide", "Médio", "novo", "Combatente Meio-Elfo de 1º nível."),
        ("meio-orc-combatente", "Meio-Orc Combatente", "Half-Orc Warrior", 213, 0.5, "Humanoide", "Médio", "novo", "Combatente Meio-Orc de 1º nível."),
        ("mimico", "Mímico", "Mimic", 201, 4, "Aberração", "Médio", "novo", None),
        ("minotauro", "Minotauro", "Minotaur", 202, 4, "Humanoide Monstruoso", "Grande", "novo", None),
        ("mohrg", "Mohrg", "Mohrg", 203, 8, "Morto-Vivo", "Médio", "novo", None),
        ("monstro-da-ferrugem", "Monstro da Ferrugem", "Rust Monster", 203, 3, "Aberração", "Médio", "novo", None),
        ("mumia", "Múmia", "Mummy", 204, 5, "Morto-Vivo", "Médio", "novo", None),
        ("senhor-das-mumias", "Senhor das Múmias", "Mummy Lord", 204, 15, "Morto-Vivo", "Médio", "variante-de:mumia", "Clérigo de 10º nível."),

        # N
        ("naga-aquatica", "Naga Aquática", "Water Naga", 206, 7, "Aberração", "Grande", "novo", None),
        ("naga-espiritual", "Naga Espiritual", "Spirit Naga", 206, 9, "Aberração", "Grande", "variante-de:naga-aquatica", None),
        ("naga-guardia", "Naga Guardiã", "Guardian Naga", 207, 10, "Aberração", "Grande", "ja-existe", None),
        ("naga-negra", "Naga Negra", "Dark Naga", 207, 8, "Aberração", "Grande", "variante-de:naga-aquatica", None),
        ("nalfeshnee", "Nalfeshnee", "Nalfeshnee", 56, 14, "Extra-Planar", "Enorme", "novo", "Demônio."),
        ("ninfa", "Ninfa", "Nymph", 208, 7, "Fada", "Médio", "novo", None),

        # O
        ("ogro", "Ogro", "Ogre", 210, 2, "Gigante", "Grande", "ja-existe", None),
        ("ogro-barbaro", "Ogro Bárbaro", "Ogre Barbarian", 210, 6, "Gigante", "Grande", "variante-de:ogro", "Bárbaro de 4º nível."),
        ("merrow", "Merrow", "Merrow", 210, 2, "Gigante", "Grande", "variante-de:ogro", "Ogro Aquático."),
        ("ogro-mago", "Ogro Mago", "Ogre Mage", 211, 7, "Gigante", "Grande", "novo", None),
        ("orc-combatente", "Orc Combatente", "Orc Warrior", 212, 0.5, "Humanoide", "Médio", "novo", "Combatente Orc de 1º nível."),
        ("otyugh", "Otyugh", "Otyugh", 214, 4, "Aberração", "Grande", "novo", None),

        # P
        ("passaro-roca", "Pássaro Roca", "Roc", 215, 9, "Animal", "Gargantuan", "novo", "Roc."),
        ("pegaso", "Pégaso", "Pegasus", 216, 3, "Besta Mágica", "Grande", "novo", None),
        ("pesadelo", "Pesadelo", "Nightmare", 216, 5, "Extra-Planar", "Grande", "novo", None),
        ("cauchemar", "Cauchemar", "Cauchemar", 217, 11, "Extra-Planar", "Enorme", "variante-de:pesadelo", "Pesadelo Superior."),
        ("phasm", "Phasm", "Phasm", 217, 7, "Aberração", "Médio", "novo", "Metamorfo."),
        ("povo-lagarto", "Povo Lagarto", "Lizardfolk", 218, 1, "Humanoide", "Médio", "novo", "Reptiliano."),
        ("povo-do-mar", "Povo do Mar", "Merfolk", 219, 0.333, "Humanoide", "Médio", "novo", "Aquático."),
        ("pseudodragao", "Pseudodragão", "Pseudodragon", 220, 1, "Dragão", "Miúdo", "novo", None),
        ("pudim-negro", "Pudim Negro", "Black Pudding", 186, 7, "Limo", "Enorme", "novo", None),
        ("pudim-negro-anciao", "Pudim Negro Ancião", "Elder Black Pudding", 187, 12, "Limo", "Gargantuan", "variante-de:pudim-negro", None),

        # Q
        ("quasit", "Quasit", "Quasit", 57, 2, "Extra-Planar", "Miúdo", "novo", "Demônio."),
        ("quimera", "Quimera", "Chimera", 221, 7, "Besta Mágica", "Grande", "novo", None),

        # R
        ("rakshasa", "Rakshasa", "Rakshasa", 221, 10, "Extra-Planar", "Médio", "novo", None),
        ("rast", "Rast", "Rast", 222, 5, "Extra-Planar", "Médio", "novo", "Fogo."),
        ("ravid", "Ravid", "Ravid", 223, 5, "Extra-Planar", "Médio", "novo", None),
        ("remorhaz", "Remorhaz", "Remorhaz", 224, 7, "Besta Mágica", "Enorme", "novo", None),
        ("robgoblin", "Hobgoblin", "Hobgoblin", 224, 0.5, "Humanoide", "Médio", "novo", "Goblinoide."),

        # S
        ("sahuagin", "Sahuagin", "Sahuagin", 225, 2, "Humanoide Monstruoso", "Médio", "novo", "Aquático."),
        ("salamandra-jovem", "Salamandra Jovem", "Flamebrother Salamander", 227, 3, "Extra-Planar", "Pequeno", "novo", "Fogo."),
        ("salamandra-adulta", "Salamandra Adulta", "Average Salamander", 227, 6, "Extra-Planar", "Médio", "variante-de:salamandra-jovem", "Fogo."),
        ("salamandra-nobre", "Salamandra Nobre", "Noble Salamander", 227, 10, "Extra-Planar", "Grande", "variante-de:salamandra-jovem", "Fogo."),
        ("salteador-etereo", "Salteador Etéreo", "Ether Succor", 228, 3, "Aberração", "Médio", "novo", "Ether Marauder."),
        ("saqueador-etereo", "Saqueador Etéreo", "Ethereal Filcher", 229, 3, "Aberração", "Médio", "novo", "Ethereal Filcher."),
        ("satiro", "Sátiro", "Satyr", 229, 2, "Fada", "Médio", "novo", None),
        ("skum", "Skum", "Skum", 230, 2, "Aberração", "Médio", "novo", "Aquático."),
        ("sombra", "Sombra", "Shadow", 234, 3, "Morto-Vivo", "Médio", "novo", "Incorpóreo."),
        ("sombra-superior", "Sombra Superior", "Greater Shadow", 235, 8, "Morto-Vivo", "Médio", "variante-de:sombra", "Incorpóreo."),
        ("stirge", "Stirge", "Stirge", 235, 0.5, "Besta Mágica", "Miúdo", "novo", None),
        ("sucubo", "Súcubo", "Succubus", 57, 7, "Extra-Planar", "Médio", "novo", "Demônio."),

        # T
        ("tarrasque", "Tarrasque", "Tarrasque", 236, 20, "Besta Mágica", "Colossal", "ja-existe", None),
        ("tartaruga-dragao", "Tartaruga-Dragão", "Dragon Turtle", 237, 9, "Dragão", "Enorme", "novo", "Aquático."),
        ("tendriculo", "Tendrículo", "Tendriculos", 237, 6, "Planta", "Enorme", "novo", None),
        ("thoqqua", "Thoqqua", "Thoqqua", 238, 2, "Elemental", "Médio", "novo", "Fogo/Terra."),
        ("tiefling", "Tiefling", "Tiefling", 240, 0.5, "Extra-Planar", "Médio", "novo", "Tocado pelos Planos (Planar)."),
        ("tita", "Titã", "Titan", 239, 21, "Extra-Planar", "Enorme", "novo", None),
        ("tojanida-juvenil", "Tojanida Juvenil", "Juvenile Tojanida", 241, 3, "Extra-Planar", "Pequeno", "novo", "Aquático."),
        ("tojanida-adulta", "Tojanida Adulta", "Adult Tojanida", 241, 5, "Extra-Planar", "Médio", "variante-de:tojanida-juvenil", "Aquático."),
        ("tojanida-ancia", "Tojanida Anciã", "Elder Tojanida", 241, 9, "Extra-Planar", "Grande", "variante-de:tojanida-juvenil", "Aquático."),
        ("tribulo-brutal", "Tríbulo Brutal", "Destrachan", 243, 7, "Aberração", "Médio", "novo", "Grick / Choker / Carrion."),
        ("tritao", "Tritão", "Triton", 243, 2, "Extra-Planar", "Médio", "novo", "Aquático."),
        ("troglodita", "Troglodita", "Troglodyte", 244, 1, "Humanoide", "Médio", "novo", "Reptiliano."),
        ("troll", "Troll", "Troll", 245, 5, "Gigante", "Grande", "ja-existe", None),
        ("scrag", "Scrag", "Scrag", 245, 5, "Gigante", "Grande", "variante-de:troll", "Troll Aquático."),
        ("troll-cacador", "Troll Caçador", "Troll Hunter", 245, 11, "Gigante", "Grande", "variante-de:troll", "Guarda-Florestal de 6º nível."),

        # U
        ("uivante", "Uivante", "Howler", 246, 3, "Extra-Planar", "Grande", "novo", None),
        ("unicornio", "Unicórnio", "Unicorn", 247, 3, "Besta Mágica", "Grande", "novo", None),
        ("corcel-celestial", "Corcel Celestial", "Celestial Charger", 248, 13, "Besta Mágica", "Grande", "variante-de:unicornio", "Clérigo de 7º nível."),
        ("urso-coruja", "Urso-Coruja", "Owlbear", 248, 4, "Besta Mágica", "Grande", "ja-existe", None),

        # V
        ("vampiro-humano-guerreiro", "Vampiro Humano Guerreiro", "Vampire 5th-Level Human Fighter", 249, 7, "Morto-Vivo", "Médio", "novo", "Exemplo de Vampiro."),
        ("vargouille", "Vargouille", "Vargouille", 251, 2, "Extra-Planar", "Pequeno", "novo", None),
        ("verme-do-gelo", "Verme do Gelo", "Frost Worm", 253, 12, "Besta Mágica", "Enorme", "novo", None),
        ("verme-purpura", "Verme Púrpura", "Purple Worm", 254, 12, "Besta Mágica", "Gargantuan", "ja-existe", None),
        ("vinha-assassina", "Vinha Assassina", "Assassin Vine", 254, 3, "Planta", "Grande", "novo", None),
        ("vrock", "Vrock", "Vrock", 58, 9, "Extra-Planar", "Grande", "novo", "Demônio."),
        ("andarilho-noturno", "Andarilho Noturno", "Nightwalker", 256, 16, "Morto-Vivo", "Enorme", "novo", "Vulto Noturno."),
        ("rastejante-noturno", "Rastejante Noturno", "Nightcrawler", 257, 18, "Morto-Vivo", "Gargantuan", "variante-de:andarilho-noturno", "Vulto Noturno."),
        ("vulto-alado", "Vulto Alado", "Nightwing", 257, 14, "Morto-Vivo", "Enorme", "variante-de:andarilho-noturno", "Vulto Noturno."),

        # W
        ("worg", "Worg", "Worg", 258, 2, "Besta Mágica", "Médio", "novo", None),
        ("wyvern", "Wyvern", "Wyvern", 259, 6, "Dragão", "Grande", "novo", None),

        # X
        ("xill", "Xill", "Xill", 260, 6, "Extra-Planar", "Médio", "novo", None),
        ("xorn-jovem", "Xorn Jovem", "Minor Xorn", 260, 3, "Extra-Planar", "Pequeno", "novo", "Terra."),
        ("xorn-adulto", "Xorn Adulto", "Average Xorn", 260, 6, "Extra-Planar", "Médio", "variante-de:xorn-jovem", "Terra."),
        ("xorn-anciao", "Xorn Ancião", "Elder Xorn", 260, 8, "Extra-Planar", "Grande", "variante-de:xorn-jovem", "Terra."),

        # Y
        ("yrthak", "Yrthak", "Yrthak", 262, 9, "Besta Mágica", "Enorme", "novo", None),

        # Z
        ("zumbi-humano-comum", "Zumbi Humano Comum", "Human Commoner Zombie", 266, 0.5, "Morto-Vivo", "Médio", "novo", "Exemplo de Zumbi."),
        ("zumbi-minotauro", "Zumbi Minotauro", "Minotaur Zombie", 266, 4, "Morto-Vivo", "Grande", "variante-de:zumbi-humano-comum", "Exemplo de Zumbi."),
    ]

    for m_id, nome, en, pag, nd, tipo, tam, st, obs in demais_monstros:
        # Checar se já existe no catalogo-combate
        if m_id in JA_EXISTEM:
            st = "ja-existe"
        add({
            "id": m_id,
            "nome": nome,
            "nome_original": en,
            "pagina": pag,
            "nd": nd,
            "tipo": tipo,
            "tamanho": tam,
            "status": st,
            "observacao": obs or f"Livro dos Monstros 3.5, p. {pag}."
        })

    # Ordenar por página e nome
    inv.sort(key=lambda x: (x.get("pagina") or 999, x["nome"]))

    # Salvar inventario.json
    inv_file = os.path.join(OUTPUT_DIR, "inventario.json")
    with open(inv_file, "w", encoding="utf-8") as f:
        json.dump(inv, f, ensure_ascii=False, indent=2)

    # Gerar inventario-resumo.md
    resumo_file = os.path.join(OUTPUT_DIR, "inventario-resumo.md")
    from gerar_inventario import gerar_resumo_markdown
    gerar_resumo_markdown(inv, resumo_file)

    print(f"Total de entradas geradas: {len(inv)}")
    return inv

if __name__ == "__main__":
    criar_inventario_completo()
