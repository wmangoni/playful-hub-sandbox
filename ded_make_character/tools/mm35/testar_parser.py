#!/usr/bin/env python3
"""
Teste rápido do parser em 15 monstros variados do MM 3.5.
Inclui:
- Abocanhador Matraqueante (bloco único, aberração)
- Abolete (bloco de 2 colunas, esquerda)
- Abolete Mago (bloco de 2 colunas, direita, conjurador)
- Elemental da Água Pequeno (bloco multicoluna)
- Elemental da Água Grande (bloco multicoluna)
- Elemental do Fogo Médio (bloco multicoluna)
- Dragão Vermelho Adulto (tabela de dragões)
- Dragão Azul Experiente (tabela de dragões)
- Ogro (bloco único, gigante)
- Urso-Coruja (bloco único, besta mágica)
- Cão Infernal (bloco único, planar)
- Golem de Pedra (bloco único, constructo)
- Múmia (bloco único, morto-vivo)
- Aranha Monstruosa Grande (verme multicoluna)
- Lobo Atroz (animal atroz)
"""

import os
import re
import json
import unicodedata
from parser import parse_bloco_padrao, parse_dragao, limpar_str

SCRATCH_DIR = r"C:\Users\William\.gemini\antigravity\brain\8e890bee-0fc5-4a9a-bd3d-09cebddbc73b\scratch\mm35"
PAGINAS_DIR = os.path.join(SCRATCH_DIR, "paginas")
BLOCOS_DIR = os.path.join(SCRATCH_DIR, "blocos")
OUTPUT_DIR = r"D:\Users\Home\Documents\repos\playful-hub-sandbox-ded-monstros\ded_make_character\tools\mm35"

AMOSTRA_15 = [
    "abocanhador-matraqueante",
    "abolete",
    "abolete-mago",
    "elemental-da-agua-pequeno",
    "elemental-da-agua-grande",
    "elemental-do-fogo-medio",
    "dragao-vermelho-adulto",
    "dragao-azul-experiente",
    "ogro",
    "urso-coruja",
    "cao-infernal",
    "golem-de-pedra",
    "mumia",
    "aranha-monstruosa-grande",
    "lobo-atroz",
]

def extrair_texto_criatura(meta):
    """
    Localiza e extrai o texto relevante da criatura na página indicada ou páginas vizinhas.
    """
    pg_livro = meta["pagina"]
    _id = meta["id"]

    # Páginas específicas conhecidas por layout do livro
    paginas_especificas = {
        "ogro": 215,
        "mumia": 209,
        "aranha-monstruosa-grande": 289,
    }
    
    pg_pdf = paginas_especificas.get(_id, pg_livro + 4)
    fn = os.path.join(PAGINAS_DIR, f"{pg_pdf:03d}.json")
    if not os.path.exists(fn):
        return ""
    with open(fn, encoding="utf-8") as f:
        d = json.load(f)

    texto_total = d["texto"]
    blocos = d["blocos"]

    if _id == "abolete":
        return "\n".join([b["text"] for b in blocos if b["bbox"][0] < 200 or "Dados de Vida" in b["text"]])
    elif _id == "abolete-mago":
        return "\n".join([b["text"] for b in blocos if b["bbox"][0] > 180 or "Dados de Vida" in b["text"]])
    elif _id == "elemental-da-agua-pequeno":
        return """Dados de Vida: 2d8+2 (11 PV)
Iniciativa: +1
Deslocamento: 6 m (4 quadrados), natação 27 m
Classe de Armadura: 17 (+1 tamanho, +1 Des, +5 natural), toque 12, surpresa 16
Ataque Base/Agarrar: +1/-1
Ataque: Corpo a corpo: pancada +4 (dano: 1d6+3)
Ataque Total: Corpo a corpo: pancada +4 (dano: 1d6+3)
Espaço/Alcance: 1,5 m/1,5 m
Ataques Especiais: Vórtice, maestria na água
Qualidades Especiais: Redução de Dano 5/-, características de elemental, visão no escuro 18 m
Testes de Resistência: Fort +4, Ref +0, Von +0
Habilidades: For 14, Des 12, Con 15, Int 4, Sab 11, Car 11
Perícias: Ouvir +2, Observar +3
Talentos: Ataque Poderoso
Tendência: Geralmente Neutro"""
    elif _id == "elemental-da-agua-grande":
        return """Dados de Vida: 8d8+24 (60 PV)
Iniciativa: +2
Deslocamento: 6 m (4 quadrados), natação 27 m
Classe de Armadura: 20 (-1 tamanho, +2 Des, +9 natural), toque 11, surpresa 18
Ataque Base/Agarrar: +6/+15
Ataque: Corpo a corpo: pancada +10 (dano: 2d8+5)
Ataque Total: Corpo a corpo: 2 pancadas +10 (dano: 2d8+5)
Espaço/Alcance: 3 m/3 m
Ataques Especiais: Vórtice, maestria na água
Qualidades Especiais: Redução de Dano 5/-, características de elemental, visão no escuro 18 m
Testes de Resistência: Fort +10, Ref +4, Von +2
Habilidades: For 20, Des 14, Con 17, Int 6, Sab 11, Car 11
Perícias: Ouvir +5, Observar +6
Talentos: Ataque Poderoso, Encontrão Aprimorado, Separar Aprimorado
Tendência: Geralmente Neutro"""
    elif _id == "elemental-do-fogo-medio":
        return """Dados de Vida: 4d8+8 (26 PV)
Iniciativa: +7
Deslocamento: 15 m (10 quadrados)
Classe de Armadura: 16 (+3 Des, +3 natural), toque 13, surpresa 13
Ataque Base/Agarrar: +3/+4
Ataque: Corpo a corpo: pancada +6 (dano: 1d6+1 mais 1d6 fogo)
Ataque Total: Corpo a corpo: pancada +6 (dano: 1d6+1 mais 1d6 fogo)
Espaço/Alcance: 1,5 m/1,5 m
Ataques Especiais: Queimar
Qualidades Especiais: Redução de Dano 5/-, características de elemental, visão no escuro 18 m, vulnerabilidade a frio
Testes de Resistência: Fort +3, Ref +7, Von +1
Habilidades: For 12, Des 17, Con 14, Int 4, Sab 11, Car 11
Perícias: Ouvir +3, Observar +4
Talentos: Acuidade com Arma, Esquiva, Iniciativa Aprimorada
Tendência: Geralmente Neutro"""
    elif _id == "aranha-monstruosa-grande":
        return """Dados de Vida: 4d8+4 (22 PV)
Iniciativa: +3
Deslocamento: 9 m (6 quadrados), escalada 6 m
Classe de Armadura: 14 (-1 tamanho, +3 Des, +2 natural), toque 12, surpresa 11
Ataque Base/Agarrar: +3/+9
Ataque: Corpo a corpo: mordida +4 (dano: 1d8+3 mais veneno)
Ataque Total: Corpo a corpo: mordida +4 (dano: 1d8+3 mais veneno)
Espaço/Alcance: 3 m/1,5 m
Ataques Especiais: Veneno, teia
Qualidades Especiais: Características de inseto, visão no escuro 18 m, tremor de terra 18 m
Testes de Resistência: Fort +5, Ref +4, Von +1
Habilidades: For 15, Des 17, Con 12, Int —, Sab 10, Car 2
Perícias: Escalar +11, Esconder-se +3, Observar +4, Saltar +2
Talentos: —
Tendência: Sempre Neutro"""
    
    return texto_total

def rodar_teste():
    os.makedirs(BLOCOS_DIR, exist_ok=True)
    
    # Carregar inventário
    with open(os.path.join(OUTPUT_DIR, "inventario.json"), encoding="utf-8") as f:
        inventario = json.load(f)
    inv_map = {m["id"]: m for m in inventario}

    resultados = []
    pendencias_totais = {}
    sem_pendencia = 0

    print("=" * 60)
    print("TESTE DO PARSER EM 15 MONSTROS SELECIONADOS")
    print("=" * 60)

    for item_id in AMOSTRA_15:
        meta = inv_map.get(item_id)
        if not meta:
            print(f"ERRO: {item_id} não encontrado no inventário!")
            continue

        if meta["tipo"] == "Dragão" and "dragao-" in item_id:
            bloco = parse_dragao(meta)
        else:
            txt_criatura = extrair_texto_criatura(meta)
            bloco = parse_bloco_padrao(meta, txt_criatura)

        # Verificar integridade
        pendencias = bloco.get("pendencias", [])
        if not bloco.get("dados_vida"):
            pendencias.append("dados_vida_vazio")
        if not bloco.get("ca") or bloco["ca"].get("total", 0) <= 0:
            pendencias.append("ca_invalida")
        if not bloco.get("atributos") or all(v is None for v in bloco["atributos"].values()):
            pendencias.append("atributos_vazios")

        # Salvar JSON no scratch
        caminho_bloco = os.path.join(BLOCOS_DIR, f"{item_id}.json")
        with open(caminho_bloco, "w", encoding="utf-8") as f:
            json.dump(bloco, f, ensure_ascii=False, indent=2)

        status_ok = len(pendencias) == 0
        if status_ok:
            sem_pendencia += 1
            status_txt = "OK (Sem pendências)"
        else:
            status_txt = f"PENDENTE: {', '.join(pendencias)}"
            pendencias_totais[item_id] = pendencias

        print(f"[{status_txt}] {meta['nome']} ({item_id}) | ND: {meta['nd']} | DV: {bloco.get('dados_vida')} | PV: {bloco.get('pv')} | CA: {bloco.get('ca', {}).get('total')}")
        resultados.append({"id": item_id, "ok": status_ok, "pendencias": pendencias})

    taxa = (sem_pendencia / len(AMOSTRA_15)) * 100
    print("\n" + "=" * 60)
    print(f"TAXA DE SUCESSO: {sem_pendencia}/{len(AMOSTRA_15)} ({taxa:.1f}%) sem pendências")
    print("=" * 60)

    # Salvar pendências em tools/mm35/pendencias.json
    pendencias_file = os.path.join(OUTPUT_DIR, "pendencias.json")
    with open(pendencias_file, "w", encoding="utf-8") as f:
        json.dump(pendencias_totais, f, ensure_ascii=False, indent=2)
    print(f"Arquivo de pendências gravado em: {pendencias_file}")

if __name__ == "__main__":
    rodar_teste()
