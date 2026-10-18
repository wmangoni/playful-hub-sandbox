"""Converte as artes do vitral (ded/images) para WebP com perda e aponta o vitrais.json para elas.

Uso (da raiz do repositório): python -I ded/tools/converter-artes.py [raiz]

Converte só as entradas do ded/assets/vitrais.json cujo "arquivo" ainda não é WebP (uma arte nova
em PNG ou JPEG): grava o .webp ao lado, troca o "arquivo" no JSON e mantém o original, para você
conferir a arte no vitral e apagá-lo depois (git rm). Um WebP nunca é reconvertido.

A configuração foi escolhida por medição na Fase 5 (TASK_001 §12):
  - WebP com perda, qualidade 80, method 6 (Pillow/libwebp). Lossless não encolhe essas artes, e
    a 75 o pontilhado das paredes escuras some no celular;
  - lado maior acima de 1280 px reduzido a 1024 (Lanczos): o vitral mostra ~894 px a 1920x1080 e
    ~1008x1344 px de tela num celular de DPR 3;
  - duas entradas com o mesmo arquivo de origem (o mesmo conteúdo) viram um WebP só.
"""
import hashlib
import io
import json
import os
import re
import sys

from PIL import Image

QUALIDADE = 80
METODO = 6
LIMITE = 1280
REDUZIR_PARA = 1024


def main(raiz):
    pasta = os.path.join(raiz, 'ded', 'images')
    caminho_json = os.path.join(raiz, 'ded', 'assets', 'vitrais.json')
    vitrais = json.load(open(caminho_json, encoding='utf-8'))
    novos = sorted({v['arquivo'] for v in vitrais.values() if not v['arquivo'].lower().endswith('.webp')})
    if not novos:
        print('Nada a converter: todas as artes do vitrais.json já são WebP.')
        return
    novo_nome = {}
    por_conteudo = {}
    for nome in novos:
        caminho = os.path.join(pasta, nome)
        dados = open(caminho, 'rb').read()
        chave = hashlib.sha256(dados).hexdigest()
        if chave in por_conteudo:
            novo_nome[nome] = por_conteudo[chave]
            print(f'{nome:36s} -> {por_conteudo[chave]} (o mesmo conteúdo de outra arte)')
            continue
        im = Image.open(caminho).convert('RGB')
        if max(im.size) > LIMITE:
            f = REDUZIR_PARA / max(im.size)
            im = im.resize((round(im.size[0] * f), round(im.size[1] * f)), Image.LANCZOS)
        webp = os.path.splitext(nome)[0] + '.webp'
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALIDADE, method=METODO)
        open(os.path.join(pasta, webp), 'wb').write(buf.getvalue())
        por_conteudo[chave] = webp
        novo_nome[nome] = webp
        print(f'{nome:36s} -> {webp:36s} {len(dados) / 1024:7.1f} KB -> {len(buf.getvalue()) / 1024:6.1f} KB ({im.size[0]}x{im.size[1]})')
    # troca só o valor de "arquivo", sem mexer no resto do JSON (nem nas quebras de linha)
    texto = open(caminho_json, 'rb').read().decode('utf-8')
    texto = re.sub(r'("arquivo":\s*")([^"]+)(")', lambda m: m.group(1) + novo_nome.get(m.group(2), m.group(2)) + m.group(3), texto)
    open(caminho_json, 'wb').write(texto.encode('utf-8'))
    print(f'\n{len(novos)} arte(s) convertida(s). Confira no vitral (capturas.mjs) e apague os originais: '
          + ' '.join(f'ded/images/{n}' for n in novos))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
