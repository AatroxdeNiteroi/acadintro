# Holo Body 3D — Briefing técnico

## Visão geral
Holograma 3D interativo do corpo humano com:
- Modelo GLB anatômico real (não procedural)
- Shader holográfico custom (fresnel + scanlines + striations + bloom)
- 50+ zonas musculares clicáveis mapeadas por bounding-box 3D
- 3 modos de visualização: SEMANA (treino do dia), FORÇA (5 níveis), VOLUME (heatmap 7d)
- HUD sci-fi completo (cantos, scanlines, leitura de rotação, vitals)

## Stack
- **Three.js 0.160** via CDN (importmap)
- **GLTFLoader** pra carregar `models/anatomy.glb`
- **EffectComposer + UnrealBloomPass** pra glow holográfico
- **OrbitControls** pra câmera
- Vanilla JS (sem framework). Toda UI é DOM nativo + CSS.

## Arquitetura

### `Holo Body 3D.html`
- HTML semântico com regiões grid: topbar, painel esquerdo (modos), stage (canvas), painel direito (inspector), bottom (vitals)
- CSS com cores, clip-paths sci-fi, scanline overlay
- Importmap pra Three.js
- Carrega `holo3d.js` como módulo ES

### `holo3d.js`
Estrutura linear (não modularizado por arquivo, mas por seções):

1. **MUSCLES** (linha ~9) — dicionário de 60+ músculos com `{name, latin, group, force, vol7d}`. Esta é a fonte de verdade dos dados.

2. **WEEK** (~80) — array de 7 dias com `{day, focus, muscles[]}`. Define o split de treino atual.

3. **HOLO_VERT / HOLO_FRAG** (~95) — vertex e fragment shaders GLSL. O fragment usa fresnel + scanlines + striation + sparkle + uniformes `uIntensity` e `uHover` pra brilho dinâmico.

4. **MUSCLE_ZONES** (~200) — array de zonas com `{id, center: [x,y,z], radius}`. Cada zona é uma esfera invisível posicionada sobre o GLB. Raycast bate primeiro na superfície real do corpo, depois acha a zona mais próxima do hit point.

5. **GLB Loader** (~340) — `fetch('models/anatomy.glb')` → parse via GLTFLoader → aplica shader holográfico em todas as meshes → normaliza escala/posição (modelo vem com escala 76 unidades de altura, normaliza pra 7 unidades).

6. **applyMode** — atualiza uniformes do shader baseado no modo selecionado:
   - `semana`: zonas do dia atual brilham ciano, resto escurece
   - `forca`: cor por nível 1-5 (vermelho→ciano)
   - `volume`: gradiente azul→ciano→verde→amarelo→vermelho proporcional ao volume 7d

7. **Interação** (~720) — raycast em pointermove e click. Tooltip dinâmico, inspector com semana grid, animação de câmera.

8. **UI bindings** (~840) — botões de modo, dia, vista, reset camera.

9. **Animation loop** (~890) — atualiza `uTime` em todos os shaders, calcula azimute pra readout de rotação, renderiza com bloom.

## Pontos de adaptação pro app real

### 1. Dados via API
Hoje `MUSCLES` e `WEEK` são hardcoded. Pra plugar no app, substituir por:
```js
const MUSCLES = await fetch('/api/muscles').then(r=>r.json());
const WEEK = await fetch('/api/training-plan').then(r=>r.json());
```
Estrutura esperada — manter o mesmo schema.

### 2. Sincronização de seleção
O `selected` (id da zona clicada) pode emitir evento pra UI parent:
```js
window.dispatchEvent(new CustomEvent('muscle-selected', {detail: selected}));
```

### 3. Tema visual
Variáveis CSS no topo do HTML controlam cores principais (`--cyan`, `--bg-0`, etc). Trocar essas + ajustar `uColor` nos shaders adapta o tema sem mexer na lógica.

### 4. Hospedagem do GLB
Em produção, o GLB de 14MB deve estar num CDN com CORS, não no bundle. Trocar `fetch('models/anatomy.glb')` pela URL do CDN.

## O que NÃO mexer (sob risco de quebrar a sensação)
- **Shader holográfico** — os valores de fresnel power, scanline frequency, striation são calibrados pro look correto. Mudanças sutis quebram o efeito.
- **Lógica de raycast com pickers** — o GLB é uma mesh única, então pickers invisíveis são essenciais. Não tem como clicar no GLB direto e saber qual músculo é.
- **Normalização de escala do modelo** — o modelo vem em centímetros (~180 unidades de altura). O reescalonamento e centralização são necessários.
- **Bloom + Fog + transparency order** — ordem de render passes importa. Mexer leve.

## Performance
- Modelo: 6 meshes, ~14MB
- ~120 FPS em desktop com GPU dedicada
- ~60 FPS em laptop integrada
- Mobile: roda mas pode ficar 30 FPS — considerar reduzir bloom strength e desativar postprocessing em telas pequenas

## Próximas evoluções sugeridas
- Subdividir zonas (peitoral em 2 partes, deltóide em 3)
- Animação de respiração idle (escala vertical sutil em ribcage)
- Modo "lesão" — destaca músculos com flag de dor
- Histórico temporal — slider de "ver semana passada vs essa"
- Export do estado como imagem PNG
