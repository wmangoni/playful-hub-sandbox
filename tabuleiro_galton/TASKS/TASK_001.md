# 🎨 Tarefa 001 - Melhoria Visual: Tabuleiro Galton

**Status**: [ ] Pendente

---

## 🔍 Análise do Product Owner (PO)

O **Tabuleiro de Galton** (Galton Board / Máquina de Quincunx) é uma joia de simulação físico-estatística interativa que demonstra visualmente o Teorema Central do Limite e a Curva de Distribuição Normal (Gaussiana) através da queda mecânica de pequenas esferas por uma matriz de pinos. A renderização do canvas 2D já possui um excelente pontapé inicial com estética Dark Neon (esferas azuis `#00ccff` brilhantes e histograma rosa-choque `#ff3366` radiante).

Contudo, a interface HTML circundante que engloba a área de controles e parâmetros técnicos destoa drasticamente deste visual cibernético de alta tecnologia. O layout possui botões retangulares cinzas simples e fontes básicas sem sofisticação, parecendo uma ferramenta escolar simplificada. O nosso objetivo estético é transformar o Tabuleiro de Galton em um sofisticado **"Cyber-Physics Laboratory Console"** — uma interface futurista de monitoramento de dados matemáticos que parecerá um terminal científico de alta fidelidade saído de um filme de ficção científica espacial.

## 💡 Sugestões de Melhorias Visuais

1.  **Console de Laboratório Glassmorphic e Moldura do Canvas**: Estilizar toda a interface e o painel de controle `#controls` com **Glassmorphism** de ficção científica: fundo preto profundo translúcido (`rgba(13, 17, 28, 0.8)`), bordas arredondadas e suavizadas com `backdrop-filter: blur(12px)`. O próprio Canvas 2D receberá cantos levemente arredondados (`border-radius: 12px`), uma borda holográfica fina em gradiente e uma sombra volumétrica neon externa azulada (`box-shadow: 0 0 25px rgba(0, 204, 255, 0.15)`).
2.  **Tipografia Instrumental Científica (Orbitron & Inter)**: Importar fontes do Google Fonts altamente alinhadas com a temática científica. Usaremos **'Orbitron'** para o título principal da simulação, contadores numéricos (como o display de esferas totais `#totalBalls`) e termos de dados. Para as etiquetas de controles e botões, usaremos a fonte **'Inter'**, trazendo excelente legibilidade, espaçamento refinado e aspecto limpo de SaaS moderno.
3.  **Controles Reativos de Alta Tecnologia e Indicadores Dinâmicos**: Redesenhar completamente os botões "Adicionar 1", "Adicionar 10" e "Resetar". Eles receberão preenchimentos translúcidos escuros, bordas que reagem com gradientes acesos entre azul-cyber e rosa-neon no hover, e micro-animações de escala compressiva (`transform: scale(0.97)`) ao clicar. O seletor de layout (`#layoutSelector`) e o controle deslizante de velocidade (`#speedSlider`) receberão uma nova roupagem com trilhos iluminados por gradientes neon dinâmicos.

---

## 🛠️ Requisitos Técnicos Sugeridos

- [ ] Importar as fontes premium do Google Fonts (`'Orbitron'`, `'Inter'`) no cabeçalho do HTML.
- [ ] Aplicar fundo em gradiente linear moderno no `body` usando tons cósmicos (`linear-gradient(135deg, #07090e 0%, #0f131d 100%)`).
- [ ] Refatorar a folha de estilo `#controls` para criar um painel flutuante de vidro acrílico (Glassmorphic) com sombras e bordas semi-transparentes requintadas.
- [ ] Estilizar os botões com efeitos de transição ultra-suaves (`transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`) e efeitos hover que emitem glows neon azul-cian (`rgba(0, 204, 255, 0.5)`) ou rosa (`rgba(255, 51, 102, 0.5)`).
- [ ] Personalizar o componente `input[type="range"]` (`#speedSlider`) e a seta do `select` com estilos customizados modernos usando pseudoelementos e sombras dinâmicas.
- [ ] Implementar um cabeçalho superior estatístico moderno, mostrando em tempo real as coordenadas físicas estimadas ou a média dos coletores em um mini display de cristal líquido digital estilizado em CSS.
