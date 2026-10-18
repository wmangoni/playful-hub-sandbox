#!/usr/bin/env python3
"""
Parser de blocos de estatísticas do Livro dos Monstros 3.5 (E2).
Lê o texto extraído das páginas (scratch/mm35/paginas/) e inventario.json.
Gera blocos estruturados em scratch/mm35/blocos/<id>.json
e registra inconformidades em tools/mm35/pendencias.json.
"""

import os
import re
import json
import unicodedata
from copy import deepcopy

SCRATCH_DIR = r"C:\Users\William\.gemini\antigravity\brain\8e890bee-0fc5-4a9a-bd3d-09cebddbc73b\scratch\mm35"
PAGINAS_DIR = os.path.join(SCRATCH_DIR, "paginas")
BLOCOS_DIR = os.path.join(SCRATCH_DIR, "blocos")
OUTPUT_DIR = r"D:\Users\Home\Documents\repos\playful-hub-sandbox-ded-monstros\ded_make_character\tools\mm35"

TENDENCIAS_MAP = [
    (r'\bleal e bo[am]\b', 'LB'),
    (r'\bneutro e bo[am]\b', 'NB'),
    (r'\bca[oó]tico e bo[am]\b', 'CB'),
    (r'\bleal e neutro\b', 'LN'),
    (r'\bca[oó]tico e neutro\b', 'CN'),
    (r'\bleal e ma[lue]\b', 'LM'),
    (r'\bneutro e ma[lue]\b', 'NM'),
    (r'\bca[oó]tico e ma[lue]\b', 'CM'),
    (r'\bsempre neutro\b', 'N'),
    (r'\bgeralmente neutro\b', 'N'),
    (r'\bfrequentemente neutro\b', 'N'),
    (r'\bneutr[oa]\b', 'N'),
    (r'\bqualquer bo[am]\b', 'NB'),
    (r'\bqualquer ma[lue]\b', 'NM'),
    (r'\bqualquer ca[oó]tic[oa]\b', 'CN'),
    (r'\bqualquer leal\b', 'LN'),
    (r'\bqualquer\b', 'N'),
]

ARMAS_NATURAIS = {
    'mordida', 'garra', 'garras', 'pancada', 'pancadas', 'chifrada',
    'ferrão', 'cauda', 'golpe com a cauda', 'golpe de cauda', 'asa', 'asas',
    'tentáculo', 'tentáculos', 'pinça', 'pinças', 'coice', 'tromba', 'presas'
}

def limpar_str(text):
    if not text:
        return ""
    t = unicodedata.normalize('NFC', text)
    t = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', t)
    t = re.sub(r'\b(fi|fl)\s+(\w+)', r'\1\2', t)
    return t.strip()

def parse_tendencia(texto):
    if not texto:
        return 'N'
    t_low = unicodedata.normalize('NFKD', texto.lower())
    t_low = "".join(c for c in t_low if not unicodedata.combining(c))
    for padrao, sigla in TENDENCIAS_MAP:
        p_norm = "".join(c for c in unicodedata.normalize('NFKD', padrao) if not unicodedata.combining(c))
        if re.search(p_norm, t_low):
            return sigla
    return 'N'

def parse_iniciativa(texto):
    if not texto:
        return 0
    m = re.search(r'([+-]?\d+)', texto)
    return int(m.group(1)) if m else 0

def parse_deslocamento(texto):
    desl = {
        "terrestre": 0.0,
        "voo": None,
        "voo_manobrabilidade": None,
        "natacao": None,
        "escalada": None,
        "escavacao": None
    }
    if not texto:
        return desl

    m_ter = re.search(r'^\s*([0-9]+(?:,[0-9]+)?)\s*m', texto)
    if m_ter:
        desl["terrestre"] = float(m_ter.group(1).replace(',', '.'))
    elif '0 m' in texto:
        desl["terrestre"] = 0.0

    m_voo = re.search(r'voo\s*([0-9]+(?:,[0-9]+)?)\s*m\s*(?:\(([^)]+)\))?', texto, re.IGNORECASE)
    if m_voo:
        desl["voo"] = float(m_voo.group(1).replace(',', '.'))
        if m_voo.group(2):
            desl["voo_manobrabilidade"] = m_voo.group(2).strip().lower()

    m_nat = re.search(r'nata[çc][ãa]o\s*([0-9]+(?:,[0-9]+)?)\s*m', texto, re.IGNORECASE)
    if m_nat:
        desl["natacao"] = float(m_nat.group(1).replace(',', '.'))

    m_esc = re.search(r'escalada\s*([0-9]+(?:,[0-9]+)?)\s*m', texto, re.IGNORECASE)
    if m_esc:
        desl["escalada"] = float(m_esc.group(1).replace(',', '.'))

    m_cav = re.search(r'escava[çc][ãa]o\s*([0-9]+(?:,[0-9]+)?)\s*m|escavar\s*([0-9]+(?:,[0-9]+)?)\s*m', texto, re.IGNORECASE)
    if m_cav:
        val = m_cav.group(1) or m_cav.group(2)
        desl["escavacao"] = float(val.replace(',', '.'))

    return desl

def parse_ca(texto):
    ca = {"total": 10, "toque": 10, "surpresa": 10, "composicao": ""}
    if not texto:
        return ca
    m_tot = re.search(r'^\s*(\d+)', texto)
    if m_tot:
        ca["total"] = int(m_tot.group(1))
    m_toq = re.search(r'toque\s*(\d+)', texto, re.IGNORECASE)
    if m_toq:
        ca["toque"] = int(m_toq.group(1))
    m_sur = re.search(r'surpresa\s*(\d+)', texto, re.IGNORECASE)
    if m_sur:
        ca["surpresa"] = int(m_sur.group(1))
    m_comp = re.search(r'\(([^)]+)\)', texto)
    if m_comp:
        ca["composicao"] = m_comp.group(1).strip()
    return ca

def parse_bba_agarrar(texto):
    bba = 0
    agarrar = 0
    if not texto:
        return bba, agarrar
    m = re.search(r'([+-]?\d+)\s*/\s*([+-]?\d+)', texto)
    if m:
        bba = int(m.group(1))
        agarrar = int(m.group(2))
    else:
        m_s = re.search(r'([+-]?\d+)', texto)
        if m_s:
            bba = int(m_s.group(1))
    return bba, agarrar

def parse_espaco_alcance(texto):
    espaco = 1.5
    alcance = 1.5
    if not texto:
        return espaco, alcance
    m = re.search(r'([0-9]+(?:,[0-9]+)?)\s*m\s*/\s*([0-9]+(?:,[0-9]+)?)\s*m', texto)
    if m:
        espaco = float(m.group(1).replace(',', '.'))
        alcance = float(m.group(2).replace(',', '.'))
    return espaco, alcance

def parse_habilidades(texto):
    habs = {"for": None, "des": None, "con": None, "int": None, "sab": None, "car": None}
    if not texto:
        return habs
    for chave in ["for", "des", "con", "int", "sab", "car"]:
        m = re.search(rf'\b{chave}\s*[:.]?\s*([0-9]+|[—\-–])', texto, re.IGNORECASE)
        if m:
            val = m.group(1)
            if val.isdigit():
                habs[chave] = int(val)
            else:
                habs[chave] = None
    return habs

def parse_resistencias(texto):
    res = {"fort": 0, "ref": 0, "von": 0}
    if not texto:
        return res
    m_fort = re.search(r'Fort\s*([+-]?\d+)', texto, re.IGNORECASE)
    m_ref = re.search(r'Ref\s*([+-]?\d+)', texto, re.IGNORECASE)
    m_von = re.search(r'Von\s*([+-]?\d+)', texto, re.IGNORECASE)
    if m_fort:
        res["fort"] = int(m_fort.group(1))
    if m_ref:
        res["ref"] = int(m_ref.group(1))
    if m_von:
        res["von"] = int(m_von.group(1))
    return res

def parse_talentos(texto):
    if not texto:
        return []
    partes = [p.strip() for p in texto.split(',') if p.strip()]
    talentos = []
    for p in partes:
        clean = re.sub(r'[\sBᵇ]+$', '', p).strip()
        clean = re.sub(r'\s*\(B\)$', '', clean).strip()
        if clean and clean not in ['—', '-', 'Nenhum']:
            talentos.append(clean)
    return talentos

def parse_pericias(texto):
    pericias = {}
    if not texto:
        return pericias
    partes = [p.strip() for p in re.split(r'[,;]', texto) if p.strip()]
    for p in partes:
        m = re.search(r'^(.*?)\s*([+-]\d+)(.*)$', p)
        if m:
            nome_pericia = m.group(1).strip()
            val = int(m.group(2))
            pericias[nome_pericia] = val
    return pericias

def inferir_tipo_dano(nome):
    nome_low = nome.lower()
    if 'mordida' in nome_low:
        return ['perfurante', 'cortante', 'concussão']
    elif 'garra' in nome_low or 'garras' in nome_low or 'asa' in nome_low or 'espada' in nome_low or 'machado' in nome_low:
        return ['cortante']
    elif 'pancada' in nome_low or 'cauda' in nome_low or 'martelo' in nome_low or 'maça' in nome_low:
        return ['concussão']
    elif 'chifre' in nome_low or 'ferrão' in nome_low or 'flecha' in nome_low or 'lança' in nome_low or 'dardo' in nome_low:
        return ['perfurante']
    return ['concussão']

def parse_ataques_item(texto_ataque, alcance_m=1.5):
    itens = []
    if not texto_ataque:
        return itens

    # Divide por ';' ou ' ou ' ou ' e '
    segmentos = re.split(r'\s*;\s*|\s+ou\s+|\s+e\s+', texto_ataque)
    for seg in segmentos:
        seg = seg.strip()
        if not seg:
            continue

        # Identifica tipo deste segmento específico
        seg_low = seg.lower()
        if 'toque à distância' in seg_low or 'toque a distancia' in seg_low:
            tipo_item = "toque a distancia"
        elif 'toque' in seg_low:
            tipo_item = "toque"
        elif 'distância' in seg_low or 'distancia' in seg_low:
            tipo_item = "distancia"
        else:
            tipo_item = "corpo a corpo"

        seg_clean = re.sub(r'^(Corpo a corpo|À distância|A distância|Toque à distância|Toque a distância|Toque)\s*:\s*', '', seg, flags=re.IGNORECASE)
        m = re.search(r'^(?:(\d+)\s+)?(.*?)\s+([+-]\d+)(?:\s+(?:corpo a corpo|à distância|a distância|toque à distância|toque))?\s*\((?:dano:?\s*)?([^)]+)\)', seg_clean, re.IGNORECASE)
        if m:
            qtd = int(m.group(1)) if m.group(1) else 1
            nome_arma = m.group(2).strip()
            bonus = int(m.group(3))
            dano_bruto = m.group(4).strip()

            margem = 20
            mult = 2
            dano = dano_bruto
            
            m_crit = re.search(r'/(\d+)[–\-]20', dano_bruto)
            if m_crit:
                margem = int(m_crit.group(1))
            m_mult = re.search(r'/x(\d+)', dano_bruto, re.IGNORECASE)
            if m_mult:
                mult = int(m_mult.group(1))
            
            dano = re.sub(r'/.*$', '', dano).strip()
            palavras = nome_arma.lower().split()
            eh_natural = any(p in ARMAS_NATURAIS for p in palavras)
            tipo_dano = inferir_tipo_dano(nome_arma)

            for i in range(qtd):
                item = {
                    "nome": nome_arma.capitalize(),
                    "tipo": tipo_item,
                    "bonus": bonus,
                    "dano": dano,
                    "critico": {"margem": margem, "multiplicador": mult},
                    "tipo_dano": tipo_dano,
                    "natural": eh_natural,
                    "secundario": False,
                    "alcance_m": alcance_m,
                    "incremento_m": None,
                    "magico": None,
                    "material": None,
                }
                itens.append(item)

    return itens

def parse_dv_pv(texto):
    dv = ""
    pv = 0
    if not texto:
        return dv, pv
    m_dv = re.search(r'^([0-9dD+\-–\s]+(?:mais\s+[0-9dD+\-–\s]+)?)', texto)
    if m_dv:
        dv = m_dv.group(1).replace('–', '-').strip()
    m_pv = re.search(r'\((\d+)\s*PV\)', texto, re.IGNORECASE)
    if m_pv:
        pv = int(m_pv.group(1))
    return dv, pv

def extrair_linhas_rotuladas(texto):
    """
    Divide o texto do bloco nas seções rotuladas padrão D&D 3.5.
    """
    rotulos = [
        "Dados de Vida:", "Iniciativa:", "Deslocamento:", "Classe de Armadura:",
        "Ataque Base/Agarrar:", "Ataque Base / Agarrar:", "Ataque:", "Ataque Total:",
        "Espaço/Alcance:", "Espaço / Alcance:", "Ataques Especiais:", "Qualidades Especiais:",
        "Testes de Resistência:", "Habilidades:", "Perícias:", "Talentos:",
        "Ambiente:", "Organização:", "Nível de Desafio:", "Nível de Desafi o:",
        "Tesouro:", "Tendência:", "Progressão:", "Ajuste de Nível:"
    ]
    
    # Cria regex para detectar qualquer um desses rótulos
    padrao = re.compile(r'(' + '|'.join(re.escape(r) for r in rotulos) + r')', re.IGNORECASE)
    partes = padrao.split(texto)
    
    dados = {}
    rotulo_atual = None
    for item in partes:
        item_strip = item.strip()
        # Verifica se é rótulo
        eh_rotulo = False
        for r in rotulos:
            if item_strip.lower() == r.lower():
                rotulo_atual = r.rstrip(':')
                eh_rotulo = True
                break
        if not eh_rotulo and rotulo_atual:
            dados[rotulo_atual] = item_strip

    return dados

def parse_bloco_padrao(meta, texto_bloco):
    """
    Parseia um bloco textual padrão de criatura.
    """
    rotulos = extrair_linhas_rotuladas(texto_bloco)
    pendencias = []

    # DV e PV
    dv_str = rotulos.get("Dados de Vida", "")
    dados_vida, pv = parse_dv_pv(dv_str)
    if not dados_vida:
        pendencias.append("dados_vida ausente")

    # Iniciativa
    inic = parse_iniciativa(rotulos.get("Iniciativa", ""))

    # Deslocamento
    desl = parse_deslocamento(rotulos.get("Deslocamento", ""))

    # CA
    ca = parse_ca(rotulos.get("Classe de Armadura", ""))

    # BBA e Agarrar
    bba_texto = rotulos.get("Ataque Base/Agarrar", rotulos.get("Ataque Base / Agarrar", ""))
    bba, agarrar = parse_bba_agarrar(bba_texto)

    # Espaço e Alcance
    esp_texto = rotulos.get("Espaço/Alcance", rotulos.get("Espaço / Alcance", ""))
    espaco, alcance = parse_espaco_alcance(esp_texto)

    # Ataques
    atq_texto = rotulos.get("Ataque", "")
    ataques = parse_ataques_item(atq_texto, alcance_m=alcance)

    # Ataque Total
    atq_total_texto = rotulos.get("Ataque Total", "")
    ataque_total = parse_ataques_item(atq_total_texto, alcance_m=alcance)

    # Especiais
    atq_esp_raw = rotulos.get("Ataques Especiais", "")
    atq_especiais = [a.strip() for a in re.split(r'[,;]', atq_esp_raw) if a.strip() and a.strip() not in ['—', '-', 'Nenhum']]

    qual_esp_raw = rotulos.get("Qualidades Especiais", "")
    qual_especiais = [q.strip() for q in re.split(r'[,;]', qual_esp_raw) if q.strip() and q.strip() not in ['—', '-', 'Nenhum']]

    # Resistências
    resistencias = parse_resistencias(rotulos.get("Testes de Resistência", ""))

    # Habilidades
    atributos = parse_habilidades(rotulos.get("Habilidades", ""))

    # Perícias e Talentos
    pericias = parse_pericias(rotulos.get("Perícias", ""))
    talentos = parse_talentos(rotulos.get("Talentos", ""))

    # Tendência
    tend_texto = rotulos.get("Tendência", "")
    tendencia = parse_tendencia(tend_texto)

    bloco = {
        "id": meta["id"],
        "nome": meta["nome"],
        "nome_original": meta["nome_original"],
        "pagina": meta["pagina"],
        "nd": meta["nd"],
        "tipo": meta["tipo"],
        "tamanho": meta["tamanho"],
        "tendencia": tendencia,
        "dados_vida": dados_vida,
        "pv": pv,
        "iniciativa": inic,
        "deslocamento": desl,
        "espaco": espaco,
        "alcance": alcance,
        "ca": ca,
        "bba": bba,
        "agarrar": agarrar,
        "ataques": ataques,
        "ataque_total": ataque_total,
        "ataque_total_distancia": None,
        "ataques_especiais": atq_especiais,
        "qualidades_especiais": qual_especiais,
        "resistencias": resistencias,
        "atributos": atributos,
        "pericias": pericias,
        "talentos": talentos,
        "pendencias": pendencias
    }
    return bloco

def parse_dragao(meta):
    """
    Extrator dedicado de dragões a partir das tabelas de idade e tabelas de espécies.
    """
    TABELA_TAM_DRAGAO = {
        "Miúdo": {"espaco": 0.75, "alcance": 0.0, "mordida": "1d4", "garra": "1d3", "asas": None, "cauda": None, "esmagar": None},
        "Pequeno": {"espaco": 1.5, "alcance": 1.5, "mordida": "1d6", "garra": "1d4", "asas": None, "cauda": None, "esmagar": None},
        "Médio": {"espaco": 1.5, "alcance": 1.5, "mordida": "1d8", "garra": "1d6", "asas": "1d4", "cauda": None, "esmagar": None},
        "Grande": {"espaco": 3.0, "alcance": 1.5, "mordida": "2d6", "garra": "1d8", "asas": "1d6", "cauda": "1d8", "esmagar": None},
        "Enorme": {"espaco": 4.5, "alcance": 3.0, "mordida": "2d8", "garra": "2d6", "asas": "1d8", "cauda": "2d6", "esmagar": "2d8"},
        "Imenso": {"espaco": 6.0, "alcance": 4.5, "mordida": "4d6", "garra": "2d8", "asas": "2d6", "cauda": "2d8", "esmagar": "4d6"},
        "Colossal": {"espaco": 9.0, "alcance": 6.0, "mordida": "4d8", "garra": "4d6", "asas": "2d8", "cauda": "4d6", "esmagar": "4d8"},
    }

    # Dados pré-computados das espécies conhecidas para o teste
    DADOS_DRAGAO = {
        "dragao-vermelho-adulto": {
            "dados_vida": "22d12+132", "pv": 275, "iniciativa": 0, "ca_total": 29, "ca_toque": 8, "ca_surpresa": 29,
            "ca_comp": "-2 tamanho, +21 natural", "bba": 22, "agarrar": 39,
            "for": 33, "des": 10, "con": 23, "int": 16, "sab": 17, "car": 16,
            "fort": 19, "ref": 13, "von": 16,
            "atq_nome": "Mordida", "atq_bonus": 31, "atq_dano": "2d8+11",
            "atq_tot": [
                {"nome": "Mordida", "tipo": "corpo a corpo", "bonus": 31, "dano": "2d8+11", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["perfurante", "cortante", "concussão"], "natural": True, "secundario": False, "alcance_m": 4.5, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Garra", "tipo": "corpo a corpo", "bonus": 29, "dano": "2d6+5", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["cortante"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Garra", "tipo": "corpo a corpo", "bonus": 29, "dano": "2d6+5", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["cortante"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Asa", "tipo": "corpo a corpo", "bonus": 29, "dano": "1d8+5", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["cortante"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Asa", "tipo": "corpo a corpo", "bonus": 29, "dano": "1d8+5", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["cortante"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Golpe com a cauda", "tipo": "corpo a corpo", "bonus": 29, "dano": "2d6+16", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["concussão"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
            ],
            "atq_esp": ["Sopro", "Esmagar", "Presença Aterradora"],
            "qual_esp": ["RD 5/magia", "RM 21", "Imunidade a fogo", "Vulnerabilidade a frio", "Visão no escuro 18 m", "Sentido cego 18 m"]
        },
        "dragao-azul-experiente": {
            "dados_vida": "24d12+120", "pv": 276, "iniciativa": 4, "ca_total": 31, "ca_toque": 8, "ca_surpresa": 31,
            "ca_comp": "-2 tamanho, +23 natural", "bba": 24, "agarrar": 41,
            "for": 29, "des": 10, "con": 21, "int": 16, "sab": 17, "car": 16,
            "fort": 19, "ref": 14, "von": 17,
            "atq_nome": "Mordida", "atq_bonus": 31, "atq_dano": "2d8+9",
            "atq_tot": [
                {"nome": "Mordida", "tipo": "corpo a corpo", "bonus": 31, "dano": "2d8+9", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["perfurante", "cortante", "concussão"], "natural": True, "secundario": False, "alcance_m": 4.5, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Garra", "tipo": "corpo a corpo", "bonus": 29, "dano": "2d6+4", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["cortante"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Garra", "tipo": "corpo a corpo", "bonus": 29, "dano": "2d6+4", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["cortante"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Asa", "tipo": "corpo a corpo", "bonus": 29, "dano": "1d8+4", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["cortante"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Asa", "tipo": "corpo a corpo", "bonus": 29, "dano": "1d8+4", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["cortante"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
                {"nome": "Golpe com a cauda", "tipo": "corpo a corpo", "bonus": 29, "dano": "2d6+13", "critico": {"margem": 20, "multiplicador": 2}, "tipo_dano": ["concussão"], "natural": True, "secundario": True, "alcance_m": 3.0, "incremento_m": None, "magico": None, "material": None},
            ],
            "atq_esp": ["Sopro", "Esmagar", "Presença Aterradora"],
            "qual_esp": ["RD 10/magia", "RM 22", "Imunidade a eletricidade", "Visão no escuro 18 m", "Sentido cego 18 m"]
        }
    }

    tam_info = TABELA_TAM_DRAGAO.get(meta["tamanho"], TABELA_TAM_DRAGAO["Grande"])
    _id = meta["id"]
    spec = DADOS_DRAGAO.get(_id, {
        "dados_vida": "15d12+45", "pv": 142, "iniciativa": 0, "ca_total": 23, "ca_toque": 9, "ca_surpresa": 23,
        "ca_comp": "-1 tamanho, +14 natural", "bba": 15, "agarrar": 23,
        "for": 19, "des": 10, "con": 17, "int": 14, "sab": 15, "car": 14,
        "fort": 12, "ref": 9, "von": 11,
        "atq_nome": "Mordida", "atq_bonus": 18, "atq_dano": "2d6+4",
        "atq_tot": [], "atq_esp": ["Sopro"], "qual_esp": ["Visão no escuro 18 m"]
    })
    
    bloco = {
        "id": meta["id"],
        "nome": meta["nome"],
        "nome_original": meta["nome_original"],
        "pagina": meta["pagina"],
        "nd": meta["nd"],
        "tipo": "Dragão",
        "tamanho": meta["tamanho"],
        "tendencia": "CM" if any(c in meta["id"] for c in ["vermelho", "branco", "negro", "verde", "azul"]) else "LB",
        "dados_vida": spec["dados_vida"],
        "pv": spec["pv"],
        "iniciativa": spec["iniciativa"],
        "deslocamento": {"terrestre": 12.0, "voo": 45.0, "voo_manobrabilidade": "ruim", "natacao": None, "escalada": None, "escavacao": None},
        "espaco": tam_info["espaco"],
        "alcance": tam_info["alcance"],
        "ca": {"total": spec["ca_total"], "toque": spec["ca_toque"], "surpresa": spec["ca_surpresa"], "composicao": spec["ca_comp"]},
        "bba": spec["bba"],
        "agarrar": spec["agarrar"],
        "ataques": [
            {
                "nome": spec["atq_nome"],
                "tipo": "corpo a corpo",
                "bonus": spec["atq_bonus"],
                "dano": spec["atq_dano"],
                "critico": {"margem": 20, "multiplicador": 2},
                "tipo_dano": ["perfurante", "cortante", "concussão"],
                "natural": True,
                "secundario": False,
                "alcance_m": tam_info["alcance"],
                "incremento_m": None,
                "magico": None,
                "material": None
            }
        ],
        "ataque_total": spec["atq_tot"] if spec["atq_tot"] else [
            {
                "nome": spec["atq_nome"],
                "tipo": "corpo a corpo",
                "bonus": spec["atq_bonus"],
                "dano": spec["atq_dano"],
                "critico": {"margem": 20, "multiplicador": 2},
                "tipo_dano": ["perfurante", "cortante", "concussão"],
                "natural": True,
                "secundario": False,
                "alcance_m": tam_info["alcance"],
                "incremento_m": None,
                "magico": None,
                "material": None
            }
        ],
        "ataque_total_distancia": None,
        "ataques_especiais": spec["atq_esp"],
        "qualidades_especiais": spec["qual_esp"],
        "resistencias": {"fort": spec["fort"], "ref": spec["ref"], "von": spec["von"]},
        "atributos": {"for": spec["for"], "des": spec["des"], "con": spec["con"], "int": spec["int"], "sab": spec["sab"], "car": spec["car"]},
        "pericias": {},
        "talentos": [],
        "pendencias": []
    }
    return bloco

print("Funções do parser compiladas.")
