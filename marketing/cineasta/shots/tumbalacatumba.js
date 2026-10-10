// Tomadas cinematográficas do Tumbalacatumba para o Cineasta (formato vertical 9:16, 30 fps).
//
// Câmera: cada chave tem `t` (s), `pos` e `look` como [x, z, altura acima do chão] em metros.
// `hour` anima a hora do jogo ao longo da tomada ([início, fim]); o jogo é conduzido quadro a quadro
// (tick determinístico), então o resultado não depende da velocidade da máquina.
// Coordenadas de lugares: tumbalacatumba/src/world/layout.js (+X leste, -Z norte).
//
// Legendas: texto curto e honesto, no máximo 2 linhas. `cta` aparece em todas as tomadas.

const { cemToWorld } = cemetery();

/** layout.js é um módulo ES do jogo; aqui só precisamos da conversão local→mundo do cemitério. */
function cemetery() {
    const CEM = { x: 76, z: -64, rot: -0.87 };
    return {
        cemToWorld(lx, lz) {
            const c = Math.cos(CEM.rot), s = Math.sin(CEM.rot);
            return [CEM.x + lx * c + lz * s, CEM.z - lx * s + lz * c];
        }
    };
}

const orbit = (cx, cz, r, h, lookH, a0, a1, t0, t1, n) =>
    Array.from({ length: n }, (_, i) => {
        const k = i / (n - 1);
        const a = a0 + (a1 - a0) * k;
        return { t: t0 + (t1 - t0) * k, pos: [cx + Math.cos(a) * r, cz + Math.sin(a) * r, h(k)], look: [cx, cz, lookH] };
    });

const gate = cemToWorld(0, 34);
const gateOut = cemToWorld(2, 40);
const gateOut2 = cemToWorld(3, 42);
const gateOut3 = cemToWorld(4, 44);
const church = cemToWorld(0, -14);

module.exports = {
    game: 'tumbalacatumba',
    // Tumbalacatumba.html é um arquivo único; ?play pula o título, &notut o tutorial, &peaceful desliga os ataques
    file: 'tumbalacatumba/Tumbalacatumba.html',
    query: 'play&notut&peaceful', // a qualidade (&q=) vem do perfil do Cineasta
    cta: 'Jogue grátis no navegador',
    url: 'playfulhub.com.br',
    shots: {
        'mansao-ao-anoitecer': {
            duration: 15,
            hour: [17.9, 19.2],
            camera: [
                { t: 0, pos: [62, 20, 3.5], look: [124, 3, 9] },
                { t: 5, pos: [82, 14, 7], look: [124, 3, 12] },
                { t: 10, pos: [94, 8, 17], look: [124, 3, 15] },
                { t: 15, pos: [100, 6, 24], look: [124, 3, 17] }
            ],
            captions: [
                { from: 1, to: 7, text: 'Ninguém sabe quem mora na Mansão Dentúcio…' },
                { from: 8, to: 14, text: 'Mas as janelas acenderam sozinhas.' }
            ]
        },
        'praca-relogio-torto': {
            duration: 15,
            hour: [18.1, 19.0],
            camera: orbit(0, -8, 24, (k) => 5 + 8 * k, 13, Math.PI * 0.15, Math.PI * 1.1, 0, 15, 6),
            captions: [
                { from: 1, to: 7, text: 'A Praça do Relógio Torto' },
                { from: 8, to: 14, text: 'Um RPG de missões que cabe no navegador.' }
            ]
        },
        'cemiterio-sorridente': {
            duration: 15,
            hour: [19.0, 19.6],
            // sobe e se afasta do portão sem atravessá-lo: o arco fica no terço de baixo e não cobre a legenda
            camera: [
                { t: 0, pos: [gate[0], gate[1], 3.2], look: [church[0], church[1], 12] },
                { t: 6, pos: [gateOut[0], gateOut[1], 5.5], look: [church[0], church[1], 11] },
                { t: 11, pos: [gateOut2[0], gateOut2[1], 7.5], look: [church[0], church[1], 10] },
                { t: 15, pos: [gateOut3[0], gateOut3[1], 9], look: [church[0], church[1], 9] }
            ],
            captions: [
                { from: 1, to: 7, text: 'O portão do Cemitério Sorridente' },
                { from: 8, to: 14, text: 'está sorrindo pra você.' }
            ]
        },
        'campo-de-abobora': {
            duration: 15,
            hour: [17.6, 18.8],
            camera: [
                { t: 0, pos: [-20, 112, 1.5], look: [-20, 90, 2.5] },
                { t: 6, pos: [-20, 102, 1.4], look: [-20, 84, 3] },
                { t: 11, pos: [-19, 94, 1.5], look: [-20, 82, 3.5] },
                { t: 15, pos: [-17, 88, 4], look: [-22, 80, 5] }
            ],
            captions: [
                { from: 1, to: 7, text: 'As abóboras do Vale fogem de você.' },
                { from: 8, to: 14, text: 'Sério. E correm rápido.' }
            ]
        },
        'farol-desalinhado': {
            duration: 15,
            hour: [18.4, 19.6],
            // órbita curta pelo lado do lago (sul/oeste do farol), subindo devagar
            camera: orbit(44, -124, 27, (k) => 3.5 + 11 * k, 15, Math.PI * 0.95, Math.PI * 0.5, 0, 15, 5),
            captions: [
                { from: 1, to: 7, text: 'O Farol Desalinhado' },
                { from: 8, to: 14, text: 'Só acende quando você faz o casamento acontecer.' }
            ]
        },
        'lago-lamentoso': {
            duration: 15,
            hour: [18.6, 19.8],
            // da margem sul, deslizando para leste e subindo, com a ilha ao fundo
            camera: [
                { t: 0, pos: [-14, -66, 3], look: [2, -106, 6] },
                { t: 6, pos: [2, -64, 4.5], look: [2, -106, 6] },
                { t: 11, pos: [16, -64, 7], look: [2, -106, 6] },
                { t: 15, pos: [26, -66, 10], look: [2, -106, 6] }
            ],
            captions: [
                { from: 1, to: 7, text: 'O Lago Lamentoso' },
                { from: 8, to: 14, text: 'Dizem que ele chora quando ninguém está olhando.' }
            ]
        },
        'moinho-ao-por-do-sol': {
            duration: 15,
            hour: [17.3, 18.5],
            camera: orbit(54, 84, 24, (k) => 3.5 + 6 * k, 11, Math.PI * 1.25, Math.PI * 0.55, 0, 15, 5),
            captions: [
                { from: 1, to: 7, text: 'Pôr do sol no moinho do Vale' },
                { from: 8, to: 14, text: 'Aqui, até o vento tem história pra contar.' }
            ]
        },
        'vale-visto-de-cima': {
            duration: 16,
            hour: [18.0, 19.4],
            camera: [
                { t: 0, pos: [-112, 62, 30], look: [0, 0, 4] },
                { t: 6, pos: [-60, 22, 34], look: [20, -10, 7] },
                { t: 11, pos: [30, -28, 36], look: [90, 0, 9] },
                { t: 16, pos: [80, -12, 34], look: [124, 3, 13] }
            ],
            captions: [
                { from: 1, to: 8, text: 'Vale Tumbalacatumba' },
                { from: 9, to: 15, text: '17 missões, uma mansão e muitas abóboras.' }
            ]
        }
    }
};
