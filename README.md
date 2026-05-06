# Holo Body 3D — Setup local

Aba de academia com holograma 3D do corpo humano. Three.js + GLB + shader holográfico custom.

## Estrutura
```
holo-body/
├── Holo Body 3D.html       ← entry point (HTML + CSS + HUD)
├── holo3d.js               ← engine 3D (Three.js, shader, raycast, UI logic)
├── models/
│   └── anatomy.glb         ← modelo anatômico (Sketchfab, CC-BY)
├── README.md               ← este arquivo
└── BRIEFING.md             ← arquitetura e pontos de adaptação
```

## Como rodar (1 minuto)

Precisa servir os arquivos via HTTP — não funciona abrindo o HTML direto (`file://`) porque o browser bloqueia fetch de GLB local.

### Opção 1 — Python (Mac/Linux/Windows com Python instalado)
```bash
cd holo-body
python3 -m http.server 8000
```
Abre no navegador: http://localhost:8000/Holo%20Body%203D.html

### Opção 2 — Node (qualquer lugar com Node instalado)
```bash
cd holo-body
npx serve
```
Vai te dar uma URL, geralmente http://localhost:3000

### Opção 3 — VS Code extension "Live Server"
- Instala a extensão **Live Server** (Ritwick Dey)
- Botão direito em `Holo Body 3D.html` → **Open with Live Server**

## Browser
- Chrome / Edge / Firefox / Safari recentes
- Precisa suportar WebGL2 e ES modules (todos os modernos suportam)

## Controles
- **Arrastar** — rotacionar câmera
- **Scroll** — zoom
- **Hover** — destaca músculo + tooltip
- **Click** — seleciona, abre inspector lateral
- **Duplo click** — zoom no músculo
- **FRENTE/COSTAS/ESQ/DIR** (rodapé) — vistas pré-definidas
- **RESET_CAMERA** (painel esquerdo) — volta câmera ao default

## Adaptando ao seu app
Veja `BRIEFING.md` — explica arquitetura, dados, e onde plugar API real.

## Créditos do modelo 3D
`anatomy.glb` — autor: flixtlix (Sketchfab), licença CC-BY-4.0.
Source: https://sketchfab.com/3d-models/human-anatomyglb-14191ef860b44925be0e94462c84ffe6
