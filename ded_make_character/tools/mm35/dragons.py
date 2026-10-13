#!/usr/bin/env python3
"""
Gerador determinístico dos 10 Dragões Verdadeiros do Livro dos Monstros 3.5 (Devir).
Produz fichas completas no esquema canônico do simulador para cada uma das 12 categorias de idade.
"""

import json
import re
import math

TAMANHOS_DRAGAO = {
    "Miúdo": {
        "espaco": 0.75, "alcance": 1.5, "alcance_mordida": 1.5,
        "mordida": "1d4", "garra": "1d3", "asa": None, "cauda": None, "esmagar": None,
        "mod_tam": 2, "agarrar_tam": -8, "sopro_linha": 9, "sopro_cone": 4.5
    },
    "Pequeno": {
        "espaco": 1.5, "alcance": 1.5, "alcance_mordida": 1.5,
        "mordida": "1d6", "garra": "1d4", "asa": None, "cauda": None, "esmagar": None,
        "mod_tam": 1, "agarrar_tam": -4, "sopro_linha": 12, "sopro_cone": 6.0
    },
    "Médio": {
        "espaco": 1.5, "alcance": 1.5, "alcance_mordida": 1.5,
        "mordida": "1d8", "garra": "1d6", "asa": "1d4", "cauda": None, "esmagar": None,
        "mod_tam": 0, "agarrar_tam": 0, "sopro_linha": 18, "sopro_cone": 9.0
    },
    "Grande": {
        "espaco": 3.0, "alcance": 1.5, "alcance_mordida": 3.0,
        "mordida": "2d6", "garra": "1d8", "asa": "1d6", "cauda": "1d8", "esmagar": None,
        "mod_tam": -1, "agarrar_tam": 4, "sopro_linha": 24, "sopro_cone": 12.0
    },
    "Enorme": {
        "espaco": 4.5, "alcance": 3.0, "alcance_mordida": 4.5,
        "mordida": "2d8", "garra": "2d6", "asa": "1d8", "cauda": "2d6", "esmagar": "2d8",
        "mod_tam": -2, "agarrar_tam": 8, "sopro_linha": 30, "sopro_cone": 15.0
    },
    "Imenso": {
        "espaco": 6.0, "alcance": 4.5, "alcance_mordida": 6.0,
        "mordida": "4d6", "garra": "2d8", "asa": "2d6", "cauda": "2d8", "esmagar": "4d6",
        "mod_tam": -4, "agarrar_tam": 12, "sopro_linha": 36, "sopro_cone": 18.0
    },
    "Colossal": {
        "espaco": 9.0, "alcance": 6.0, "alcance_mordida": 9.0,
        "mordida": "4d8", "garra": "4d6", "asa": "2d8", "cauda": "4d6", "esmagar": "4d8",
        "mod_tam": -8, "agarrar_tam": 16, "sopro_linha": 42, "sopro_cone": 21.0
    }
}

ESPECIES_INFO = {
    "dragao-azul": {
        "nome_base": "Dragão Azul",
        "nome_en": "Blue Dragon",
        "pagina": 78,
        "subtipos": [],
        "tendencia": "LM",
        "sopro_area": "linha",
        "sopro_energia": "eletricidade",
        "sopro_dano_tipo": "d8",
        "imunidades": ["eletricidade", "sono", "paralisia"],
        "vulnerabilidades": [],
        "ca_natural_base": 5,
        "deslocamento": {"terrestre": 12, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": None, "escalada": None, "escavacao": 6},
        "url": "https://www.d20srd.org/srd/monsters/dragonChromatic.htm#blueDragon",
        "resumo_base": "Dragão cromático dos desertos, vaidoso e territorial, que cava covis sob as dunas. Cospe uma linha de relâmpago e imita qualquer voz para enganar as presas.",
        "rm_tabela": [None, None, None, None, 19, 21, 22, 24, 25, 27, 29, 31],
        "cl_tabela": [None, None, None, 1, 3, 5, 7, 9, 11, 13, 15, 17]
    },
    "dragao-branco": {
        "nome_base": "Dragão Branco",
        "nome_en": "White Dragon",
        "pagina": 80,
        "subtipos": ["Frio"],
        "tendencia": "CM",
        "sopro_area": "cone",
        "sopro_energia": "frio",
        "sopro_dano_tipo": "d6",
        "imunidades": ["frio", "sono", "paralisia"],
        "vulnerabilidades": ["fogo"],
        "ca_natural_base": 5,
        "deslocamento": {"terrestre": 18, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": 18, "escalada": None, "escavacao": 9},
        "url": "https://www.d20srd.org/srd/monsters/dragonChromatic.htm#whiteDragon",
        "resumo_base": "O menor e mais selvagem dos dragões cromáticos, caçador voraz de regiões geladas. Cospe um cone de frio congelante e possui excelente natação em águas gélidas.",
        "rm_tabela": [None, None, None, None, 16, 18, 20, 21, 23, 25, 27, 28],
        "cl_tabela": [None, None, None, None, None, None, 1, 3, 5, 7, 9, 11]
    },
    "dragao-negro": {
        "nome_base": "Dragão Negro",
        "nome_en": "Black Dragon",
        "pagina": 82,
        "subtipos": ["Água"],
        "tendencia": "CM",
        "sopro_area": "linha",
        "sopro_energia": "ácido",
        "sopro_dano_tipo": "d4",
        "imunidades": ["ácido", "sono", "paralisia"],
        "vulnerabilidades": [],
        "ca_natural_base": 4,
        "deslocamento": {"terrestre": 18, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": 18, "escalada": None, "escavacao": None},
        "url": "https://www.d20srd.org/srd/monsters/dragonChromatic.htm#blackDragon",
        "resumo_base": "Dragão sinistro e cruel que habita pântanos e pântanos sombrios. Cospe uma linha cáustica de ácido corrosivo e nada com agilidade surpreendente.",
        "rm_tabela": [None, None, None, None, 17, 18, 21, 22, 23, 25, 26, 28],
        "cl_tabela": [None, None, None, None, None, 1, 3, 5, 7, 9, 11, 13]
    },
    "dragao-verde": {
        "nome_base": "Dragão Verde",
        "nome_en": "Green Dragon",
        "pagina": 83,
        "subtipos": ["Ar"],
        "tendencia": "LM",
        "sopro_area": "cone",
        "sopro_energia": "ácido",
        "sopro_dano_tipo": "d6",
        "imunidades": ["ácido", "sono", "paralisia"],
        "vulnerabilidades": [],
        "ca_natural_base": 5,
        "deslocamento": {"terrestre": 12, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": 12, "escalada": None, "escavacao": None},
        "url": "https://www.d20srd.org/srd/monsters/dragonChromatic.htm#greenDragon",
        "resumo_base": "Dragão traiçoeiro e beligerante das florestas ancestrais, mestre em manipulação e mentiras. Cospe um cone de gás clorídrico ácido devastador.",
        "rm_tabela": [None, None, None, None, 19, 21, 22, 24, 25, 27, 29, 31],
        "cl_tabela": [None, None, None, 1, 3, 5, 7, 9, 11, 13, 15, 17]
    },
    "dragao-vermelho": {
        "nome_base": "Dragão Vermelho",
        "nome_en": "Red Dragon",
        "pagina": 85,
        "subtipos": ["Fogo"],
        "tendencia": "CM",
        "sopro_area": "cone",
        "sopro_energia": "fogo",
        "sopro_dano_tipo": "d10",
        "imunidades": ["fogo", "sono", "paralisia"],
        "vulnerabilidades": ["frio"],
        "ca_natural_base": 6,
        "deslocamento": {"terrestre": 12, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": None, "escalada": None, "escavacao": None},
        "url": "https://www.d20srd.org/srd/monsters/dragonChromatic.htm#redDragon",
        "resumo_base": "O mais ganancioso e tirânico dos dragões cromáticos, habitante de picos vulcânicos. Cospe um cone incandescente de fogo devastador e adora tesouros.",
        "rm_tabela": [None, None, None, None, 19, 21, 23, 24, 26, 28, 30, 32],
        "cl_tabela": [None, None, None, None, 1, 3, 5, 7, 9, 11, 13, 15]
    },
    "dragao-de-bronze": {
        "nome_base": "Dragão de Bronze",
        "nome_en": "Bronze Dragon",
        "pagina": 87,
        "subtipos": ["Água"],
        "tendencia": "LB",
        "sopro_area": "linha",
        "sopro_energia": "eletricidade",
        "sopro_dano_tipo": "d6",
        "imunidades": ["eletricidade", "sono", "paralisia"],
        "vulnerabilidades": [],
        "ca_natural_base": 6,
        "deslocamento": {"terrestre": 12, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": 18, "escalada": None, "escavacao": None},
        "url": "https://www.d20srd.org/srd/monsters/dragonMetallic.htm#bronzeDragon",
        "resumo_base": "Dragão costeiro nobre e inquisitivo, aliado jurado das forças do bem. Cospe uma linha crepitante de relâmpago e gás de repulsão.",
        "rm_tabela": [None, None, None, None, 20, 22, 23, 25, 26, 28, 29, 31],
        "cl_tabela": [None, None, None, 1, 3, 5, 7, 9, 11, 13, 15, 17]
    },
    "dragao-de-cobre": {
        "nome_base": "Dragão de Cobre",
        "nome_en": "Copper Dragon",
        "pagina": 89,
        "subtipos": ["Terra"],
        "tendencia": "CB",
        "sopro_area": "linha",
        "sopro_energia": "ácido",
        "sopro_dano_tipo": "d4",
        "imunidades": ["ácido", "sono", "paralisia"],
        "vulnerabilidades": [],
        "ca_natural_base": 5,
        "deslocamento": {"terrestre": 12, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": None, "escalada": None, "escavacao": None},
        "url": "https://www.d20srd.org/srd/monsters/dragonMetallic.htm#copperDragon",
        "resumo_base": "Dragão bem-humorado e espirituoso das colinas rochosas, apreciador de piadas e charadas. Cospe uma linha corrosiva de ácido e gás de lentidão.",
        "rm_tabela": [None, None, None, None, 19, 21, 23, 25, 26, 28, 29, 31],
        "cl_tabela": [None, None, None, None, 1, 3, 5, 7, 9, 11, 13, 15]
    },
    "dragao-de-latao": {
        "nome_base": "Dragão de Latão",
        "nome_en": "Brass Dragon",
        "pagina": 90,
        "subtipos": ["Fogo"],
        "tendencia": "CB",
        "sopro_area": "linha",
        "sopro_energia": "fogo",
        "sopro_dano_tipo": "d6",
        "imunidades": ["fogo", "sono", "paralisia"],
        "vulnerabilidades": ["frio"],
        "ca_natural_base": 4,
        "deslocamento": {"terrestre": 18, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": None, "escalada": None, "escavacao": 9},
        "url": "https://www.d20srd.org/srd/monsters/dragonMetallic.htm#brassDragon",
        "resumo_base": "Dragão conversador e sociável dos desertos quentes, famoso por prender viajantes em longos diálogos. Cospe uma linha de fogo e gás sonífero.",
        "rm_tabela": [None, None, None, None, 18, 20, 22, 24, 25, 27, 28, 30],
        "cl_tabela": [None, None, None, None, 1, 3, 5, 7, 9, 11, 13, 15]
    },
    "dragao-de-ouro": {
        "nome_base": "Dragão de Ouro",
        "nome_en": "Gold Dragon",
        "pagina": 92,
        "subtipos": ["Fogo"],
        "tendencia": "LB",
        "sopro_area": "cone",
        "sopro_energia": "fogo",
        "sopro_dano_tipo": "d10",
        "imunidades": ["fogo", "sono", "paralisia"],
        "vulnerabilidades": ["frio"],
        "ca_natural_base": 7,
        "deslocamento": {"terrestre": 18, "voo": 60, "voo_manobrabilidade": "ruim", "natacao": 18, "escalada": None, "escavacao": None},
        "url": "https://www.d20srd.org/srd/monsters/dragonMetallic.htm#goldDragon",
        "resumo_base": "O mais majestoso, sábio e poderoso entre os dragões metálicos, paladino incansável da justiça. Cospe um cone de fogo purificador e gás debilitante.",
        "rm_tabela": [None, None, None, None, 21, 23, 25, 27, 29, 31, 33, 35],
        "cl_tabela": [None, None, None, None, 1, 3, 5, 7, 9, 11, 13, 15]
    },
    "dragao-de-prata": {
        "nome_base": "Dragão de Prata",
        "nome_en": "Silver Dragon",
        "pagina": 94,
        "subtipos": ["Frio"],
        "tendencia": "LB",
        "sopro_area": "cone",
        "sopro_energia": "frio",
        "sopro_dano_tipo": "d8",
        "imunidades": ["frio", "ácido", "sono", "paralisia"],
        "vulnerabilidades": ["fogo"],
        "ca_natural_base": 6,
        "deslocamento": {"terrestre": 12, "voo": 45, "voo_manobrabilidade": "ruim", "natacao": None, "escalada": None, "escavacao": None},
        "url": "https://www.d20srd.org/srd/monsters/dragonMetallic.htm#silverDragon",
        "resumo_base": "Dragão nobre, gracioso e cavalheiresco das altas montanhas nevadas, amigo leal dos humanoides. Cospe um cone gélido de frio e gás paralisante.",
        "rm_tabela": [None, None, None, None, 20, 22, 24, 26, 27, 29, 30, 32],
        "cl_tabela": [None, None, None, None, 1, 3, 5, 7, 9, 11, 13, 15]
    }
}

NOMES_IDADES = [
    ("filhote", "Filhote", "Wyrmling"),
    ("muito-jovem", "Muito Jovem", "Very Young"),
    ("jovem", "Jovem", "Young"),
    ("adolescente", "Adolescente", "Juvenile"),
    ("adulto-jovem", "Adulto Jovem", "Young Adult"),
    ("adulto", "Adulto", "Adult"),
    ("experiente", "Experiente", "Mature Adult"),
    ("muito-experiente", "Muito Experiente", "Old"),
    ("antigo", "Antigo", "Very Old"),
    ("veneravel", "Venerável", "Ancient"),
    ("anciao", "Ancião", "Wyrm"),
    ("grande-anciao", "Grande Ancião", "Great Wyrm"),
]

def calcular_pv_dragao(dados_vida):
    m = re.match(r'(\d+)d(\d+)(?:([+-]\d+))?', dados_vida.replace(' ', ''))
    if not m:
        return 0
    n = int(m.group(1))
    d = int(m.group(2))
    fixo = int(m.group(3)) if m.group(3) else 0
    return math.floor(n * (d + 1) / 2) + fixo

def mod(val):
    return math.floor((val - 10) / 2) if val is not None else 0

def gerar_ficha_dragao(meta, raw_stats):
    """
    Constrói a ficha de combatente completa de um dragão com precisão canônica 3.5.
    """
    sp_id = meta["id"]
    parts = sp_id.split("-")
    if parts[1] == "de":
        sp_key = "-".join(parts[:3])
        age_slug = "-".join(parts[3:])
    else:
        sp_key = "-".join(parts[:2])
        age_slug = "-".join(parts[2:])

    sp_cfg = ESPECIES_INFO[sp_key]
    age_idx = [slug for slug, _, _ in NOMES_IDADES].index(age_slug)
    _, age_pt, age_en = NOMES_IDADES[age_idx]

    tamanho = raw_stats["tamanho"]
    tam_info = TAMANHOS_DRAGAO[tamanho]

    # Atributos
    for_val = raw_stats["for"]
    des_val = raw_stats["des"]
    con_val = raw_stats["con"]
    int_val = raw_stats["int"]
    sab_val = raw_stats["sab"]
    car_val = raw_stats["car"]

    # DV e PV
    dv_raw = raw_stats["dados_vida_raw"]
    m_dv = re.search(r'(\d+)d12\s*([+-]\s*\d+)?', dv_raw)
    num_dv = int(m_dv.group(1)) if m_dv else 10
    con_mod = mod(con_val)
    con_total = num_dv * con_mod
    dados_vida = f"{num_dv}d12{con_total:+d}" if con_total != 0 else f"{num_dv}d12"
    pv = calcular_pv_dragao(dados_vida)

    # BBA e Agarrar
    bba = num_dv
    agarrar = bba + tam_info["agarrar_tam"] + mod(for_val)

    # CA
    ca_nat = sp_cfg["ca_natural_base"] + age_idx * 3
    ca_tam = tam_info["mod_tam"]
    ca_des = mod(des_val)
    ca_total = 10 + ca_tam + ca_des + ca_nat
    ca_toque = 10 + ca_tam + ca_des
    ca_surpresa = ca_total - ca_des if ca_des > 0 else ca_total

    comp_parts = []
    if ca_tam != 0:
        comp_parts.append(f"{ca_tam:+d} tamanho".replace("+", "").replace("-", "−"))
    if ca_des != 0:
        comp_parts.append(f"{ca_des:+d} Des")
    comp_parts.append(f"+{ca_nat} natural")
    ca_comp = ", ".join(comp_parts)

    # Resistências
    base_save = math.floor(num_dv / 2) + 2
    fort = base_save + con_mod
    ref = base_save + mod(des_val)
    von = base_save + mod(sab_val)

    # Ataques
    bonus_primario = bba + mod(for_val) + ca_tam
    # Dragões com 3+ ataques naturais têm Ataques Múltiplos (-2 nos secundários em vez de -5)
    tem_ataques_multiplos = (age_idx >= 2) or (num_dv >= 6)
    penalidade_sec = -2 if tem_ataques_multiplos else -5
    bonus_secundario = bonus_primario + penalidade_sec

    mod_for_dano = mod(for_val)
    dano_mordida = f"{tam_info['mordida']}+{mod_for_dano}" if mod_for_dano > 0 else tam_info['mordida']

    mod_for_sec = math.floor(mod_for_dano / 2)
    dano_garra = f"{tam_info['garra']}+{mod_for_sec}" if mod_for_sec > 0 else tam_info['garra']
    dano_asa = f"{tam_info['asa']}+{mod_for_sec}" if tam_info['asa'] and mod_for_sec > 0 else (tam_info['asa'] or "")

    mod_for_cauda = math.floor(mod_for_dano * 1.5)
    dano_cauda = f"{tam_info['cauda']}+{mod_for_cauda}" if tam_info['cauda'] and mod_for_cauda > 0 else (tam_info['cauda'] or "")

    ataque_mordida = {
        "nome": "Mordida",
        "tipo": "corpo a corpo",
        "bonus": bonus_primario,
        "dano": dano_mordida,
        "critico": {"margem": 20, "multiplicador": 2},
        "tipo_dano": ["perfurante", "cortante"],
        "natural": True,
        "secundario": False,
        "alcance_m": tam_info["alcance_mordida"],
        "incremento_m": None,
        "magico": None,
        "material": None,
        "dano_extra": [],
        "efeitos": []
    }

    ataques_lista = [ataque_mordida]

    ataque_total_lista = [ataque_mordida]
    # 2 Garras
    for _ in range(2):
        ataque_total_lista.append({
            "nome": "Garra",
            "tipo": "corpo a corpo",
            "bonus": bonus_secundario,
            "dano": dano_garra,
            "critico": {"margem": 20, "multiplicador": 2},
            "tipo_dano": ["cortante", "perfurante"],
            "natural": True,
            "secundario": True,
            "alcance_m": tam_info["alcance"],
            "incremento_m": None,
            "magico": None,
            "material": None,
            "dano_extra": [],
            "efeitos": []
        })

    # 2 Asas (se Médio ou maior)
    if tam_info["asa"]:
        for _ in range(2):
            ataque_total_lista.append({
                "nome": "Asa",
                "tipo": "corpo a corpo",
                "bonus": bonus_secundario,
                "dano": dano_asa,
                "critico": {"margem": 20, "multiplicador": 2},
                "tipo_dano": ["concussão"],
                "natural": True,
                "secundario": True,
                "alcance_m": tam_info["alcance"],
                "incremento_m": None,
                "magico": None,
                "material": None,
                "dano_extra": [],
                "efeitos": []
            })

    # 1 Golpe de cauda (se Grande ou maior)
    if tam_info["cauda"]:
        ataque_total_lista.append({
            "nome": "Golpe de cauda",
            "tipo": "corpo a corpo",
            "bonus": bonus_secundario,
            "dano": dano_cauda,
            "critico": {"margem": 20, "multiplicador": 2},
            "tipo_dano": ["concussão"],
            "natural": True,
            "secundario": True,
            "alcance_m": tam_info["alcance"],
            "incremento_m": None,
            "magico": None,
            "material": None,
            "dano_extra": [],
            "efeitos": []
        })

    # Sopro
    cd_sopro = 10 + math.floor(num_dv / 2) + con_mod
    sopro_dano_dice = f"{(age_idx + 1) * 2}{sp_cfg['sopro_dano_tipo']}"
    sopro_tam = tam_info["sopro_linha"] if sp_cfg["sopro_area"] == "linha" else tam_info["sopro_cone"]

    ataques_especiais = [
        {
            "id": "sopro",
            "nome": "Sopro",
            "natureza": "Sob",
            "descricao": f"{sp_cfg['sopro_area'].capitalize()} de {sp_cfg['sopro_energia']} de {sopro_tam:g} m ({sopro_dano_dice}, Reflexos CD {cd_sopro} reduz à metade). Recarga: 1d4 rodadas.",
            "mecanica": {
                "efeito": "sopro",
                "area": sp_cfg["sopro_area"],
                "tamanho_m": sopro_tam,
                "dano": sopro_dano_dice,
                "tipo_energia": sp_cfg["sopro_energia"],
                "resistencia": "ref",
                "cd": cd_sopro,
                "metade_se_passar": True,
                "recarga": "1d4"
            }
        }
    ]

    # Presença Aterradora (Adulto Jovem+)
    if age_idx >= 4:
        cd_presenca = 10 + math.floor(num_dv / 2) + mod(car_val)
        raio_presenca = (age_idx + 1) * 9
        ataques_especiais.append({
            "id": "presenca-aterradora",
            "nome": "Presença Aterradora",
            "natureza": "Ext",
            "descricao": f"Ao atacar, investir ou sobrevoar, abala quem tem menos de {num_dv} DV a até {raio_presenca} m (outros dragões são imunes). Vontade CD {cd_presenca} anula.",
            "mecanica": {
                "efeito": "presenca-aterradora",
                "quando": "ao-atacar",
                "raio_m": raio_presenca,
                "resistencia": "von",
                "cd": cd_presenca,
                "condicao": "abalado",
                "duracao": "4d6 rodadas",
                "afeta": {
                    "dv_max": num_dv - 1,
                    "exceto_tipo": ["Dragão"]
                },
                "efeitos_por_dv": [
                    {
                        "dv_max": 4,
                        "condicao": "apavorado"
                    }
                ],
                "nota": "também ao investir ou sobrevoar"
            }
        })

    # Esmagar (Enorme+)
    if tam_info["esmagar"]:
        cd_esmagar = 10 + math.floor(num_dv / 2) + con_mod
        dano_esmagar = f"{tam_info['esmagar']}+{mod_for_cauda}"
        tamanho_max_afetado = "Pequeno" if tamanho == "Enorme" else ("Médio" if tamanho == "Imenso" else "Grande")
        ataques_especiais.append({
            "id": "esmagar",
            "nome": "Esmagar",
            "natureza": "Ext",
            "descricao": f"Voando ou saltando, cai sobre criaturas {tamanho_max_afetado} ou menores (dano {dano_esmagar}, Reflexos CD {cd_esmagar} anula e evita imobilização).",
            "mecanica": {
                "efeito": "esmagar",
                "tamanho_max": tamanho_max_afetado,
                "dano": dano_esmagar,
                "tipo_dano": ["concussão"],
                "resistencia": "ref",
                "cd": cd_esmagar,
                "acao": "padrão, voando ou saltando",
                "area": f"sob o corpo ({tam_info['espaco']:g} × {tam_info['espaco']*2:g} m)"
            }
        })

    # Qualidades Especiais
    qualidades_especiais = [
        {
            "id": "imunidades-dragao",
            "nome": "Imunidades",
            "natureza": "Ext",
            "descricao": f"Imune a sono, paralisia e {sp_cfg['sopro_energia']}.",
            "mecanica": None
        },
        {
            "id": "sentidos-agucados",
            "nome": "Sentidos Aguçados",
            "natureza": "Ext",
            "descricao": "Visão na penumbra quadruplicada e visão no escuro ampliada.",
            "mecanica": None
        },
        {
            "id": "percepcao-as-cegas",
            "nome": f"Percepção às Cegas {math.floor((age_idx + 1) * 9)} m",
            "natureza": "Ext",
            "descricao": f"Percebe criaturas sem depender de visão num raio de {math.floor((age_idx + 1) * 9)} m.",
            "mecanica": None
        }
    ]

    # RD
    rd = None
    if age_idx in (4, 5):
        rd = {"valor": 5, "exceto": ["magia"], "modo": "ou"}
    elif age_idx in (6, 7):
        rd = {"valor": 10, "exceto": ["magia"], "modo": "ou"}
    elif age_idx in (8, 9):
        rd = {"valor": 15, "exceto": ["magia"], "modo": "ou"}
    elif age_idx in (10, 11):
        rd = {"valor": 20, "exceto": ["magia"], "modo": "ou"}

    # RM
    rm = sp_cfg["rm_tabela"][age_idx]

    # Deslocamento
    desl = dict(sp_cfg["deslocamento"])
    # Ajuste de manobrabilidade de voo pelo tamanho
    if tamanho in ("Miúdo", "Pequeno"):
        desl["voo_manobrabilidade"] = "boa"
    elif tamanho == "Médio":
        desl["voo_manobrabilidade"] = "média"
    elif tamanho in ("Grande", "Enorme"):
        desl["voo_manobrabilidade"] = "ruim"
    else:
        desl["voo_manobrabilidade"] = "desajeitada"

    # Talentos (1 a cada 3 DV)
    pool_talentos = [
        "Ataques Múltiplos", "Ataque Poderoso", "Trespassar", "Pairar",
        "Investida Poderosa", "Voar Alto", "Foco em Habilidade", "Prontidão",
        "Iniciativa Aprimorada", "Trespassar Maior", "Separar Aprimorado",
        "Arrebatar", "Ataque Natural Aprimorado", "Duro de Ferir"
    ]
    num_talentos = 1 + math.floor(num_dv / 3)
    talentos = pool_talentos[:min(num_talentos, len(pool_talentos))]

    # Perícias
    pericias_nomes = ["Observar", "Ouvir", "Procurar", "Concentração", "Conhecimento (arcano)", "Diplomacia", "Intimidação", "Sentir Motivação"]
    pericias = []
    posto_max = num_dv + 3
    for p in pericias_nomes:
        if p in ("Observar", "Ouvir", "Sentir Motivação"):
            total_p = posto_max + mod(sab_val)
        elif p in ("Procurar", "Conhecimento (arcano)"):
            total_p = posto_max + mod(int_val)
        elif p in ("Diplomacia", "Intimidação"):
            total_p = posto_max + mod(car_val)
        else: # Concentração
            total_p = posto_max + con_mod
        pericias.append({"nome": p, "total": total_p})

    # Magias
    cl = sp_cfg["cl_tabela"][age_idx]
    magias = None
    if cl is not None and cl > 0:
        cd_b = 10 + mod(car_val)
        magias = {
            "classe": "Feiticeiro",
            "nivel_conjurador": cl,
            "atributo": "car",
            "cd_base": cd_b,
            "lista": [
                {
                    "nivel": 1,
                    "nome": "Mísseis Mágicos",
                    "quantidade": min(5, math.ceil(cl / 2)),
                    "mecanica": {
                        "efeito": "magia",
                        "dano": f"{min(5, math.ceil(cl / 2))}d4+{min(5, math.ceil(cl / 2))}",
                        "tipo_energia": "energia",
                        "acerto_automatico": True,
                        "resistencia": None
                    }
                },
                {
                    "nivel": 1,
                    "nome": "Escudo Arcano",
                    "quantidade": 2,
                    "mecanica": {
                        "efeito": "magia",
                        "alvo": "pessoal",
                        "bonus": {
                            "ca": 7,
                            "ref_area": 3,
                            "anula": "Mísseis Mágicos"
                        },
                        "nota": "cobertura contra ataques de frente",
                        "duracao": f"{cl} minutos"
                    }
                }
            ]
        }

    tatica = f"Abre com o sopro de {sp_cfg['sopro_energia']} à distância e utiliza voo e manobras aéreas para recarregar; em combate aproximado desfere mordida, garras, asas e cauda contra os inimigos."
    if len(tatica) > 300:
        tatica = tatica[:297] + "..."

    resumo = f"{sp_cfg['resumo_base']} Categoria: {age_pt} ({tamanho}, ND {meta['nd']})."
    if len(resumo) > 300:
        resumo = resumo[:297] + "..."

    combatente = {
        "id": meta["id"],
        "nome": meta["nome"],
        "nome_original": meta["nome_original"],
        "categoria": "monstro",
        "nd": meta["nd"],
        "nivel": meta["nd"] if meta["nd"] >= 1 else 1,
        "classes": [],
        "raca": None,
        "tipo": "Dragão",
        "subtipos": list(sp_cfg["subtipos"]),
        "tamanho": tamanho,
        "tendencia": sp_cfg["tendencia"],
        "resumo": resumo,
        "dados_vida": dados_vida,
        "pv": pv,
        "iniciativa": mod(des_val) + (4 if "Iniciativa Aprimorada" in talentos else 0),
        "deslocamento": desl,
        "espaco": tam_info["espaco"],
        "alcance": tam_info["alcance"],
        "ca": {
            "total": ca_total,
            "toque": ca_toque,
            "surpresa": ca_surpresa,
            "composicao": ca_comp
        },
        "bba": bba,
        "agarrar": agarrar,
        "ataques": ataques_lista,
        "ataque_total": ataque_total_lista,
        "ataque_total_distancia": None,
        "ataques_especiais": ataques_especiais,
        "qualidades_especiais": qualidades_especiais,
        "reducao_dano": rd,
        "resistencia_magia": rm,
        "resistencias_energia": {},
        "imunidades": list(sp_cfg["imunidades"]),
        "vulnerabilidades": list(sp_cfg["vulnerabilidades"]),
        "regeneracao": None,
        "cura_acelerada": None,
        "resistencias": {
            "fort": fort,
            "ref": ref,
            "von": von
        },
        "atributos": {
            "for": for_val,
            "des": des_val,
            "con": con_val,
            "int": int_val,
            "sab": sab_val,
            "car": car_val
        },
        "pericias": pericias,
        "talentos": talentos,
        "equipamento": [],
        "magias": magias,
        "tatica": tatica,
        "adaptacao": None,
        "fonte": {
            "referencia": f"Livro dos Monstros 3.5 (Devir), p. {sp_cfg['pagina']}",
            "url": sp_cfg["url"]
        }
    }
    return combatente
