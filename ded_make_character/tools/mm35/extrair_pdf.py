#!/usr/bin/env python3
"""
E0: Extração do Livro dos Monstros 3.5 página a página.
Salva blocos com coordenadas em JSON e texto legível em TXT no diretório de scratch.
Mede a cobertura de texto do documento.
"""

import os
import sys
import json
import pymupdf

PDF_PATH = r"D:\Users\Home\Documents\William\RPG\BibliotecaElfica\D&D 3E\D&D 3E - Livro Dos Monstros 3.5 (v. Digital) - Biblioteca Élfica.pdf"
SCRATCH_DIR = r"C:\Users\William\.gemini\antigravity\brain\8e890bee-0fc5-4a9a-bd3d-09cebddbc73b\scratch\mm35"
PAGES_DIR = os.path.join(SCRATCH_DIR, "paginas")

def extrair_todas_paginas():
    os.makedirs(PAGES_DIR, exist_ok=True)
    doc = pymupdf.open(PDF_PATH)
    total_pages = len(doc)
    print(f"Abrindo PDF: {PDF_PATH}")
    print(f"Total de páginas: {total_pages}")

    relatorio = {
        "total_paginas": total_pages,
        "paginas_com_texto": 0,
        "paginas_sem_texto": [],
        "total_caracteres": 0,
        "paginas_info": []
    }

    for idx, page in enumerate(doc):
        pag_num = idx + 1
        text = page.get_text("text")
        raw_blocks = page.get_text("blocks")
        
        blocks_data = []
        for b in raw_blocks:
            blocks_data.append({
                "bbox": [round(coord, 2) for coord in b[:4]],
                "text": b[4],
                "block_no": b[5],
                "block_type": b[6] if len(b) > 6 else 0
            })

        char_count = len(text.strip())
        if char_count > 0:
            relatorio["paginas_com_texto"] += 1
        else:
            relatorio["paginas_sem_texto"].append(pag_num)

        relatorio["total_caracteres"] += char_count
        relatorio["paginas_info"].append({
            "pagina": pag_num,
            "caracteres": char_count,
            "blocos": len(blocks_data),
            "largura": round(page.rect.width, 2),
            "altura": round(page.rect.height, 2)
        })

        # Salvar JSON da página
        json_path = os.path.join(PAGES_DIR, f"{pag_num:03d}.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({
                "pagina": pag_num,
                "largura": page.rect.width,
                "altura": page.rect.height,
                "caracteres": char_count,
                "texto": text,
                "blocos": blocks_data
            }, f, ensure_ascii=False, indent=2)

        # Salvar TXT legível
        txt_path = os.path.join(PAGES_DIR, f"{pag_num:03d}.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)

        if pag_num % 50 == 0 or pag_num == total_pages:
            print(f"Processadas {pag_num}/{total_pages} páginas...")

    # Salvar resumo de extração no scratch
    resumo_path = os.path.join(SCRATCH_DIR, "cobertura_extracao.json")
    with open(resumo_path, "w", encoding="utf-8") as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)

    pct_cobertura = (relatorio["paginas_com_texto"] / total_pages) * 100
    print("\n=== RESUMO DA EXTRAÇÃO ===")
    print(f"Total de páginas: {total_pages}")
    print(f"Páginas com texto: {relatorio['paginas_com_texto']} ({pct_cobertura:.2f}%)")
    print(f"Páginas sem texto: {relatorio['paginas_sem_texto']}")
    print(f"Total de caracteres extraídos: {relatorio['total_caracteres']}")
    print(f"Média de caracteres/página com texto: {relatorio['total_caracteres'] / max(1, relatorio['paginas_com_texto']):.0f}")
    return relatorio

if __name__ == "__main__":
    extrair_todas_paginas()
