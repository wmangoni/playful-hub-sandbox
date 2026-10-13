"""Gera as texturas repetíveis de pergaminho do ded em ded/ui/texturas/. Uso: python -I ded/tools/gerar-texturas.py ded/ui/texturas"""
import sys, numpy as np
from PIL import Image

out = sys.argv[1]
N = 512
rng = np.random.default_rng(7)
f = np.fft.fftfreq(N)
FX, FY = np.meshgrid(f, f)

def ruido(beta, ax=1.0, ay=1.0, corte=None):
    F = np.fft.fft2(rng.normal(size=(N, N)))
    k = np.sqrt((FX * ax) ** 2 + (FY * ay) ** 2)
    k[0, 0] = 1
    A = 1 / k ** beta
    if corte:
        A *= np.exp(-(k / corte) ** 2)
    A[0, 0] = 0
    img = np.real(np.fft.ifft2(F * A))
    return (img - img.mean()) / img.std()

def borrar(img, sigma):
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (FX ** 2 + FY ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(img) * g))

manchas = ruido(2.2)                 # manchas grandes
grao = ruido(1.1)                    # grão médio
fibras = ruido(1.6, ax=0.25, ay=3.0) # fibras horizontais
pontos = (rng.random((N, N)) > 0.9985).astype(float)
pontos = borrar(pontos, 0.9)
pontos /= pontos.max()

def compor(base, escuro, ganho):
    m = np.clip(manchas, -3, 3)
    t = np.clip(0.5 - 0.18 * m, 0, 1)[..., None]        # mistura para o tom queimado
    cor = base * (1 - t * 0.55) + escuro * (t * 0.55)
    lum = 1 + ganho * (0.045 * m + 0.03 * grao + 0.022 * fibras) - 0.28 * pontos
    return np.clip(cor * lum[..., None], 0, 255).astype(np.uint8)

claro = compor(np.array([236, 223, 194.0]), np.array([192, 146, 88.0]), 1.0)
Image.fromarray(claro).save(f"{out}/pergaminho.webp", quality=84, method=6)
escuro = compor(np.array([214, 194, 152.0]), np.array([150, 108, 62.0]), 1.15)
Image.fromarray(escuro).save(f"{out}/pergaminho-escuro.webp", quality=84, method=6)
print("ok")
