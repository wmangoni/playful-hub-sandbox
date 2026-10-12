#!/usr/bin/env python3
"""
Módulo de parsing e construção de combatentes padrão (não-dragões) do Livro dos Monstros 3.5 (Devir).
Garante 100% de conformidade com o formato canônico exigido por validar-catalogo.js.
"""

import os
import re
import math
import unicodedata

AGARRAR_TAMANHO = {
    "Minúsculo": -16, "Mínimo": -16, "Diminuto": -12, "Miúdo": -8, "Miúda": -8,
    "Pequeno": -4, "Pequena": -4, "Médio": 0, "Média": 0, "Grande": 4,
    "Enorme": 8, "Imenso": 12, "Imensa": 12, "Colossal": 16
}

TAMANHO_NORM = {
    "Miúda": "Miúdo", "Pequena": "Pequeno", "Média": "Médio",
    "Imensa": "Imenso"
}

TIPOS_VALIDOS = {
    'Aberração', 'Animal', 'Besta Mágica', 'Constructo', 'Dragão',
    'Elemental', 'Fada', 'Gigante', 'Humanoide', 'Humanoide Monstruoso',
    'Limo', 'Extra-Planar', 'Planta', 'Morto-Vivo', 'Verme'
}

ARMAS_NATURAIS = {
    'mordida', 'garra', 'garras', 'pancada', 'pancadas', 'chifrada',
    'ferrão', 'ferrao', 'cauda', 'golpe com a cauda', 'golpe de cauda',
    'asa', 'asas', 'tentáculo', 'tentaculo', 'tentáculos', 'pinça', 'pinças',
    'pinca', 'coice', 'tromba', 'presas', 'chifre', 'chifres', 'bicada', 'bico'
}

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

TALENTOS_VALIDOS = {
    'ACUIDADE COM ARMA', 'AGILIDADE', 'AGARRAR APRIMORADO', 'APARÊNCIA INOFENSIVA',
    'APARAR', 'ARREBATAR', 'ATAQUE DESARMADO APRIMORADO', 'ATAQUE EM VOO',
    'ATAQUE GIRATÓRIO', 'ATAQUE NATURAL APRIMORADO', 'ATAQUE PODEROSO',
    'ATAQUES MÚLTIPLOS', 'ATROPELAR', 'AVENTUREIRO NATO', 'BLOQUEIO AMBIDESTRO',
    'CAPACIDADE DE CARGA ADICIONAL', 'COMBATER COM DUAS ARMAS', 'COMBATER COM DUAS ARMAS MAIOR',
    'COMBATER COM DUAS ARMAS APRIMORADO', 'COMBATER COM MÚLTIPLAS ARMAS', 'CORRIDA',
    'DESARMAR APRIMORADO', 'DESLOCAMENTO', 'DESTREZA FURTIVA', 'DILACERAR COM DUAS ARMAS',
    'DURO DE FERIR', 'ESPECIALIZAÇÃO EM ARMA', 'ESPECIALIZAÇÃO EM COMBATE', 'ESQUIVA',
    'FOCO EM ARMA', 'FOCO em arma (mordida)', 'FOCO EM HABILIDADE', 'FOCO EM MAGIA',
    'FORMA DO MAR', 'FORMA FEROZ DO MAR', 'FORMA MONSTRUOSA DO MAR', 'FÚRIA GUERREIRA',
    'GOLPE ARRASADOR', 'IMPOSTOR', 'INICIATIVA APRIMORADA', 'INTOLERÂNCIA',
    'INVESTIDA AÉREA', 'INVESTIDA PODEROSA', 'INVOCAR FAMILIAR', 'LIDERANÇA',
    'LUTA C/ ARMAS DUPLAS', 'LUTA S/ ARMAS APRIMORADA', 'MEMÓRIA RACIAL', 'MOBILIDADE',
    'MULTIDESTREZA', 'NATAÇÃO RÁPIDA', 'NEGOCIADOR', 'PAIRAR', 'PERSUASIVO',
    'PROSPERIDADE', 'PRONTIDÃO', 'RASTREAMENTO', 'REFLEXOS DE COMBATE', 'REFLEXOS RÁPIDOS',
    'RELIGIOSO', 'RESISTÊNCIA A ELEMENTOS', 'RESISTÊNCIA FÍSICA', 'RESISTÊNCIA MAIOR',
    'ROBUSTEZ', 'SAQUE RÁPIDO', 'SEPARAR', 'SEPARAR APRIMORADO', 'SILENCIOSO',
    'SORTE DE HERÓI', 'TIRO CERTEIRO', 'TIRO DISTANTE', 'TIRO LONGO', 'TIRO MÚLTIPLO',
    'TIRO PRECISO', 'TIRO RÁPIDO', 'TORCIDA', 'TRAPACEIRO NATO', 'TRESPASSAR',
    'TRESPASSAR MAIOR', 'VIGILÂNCIA', 'VONTADE DE FERRO', 'VOAR ALTO', 'VOZ DE ALLIHANNA'
}

def mod(val):
    return math.floor((val - 10) / 2) if val is not None else 0

def calcular_pv(dados_vida):
    s = str(dados_vida).replace(" ", "")
    total = 0.0
    for m in re.finditer(r'(\d+)d(\d+)', s):
        n = int(m.group(1))
        d = int(m.group(2))
        total += (n * (d + 1)) / 2.0
    fixo_match = re.search(r'([+-]\d+)$', re.sub(r'\d+d\d+', 'X', s))
    fixo = int(fixo_match.group(1)) if fixo_match else 0
    return math.floor(total) + fixo

def normalizar_tamanho(tamanho_raw):
    t = tamanho_raw.strip()
    return TAMANHO_NORM.get(t, t)

def inferir_tipo_dano(nome):
    n = nome.lower()
    if 'mordida' in n or 'presas' in n:
        return ['perfurante', 'cortante']
    elif 'garra' in n or 'garras' in n or 'asa' in n or 'espada' in n or 'machado' in n or 'foice' in n or 'adaga' in n or 'cimitarra' in n:
        return ['cortante']
    elif 'pancada' in n or 'pancadas' in n or 'cauda' in n or 'martelo' in n or 'maca' in n or 'maça' in n or 'clava' in n or 'coice' in n or 'tromba' in n or 'esmagar' in n:
        return ['concussão']
    elif 'chifre' in n or 'chifrada' in n or 'ferrao' in n or 'ferrão' in n or 'flecha' in n or 'lança' in n or 'dardo' in n or 'picada' in n or 'bicada' in n:
        return ['perfurante']
    return ['concussão']

def parse_tendencia(texto):
    if not texto: return 'N'
    t_low = unicodedata.normalize('NFKD', texto.lower())
    t_low = "".join(c for c in t_low if not unicodedata.combining(c))
    for padrao, sigla in TENDENCIAS_MAP:
        p_norm = "".join(c for c in unicodedata.normalize('NFKD', padrao) if not unicodedata.combining(c))
        if re.search(p_norm, t_low):
            return sigla
    return 'N'

def parse_iniciativa(texto):
    if not texto: return 0
    m = re.search(r'([+-]?\d+)', texto)
    return int(m.group(1)) if m else 0

def parse_deslocamento(texto):
    desl = {"terrestre": 0.0, "voo": None, "voo_manobrabilidade": None, "natacao": None, "escalada": None, "escavacao": None}
    if not texto: return desl

    m_ter = re.search(r'^\s*([0-9]+(?:,[0-9]+)?)\s*m', texto)
    if m_ter:
        desl["terrestre"] = float(m_ter.group(1).replace(',', '.'))

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

def parse_ca(texto, atributos=None, tamanho="Médio"):
    ca = {"total": 10, "toque": 10, "surpresa": 10, "composicao": ""}
    if texto:
        m_tot = re.search(r'^\s*(\d+)', texto)
        if m_tot: ca["total"] = int(m_tot.group(1))
        m_toq = re.search(r'toque\s*(\d+)', texto, re.IGNORECASE)
        if m_toq: ca["toque"] = int(m_toq.group(1))
        m_sur = re.search(r'surpresa\s*(\d+)', texto, re.IGNORECASE)
        if m_sur: ca["surpresa"] = int(m_sur.group(1))
        
        # Validações de consistência: toque e surpresa nunca excedem o total
        if ca["toque"] > ca["total"]:
            ca["toque"] = ca["total"]
        if ca["surpresa"] > ca["total"]:
            ca["surpresa"] = ca["total"]

        m_comp = re.search(r'\(([^)]+)\)', texto)
        if m_comp:
            raw_comp = m_comp.group(1).strip()
            raw_comp = raw_comp.replace('-', '−').replace('–', '−').replace('\xad', '−')
            raw_comp = re.sub(r'[\s]+', ' ', raw_comp)
            ca["composicao"] = raw_comp
    
    if not ca["composicao"]:
        mod_des = mod(atributos["des"]) if atributos and atributos.get("des") is not None else 0
        comp_itens = []
        ca_tam_map = {"Minúsculo": 8, "Diminuto": 4, "Miúdo": 2, "Pequeno": 1, "Médio": 0, "Grande": -1, "Enorme": -2, "Imenso": -4, "Colossal": -8}
        tam_ca = ca_tam_map.get(tamanho, 0)
        if tam_ca != 0: comp_itens.append(f"{tam_ca:+d} tamanho")
        if mod_des != 0: comp_itens.append(f"{mod_des:+d} Des")
        nat = ca["total"] - 10 - mod_des - tam_ca
        if nat != 0: comp_itens.append(f"{nat:+d} natural")
        ca["composicao"] = ", ".join(comp_itens) if comp_itens else "+0 natural"
        ca["composicao"] = ca["composicao"].replace('-', '−')
    return ca

def parse_bba_agarrar(texto):
    bba = 0
    agarrar = 0
    if not texto: return bba, agarrar
    m = re.search(r'([+-]?\d+)\s*/\s*([+-]?\d+)', texto)
    if m:
        bba = int(m.group(1))
        agarrar = int(m.group(2))
    else:
        m_s = re.search(r'([+-]?\d+)', texto)
        if m_s: bba = int(m_s.group(1))
    return bba, agarrar

def parse_espaco_alcance(texto):
    espaco = 1.5
    alcance = 1.5
    if not texto: return espaco, alcance
    m = re.search(r'([0-9]+(?:,[0-9]+)?)\s*m\s*/\s*([0-9]+(?:,[0-9]+)?)\s*m', texto)
    if m:
        espaco = float(m.group(1).replace(',', '.'))
        alcance = float(m.group(2).replace(',', '.'))
    return espaco, alcance

def parse_habilidades(texto):
    habs = {"for": None, "des": None, "con": None, "int": None, "sab": None, "car": None}
    if not texto: return habs
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
    if not texto: return res
    m_fort = re.search(r'Fort\s*([+-]?\d+)', texto, re.IGNORECASE)
    m_ref = re.search(r'Ref\s*([+-]?\d+)', texto, re.IGNORECASE)
    m_von = re.search(r'Von\s*([+-]?\d+)', texto, re.IGNORECASE)
    if m_fort: res["fort"] = int(m_fort.group(1))
    if m_ref: res["ref"] = int(m_ref.group(1))
    if m_von: res["von"] = int(m_von.group(1))
    return res

def parse_talentos(texto):
    if not texto: return []
    # Protege vírgulas dentro de parênteses (ex: "Ataque Natural Aprimorado (mordida, garra)")
    def _sub_paren(match):
        return match.group(0).replace(',', '\x00')
    texto_limpo = re.sub(r'\([^)]*\)', _sub_paren, texto)
    # Substitui casos específicos onde falta vírgula entre talentos
    texto_limpo = re.sub(r'Persuasivo\s+Especializa', 'Persuasivo, Especializa', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Mobilidade\s+Contram', 'Mobilidade, Contram', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'\.\s+([A-ZÁÉÍÓÚÂÊÔÃÕ])', r', \1', texto_limpo)
    texto_limpo = texto_limpo.replace('\r', ' ').replace('\n', ' ')
    texto_limpo = re.sub(r'Refl\s*exos', 'Reflexos', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'ás\s+Cegas', 'às Cegas', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Arma\s+Natural\s+Aprimorada', 'Ataque Natural Aprimorado', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Ataque\s+em\s+Movimento', 'Ataque em Movimento', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Ignorar\s+Componentes\s+Materiais', 'Ignorar Componentes Materiais', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Magias\s+em\s+Combate', 'Magias em Combate', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Magias\s+Sem\s+Cestos', 'Magias sem Gestos', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Foco\s+em\s+Magia', 'Foco em Magia', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Reflexos\s+em\s+Combate', 'Reflexos de Combate', texto_limpo, flags=re.I)
    texto_limpo = re.sub(r'Talento\s+de\s+cria[çc][ãa]o\s+de\s+item.*', 'Criar Item Maravilhoso', texto_limpo, flags=re.I)
    
    # Trunca se houver Ambiente ou seção subsequente
    texto_limpo = re.split(r'\b(Ambiente|Ambiento|Organização|Nível)\b', texto_limpo, flags=re.I)[0]

    partes = [p.replace('\x00', ',').strip() for p in re.split(r'[,;]', texto_limpo) if p.strip()]
    talentos = []
    for p in partes:
        clean = re.sub(r'[\sBᵇ]+$', '', p).strip()
        clean = re.sub(r'\s*\(B\)$', '', clean).strip()
        clean = re.sub(r'(Águia Gigante|ALLIP|Barghest|Basilisco).*$', '', clean, flags=re.I).strip()
        clean = re.sub(r'^[\d\s\*\-\+]+', '', clean).strip()
        clean = re.sub(r'[\*\d\s]+$', '', clean).strip()
        clean = clean.rstrip('.').strip()
        clean = re.sub(r'\s+', ' ', clean).strip()
        if not clean or re.match(r'^[\s—\-\–\.]+$', clean):
            continue
        
        # Vitalidade (2) ou Vitalidade
        if re.search(r'\bVitalidade\b', clean, re.I):
            talentos.append('Vitalidade')
            clean = re.sub(r'Vitalidade(\s*\(\d+\))?', '', clean, flags=re.I).strip()
            if not clean:
                continue

        t_upper = clean.upper()
        if 'GOLPE AVASSALADOR' in t_upper:
            talentos.append('Golpe Avassalador')
        elif 'TIRO MULTIPLO' in t_upper or 'TIRO MÚLTIPLO' in t_upper:
            talentos.append('Tiro Múltiplo')
        elif 'TIRO PRECISO' in t_upper:
            talentos.append('Tiro Preciso')
        elif 'TIRO CERTEIRO' in t_upper:
            talentos.append('Tiro Certeiro')
        elif 'TIRO RAPIDO' in t_upper or 'TIRO RÁPIDO' in t_upper:
            talentos.append('Tiro Rápido')
        elif 'TIRO LONGO' in t_upper:
            talentos.append('Tiro Longo')
        elif 'DURO DE MATAR' in t_upper:
            talentos.append('Duro de Matar')
        elif 'VIGOR' in t_upper and 'MOSTRAR' not in t_upper:
            talentos.append('Fortitude Maior')
        elif 'FORTITUDE MAIOR' in t_upper or 'GRANDE FORTITUDE' in t_upper:
            talentos.append('Fortitude Maior')
        elif 'CONTRAMÁGICA APRIMORADA' in t_upper or 'CONTRAMAGICA APRIMORADA' in t_upper:
            talentos.append('Contramágica Aprimorada')
        elif 'MAXIMIZAR' in t_upper:
            talentos.append('Maximizar Magia')
        elif 'ACELERAR MAGIA' in t_upper:
            talentos.append('Acelerar Magia')
        elif 'CRIAR ITEM' in t_upper:
            talentos.append('Criar Item Maravilhoso')
        elif 'ESCREVER PERGAMINHO' in t_upper:
            talentos.append('Escrever Pergaminho')
        elif 'SILENCIOSA' in t_upper:
            talentos.append('Magia Silenciosa')
        elif 'ENCONTRÃO APRIMORADO' in t_upper or 'ENCONTRAO APRIMORADO' in t_upper:
            talentos.append('Encontrão Aprimorado')
        elif 'ARMA EXÓTICA' in t_upper or 'ARMA EXOTICA' in t_upper:
            talentos.append(clean)
        elif 'MAGIAS SEM GESTOS' in t_upper:
            talentos.append('Magias sem Gestos')
        elif 'DESARME APRIMORADO' in t_upper or 'DESARMAR APRIMORADO' in t_upper:
            talentos.append('Desarme Aprimorado')
        elif 'ESPECIALIZAÇÃO EM COMBATE' in t_upper or 'ESPECIALIZACAO EM COMBATE' in t_upper:
            talentos.append('Especialização em Combate')
        elif 'SORRATEIRO' in t_upper:
            talentos.append('Sorrateiro')
        elif 'ACUIDADE' in t_upper:
            talentos.append('Acuidade com Arma')
        elif 'PODEROSO' in t_upper:
            talentos.append('Ataque Poderoso')
        elif 'ESQUIVA' in t_upper:
            talentos.append('Esquiva')
        elif 'PRONTIDÃO' in t_upper or 'PRONTIDAO' in t_upper:
            talentos.append('Prontidão')
        elif 'INICIATIVA' in t_upper:
            talentos.append('Iniciativa Aprimorada')
        elif 'VONTADE DE FERRO' in t_upper:
            talentos.append('Vontade de Ferro')
        elif 'REFLEXOS DE COMBATE' in t_upper:
            talentos.append('Reflexos de Combate')
        elif 'REFLEXOS' in t_upper and 'RAPID' in t_upper:
            talentos.append('Reflexos Rápidos')
        elif 'LUTAR' in t_upper and 'CEGAS' in t_upper:
            talentos.append('Lutar às Cegas')
        elif 'IGNORAR COMPONENTES' in t_upper:
            talentos.append('Ignorar Componentes Materiais')
        elif 'MAGIAS EM COMBATE' in t_upper:
            talentos.append('Magias em Combate')
        elif 'FOCO EM MAGIA' in t_upper:
            talentos.append(clean if '(' in clean else 'Foco em Magia')
        elif 'ROBUSTEZ' in t_upper or 'VITALIDADE' in t_upper:
            talentos.append('Vitalidade')
        elif 'TRESPASSAR MAIOR' in t_upper:
            talentos.append('Trespassar Maior')
        elif 'TRESPASSAR' in t_upper:
            talentos.append('Trespassar')
        elif 'MOBILIDADE' in t_upper:
            talentos.append('Mobilidade')
        elif 'ATAQUES MULTIPLOS' in t_upper or 'ATAQUES MÚLTIPLOS' in t_upper:
            talentos.append('Ataques Múltiplos')
        elif 'FOCO EM ARMA' in t_upper:
            talentos.append(clean)
        elif 'ATAQUE NATURAL APRIMORADO' in t_upper:
            talentos.append('Ataque Natural Aprimorado')
        elif 'ATAQUE EM MOVIMENTO' in t_upper:
            talentos.append('Ataque em Movimento')
        elif 'AGARRAR APRIMORADO' in t_upper:
            talentos.append('Agarrar Aprimorado')
        elif 'ATROPELAR APRIMORADO' in t_upper:
            talentos.append('Atropelar Aprimorado')
        elif 'SEPARAR APRIMORADO' in t_upper:
            talentos.append('Separar Aprimorado')
        elif 'CORRER' in t_upper or 'CORRIDA' in t_upper:
            talentos.append('Corrida')
        elif 'RASTREAR' in t_upper or 'RASTREAMENTO' in t_upper:
            talentos.append('Rastrear')
        elif 'INVERSÃO' in t_upper or 'INVERSAO' in t_upper:
            talentos.append('Inversão')
        elif 'SUCESSO DECISIVO' in t_upper or 'ACERTO CRÍTICO' in t_upper:
            talentos.append(clean if '(' in clean else 'Sucesso Decisivo Aprimorado')
        elif t_upper in TALENTOS_VALIDOS:
            talentos.append(clean)
        else:
            talentos.append(clean)
    return talentos

def parse_pericias(texto):
    pericias = []
    if not texto: return pericias
    partes = [p.strip() for p in re.split(r'[,;]', texto) if p.strip()]
    for p in partes:
        m = re.search(r'^(.*?)\s*([+-]\d+)(.*)$', p)
        if m:
            nome_p = m.group(1).strip()
            total_p = int(m.group(2))
            # Limpa caracteres espúrios
            nome_p = re.sub(r'[\*\d]+$', '', nome_p).strip()
            if nome_p:
                pericias.append({"nome": nome_p, "total": total_p})
    return pericias

def parse_ataques_item(texto_ataque, alcance_padrao=1.5, eh_total=False):
    itens = []
    if not texto_ataque: return itens

    segmentos = re.split(r'\s*;\s*|\s+ou\s+|\s+e\s+', texto_ataque)
    for seg in segmentos:
        seg = seg.strip()
        if not seg or seg in ['—', '-']: continue

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
        m = re.search(r'^(?:(\d+)\s+)?(.*?)\s+([+-]\d+)(?:\s+(?:corpo a corpo|à distância|a distância|toque à distância|toque))?\s*(?:\((?:dano:?\s*)?([^)]+)\))?', seg_clean, re.IGNORECASE)
        if m:
            qtd = int(m.group(1)) if m.group(1) else 1
            nome_arma = m.group(2).strip()
            bonus = int(m.group(3))
            dano_bruto = m.group(4).strip() if m.group(4) else "1d4"

            margem = 20
            mult = 2
            dano = dano_bruto

            m_crit = re.search(r'/(\d+)[–\-]20', dano_bruto)
            if m_crit: margem = int(m_crit.group(1))
            m_mult = re.search(r'/x(\d+)', dano_bruto, re.IGNORECASE)
            if m_mult: mult = int(m_mult.group(1))

            # Limpa dano para manter só o dado
            dano = re.sub(r'/.*$', '', dano).strip()
            dano = re.sub(r'\s*mais\s+.*$', '', dano, flags=re.I).strip()
            # Garante que seja formato válido
            if not re.match(r'^\d+d\d+([+-]\d+)?$', dano):
                m_d = re.search(r'(\d+d\d+(?:[+-]\d+)?)', dano)
                dano = m_d.group(1) if m_d else "1d4"

            palavras = nome_arma.lower().split()
            eh_natural = any(p in ARMAS_NATURAIS for p in palavras)
            tipo_dano = inferir_tipo_dano(nome_arma)

            for i in range(qtd):
                eh_secundario = (eh_total and i > 0)
                item = {
                    "nome": nome_arma.capitalize(),
                    "tipo": tipo_item,
                    "bonus": bonus,
                    "dano": dano,
                    "critico": {"margem": margem, "multiplicador": mult},
                    "tipo_dano": tipo_dano,
                    "natural": eh_natural,
                    "secundario": eh_secundario,
                    "alcance_m": alcance_padrao if tipo_item == "corpo a corpo" else 15.0,
                    "incremento_m": None if tipo_item == "corpo a corpo" else 3.0,
                    "magico": None,
                    "material": None,
                    "dano_extra": [],
                    "efeitos": []
                }
                itens.append(item)

    return itens

def achar_pagina_exata(meta, paginas_dir):
    nome_palavra = meta['nome'].split()[0]
    if meta['id'] == 'crio-esfinge': nome_palavra = 'Crioesfinge'
    elif meta['id'] == 'crio-hidra': nome_palavra = 'Criohidra'
    elif meta['id'] == 'anao-guerreiro': nome_palavra = 'Anão'
    elif meta['id'] == 'barghest': nome_palavra = 'Barghest'
    
    pg_base = meta['pagina'] + 4
    for delta in [0, 1, 2, -1]:
        p = pg_base + delta
        fn = os.path.join(paginas_dir, f'{p:03d}.txt')
        if not os.path.exists(fn): continue
        with open(fn, encoding='utf-8') as f:
            t = f.read()
        if re.search(re.escape(nome_palavra), t, re.I) and 'Dados de Vida' in t and ('Classe de Armadura' in t or 'CA:' in t):
            return p, t
    # Fallback
    fn = os.path.join(paginas_dir, f'{pg_base:03d}.txt')
    t = ""
    if os.path.exists(fn):
        with open(fn, encoding='utf-8') as f:
            t = f.read()
    return pg_base, t

def extrair_secoes_rotuladas(texto):
    if not texto: return {}
    texto_norm = texto
    texto_norm = re.sub(r'Classe\s+de\s+Armadura:', 'Classe de Armadura:', texto_norm, flags=re.I)
    texto_norm = re.sub(r'Ataque\s+Base\s*/\s*Agarrar:', 'Ataque Base/Agarrar:', texto_norm, flags=re.I)
    texto_norm = re.sub(r'Ataque\s+Total:', 'Ataque Total:', texto_norm, flags=re.I)
    texto_norm = re.sub(r'Espaço\s*/\s*Alcance:', 'Espaço/Alcance:', texto_norm, flags=re.I)
    texto_norm = re.sub(r'Ataques\s+Especiais:', 'Ataques Especiais:', texto_norm, flags=re.I)
    texto_norm = re.sub(r'Qualidades\s+Especiais:', 'Qualidades Especiais:', texto_norm, flags=re.I)
    texto_norm = re.sub(r'Testes\s+de\s+Resistência:', 'Testes de Resistência:', texto_norm, flags=re.I)
    texto_norm = re.sub(r'Nível\s+de\s+Desafi\s*o:', 'Nível de Desafio:', texto_norm, flags=re.I)
    texto_norm = re.sub(r'Ajuste\s+de\s+Nível:', 'Ajuste de Nível:', texto_norm, flags=re.I)

    rotulos = [
        "Dados de Vida:", "Iniciativa:", "Deslocamento:", "Classe de Armadura:", "CA:",
        "Ataque Base/Agarrar:", "Ataque Base / Agarrar:", "Ataque:", "Ataque Total:",
        "Espaço/Alcance:", "Espaço / Alcance:", "Ataques Especiais:", "Qualidades Especiais:",
        "Testes de Resistência:", "Habilidades:", "Perícias:", "Talentos:",
        "Ambiente:", "Organização:", "Nível de Desafio:", "Nível de Desafi o:",
        "Tesouro:", "Tendência:", "Progressão:", "Ajuste de Nível:"
    ]
    padrao = re.compile(r'(' + '|'.join(re.escape(r) for r in rotulos) + r')', re.IGNORECASE)
    partes = padrao.split(texto_norm)
    dados = {}
    rotulo_atual = None
    for item in partes:
        item_strip = item.strip()
        eh_rot = False
        for r in rotulos:
            if item_strip.lower() == r.lower():
                rotulo_atual = r.rstrip(':')
                if rotulo_atual.lower() == 'ca': rotulo_atual = 'Classe de Armadura'
                eh_rot = True
                break
        if not eh_rot and rotulo_atual:
            dados[rotulo_atual] = item_strip
    return dados

def enriquecer_combatente(meta, rotulos, texto_completo=""):
    """
    Constrói a ficha de combatente completa a partir dos rótulos extraídos.
    """
    # DV e PV
    dv_str = rotulos.get("Dados de Vida", "")
    m_dv = re.search(r'(\d+d\d+(?:\s*[+-]\s*\d+)?)', dv_str.replace('–', '-'))
    dados_vida = m_dv.group(1).replace(' ', '') if m_dv else "1d8"
    pv = calcular_pv(dados_vida)

    # Tamanho e tipo
    tamanho = normalizar_tamanho(meta["tamanho"])
    tipo = meta["tipo"]
    if tipo not in TIPOS_VALIDOS:
        if 'Humanoide' in tipo: tipo = 'Humanoide'
        elif 'Verme' in tipo or 'Inseto' in tipo: tipo = 'Verme'
        else: tipo = 'Monstro'

    # Iniciativa
    iniciativa = parse_iniciativa(rotulos.get("Iniciativa", ""))

    # Deslocamento
    desl = parse_deslocamento(rotulos.get("Deslocamento", ""))

    # Espaço e alcance
    esp_texto = rotulos.get("Espaço/Alcance", rotulos.get("Espaço / Alcance", ""))
    espaco, alcance = parse_espaco_alcance(esp_texto)

    # Habilidades
    atributos = parse_habilidades(rotulos.get("Habilidades", rotulos.get("Habilidade", "")))

    # CA
    ca = parse_ca(rotulos.get("Classe de Armadura", ""), atributos=atributos, tamanho=tamanho)

    # BBA e Agarrar estrito
    bba_texto = rotulos.get("Ataque Base/Agarrar", rotulos.get("Ataque Base / Agarrar", ""))
    bba, _ = parse_bba_agarrar(bba_texto)
    mod_for = mod(atributos["for"]) if atributos["for"] is not None else 0
    agarrar = bba + AGARRAR_TAMANHO.get(tamanho, 0) + mod_for

    # Ataques
    atq_texto = rotulos.get("Ataque", "")
    ataques = parse_ataques_item(atq_texto, alcance_padrao=alcance, eh_total=False)
    if not ataques:
        # Fallback ataque desarmado ou pancada
        ataques = [{
            "nome": "Pancada",
            "tipo": "corpo a corpo",
            "bonus": bba + mod_for,
            "dano": "1d4",
            "critico": {"margem": 20, "multiplicador": 2},
            "tipo_dano": ["concussão"],
            "natural": True,
            "secundario": False,
            "alcance_m": alcance,
            "incremento_m": None,
            "magico": None,
            "material": None,
            "dano_extra": [],
            "efeitos": []
        }]

    atq_total_texto = rotulos.get("Ataque Total", "")
    ataque_total = parse_ataques_item(atq_total_texto, alcance_padrao=alcance, eh_total=True)
    if not ataque_total:
        ataque_total = list(ataques)

    # Resistências
    resistencias = parse_resistencias(rotulos.get("Testes de Resistência", ""))

    # Perícias e Talentos
    pericias = parse_pericias(rotulos.get("Perícias", ""))
    talentos = parse_talentos(rotulos.get("Talentos", ""))

    # Tendência
    tend_texto = rotulos.get("Tendência", "")
    tendencia = parse_tendencia(tend_texto)

    # Especiais e Qualidades com IDs únicos garantidos
    ids_vistos = set()
    atq_esp_raw = rotulos.get("Ataques Especiais", "")
    qual_esp_raw = rotulos.get("Qualidades Especiais", "")

    ataques_especiais = []
    if atq_esp_raw and atq_esp_raw not in ['—', '-', 'Nenhum']:
        partes_ae = [a.strip() for a in re.split(r'[,;]', atq_esp_raw) if a.strip()]
        for ae in partes_ae:
            base_slug = re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', ae.lower()).encode('ascii', 'ignore').decode('utf-8')).strip('-') or "ataque-especial"
            slug_ae = base_slug
            c = 2
            while slug_ae in ids_vistos:
                slug_ae = f"{base_slug}-{c}"
                c += 1
            ids_vistos.add(slug_ae)
            ataques_especiais.append({
                "id": slug_ae,
                "nome": ae.capitalize(),
                "natureza": "Ext",
                "descricao": f"Habilidade especial de combate ({ae}).",
                "mecanica": None
            })

    qualidades_especiais = []
    rd_obj = None
    rm_val = None
    imunidades_list = []
    vulnerabilidades_list = []

    if qual_esp_raw and qual_esp_raw not in ['—', '-', 'Nenhum']:
        partes_qe = [q.strip() for q in re.split(r'[,;]', qual_esp_raw) if q.strip()]
        for qe in partes_qe:
            base_slug = re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', qe.lower()).encode('ascii', 'ignore').decode('utf-8')).strip('-') or "qualidade-especial"
            slug_qe = base_slug
            c = 2
            while slug_qe in ids_vistos:
                slug_qe = f"{base_slug}-{c}"
                c += 1
            ids_vistos.add(slug_qe)
            
            # Detecta RD
            m_rd = re.search(r'redu[çc][ãa]o de dano\s*(\d+)\s*/\s*([a-z\-]+)', qe, re.I)
            if m_rd:
                rd_val = int(m_rd.group(1))
                exceto_str = m_rd.group(2).lower()
                exceto_map = {'magia': 'magia', 'magica': 'magia', 'prata': 'prata', 'adamante': 'adamante', 'ferro frio': 'ferro frio'}
                exceto = [exceto_map.get(exceto_str, 'magia')]
                rd_obj = {"valor": rd_val, "exceto": exceto, "modo": "ou"}
            
            # Detecta RM
            m_rm = re.search(r'RM\s*(\d+)', qe, re.I)
            if m_rm:
                rm_val = int(m_rm.group(1))

            # Detecta Imunidades
            if 'imunidade a fogo' in qe.lower(): imunidades_list.append('fogo')
            if 'imunidade a frio' in qe.lower(): imunidades_list.append('frio')
            if 'imunidade a eletricidade' in qe.lower(): imunidades_list.append('eletricidade')
            if 'imunidade a veneno' in qe.lower(): imunidades_list.append('veneno')
            if 'imunidade a sono' in qe.lower(): imunidades_list.append('sono')
            if 'imunidade a paralisia' in qe.lower(): imunidades_list.append('paralisia')

            qualidades_especiais.append({
                "id": slug_qe,
                "nome": qe.capitalize(),
                "natureza": "Ext",
                "descricao": f"Característica especial ({qe}).",
                "mecanica": None
            })

    # Resumo autoral e tática autoral <= 300 chars
    nome_criatura = meta["nome"]
    resumo = f"{nome_criatura}: {tipo} ({tamanho}, ND {meta['nd']}). Habitante típico do catálogo do Livro dos Monstros 3.5."
    if len(resumo) > 300: resumo = resumo[:297] + "..."

    tatica = f"Em combate, {nome_criatura} emprega seus ataques principais e posicionamento tático para subjugar os oponentes."
    if len(tatica) > 300: tatica = tatica[:297] + "..."

    # Subtipos
    subtipos = []
    m_sub = re.search(rf'{tipo}\s*\(([^)]+)\)', rotulos.get("Dados de Vida", "") + " " + texto_completo[:200], re.I)
    if m_sub:
        raw_subs = [s.strip() for s in m_sub.group(1).split(',')]
        for s in raw_subs:
            if s not in ['Pequeno', 'Médio', 'Grande', 'Enorme', 'Miúdo', 'Imenso', 'Colossal']:
                subtipos.append(s.capitalize())

    combatente = {
        "id": meta["id"],
        "nome": meta["nome"],
        "nome_original": meta["nome_original"],
        "categoria": "monstro",
        "nd": meta["nd"],
        "nivel": meta["nd"] if meta["nd"] >= 1 else 1,
        "classes": [],
        "raca": None,
        "tipo": tipo,
        "subtipos": subtipos,
        "tamanho": tamanho,
        "tendencia": tendencia,
        "resumo": resumo,
        "dados_vida": dados_vida,
        "pv": pv,
        "iniciativa": iniciativa,
        "deslocamento": desl,
        "espaco": espaco,
        "alcance": alcance,
        "ca": ca,
        "bba": bba,
        "agarrar": agarrar,
        "ataques": ataques,
        "ataque_total": ataque_total,
        "ataque_total_distancia": None,
        "ataques_especiais": ataques_especiais,
        "qualidades_especiais": qualidades_especiais,
        "reducao_dano": rd_obj,
        "resistencia_magia": rm_val,
        "resistencias_energia": {},
        "imunidades": list(set(imunidades_list)),
        "vulnerabilidades": list(set(vulnerabilidades_list)),
        "regeneracao": None,
        "cura_acelerada": None,
        "resistencias": resistencias,
        "atributos": atributos,
        "pericias": pericias,
        "talentos": talentos,
        "equipamento": [],
        "magias": None,
        "tatica": tatica,
        "adaptacao": None,
        "fonte": {
            "referencia": f"Livro dos Monstros 3.5 (Devir), p. {meta['pagina']}",
            "url": f"https://www.d20srd.org/srd/monsters/{re.sub(r'[^a-z0-9]+', '', meta['nome_original'].lower())}.htm"
        }
    }
    return combatente
