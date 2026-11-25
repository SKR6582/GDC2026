import * as THREE from 'three';

export interface PaperTextureSet {
  problemBlank: THREE.Texture;
  problemSparse: THREE.Texture;
  problemSolved: [THREE.Texture, THREE.Texture, THREE.Texture];
  omrLevels: [
    THREE.Texture,
    THREE.Texture,
    THREE.Texture,
    THREE.Texture,
    THREE.Texture,
  ];
  dispose: () => void;
}

function createFallbackTexture(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  tex.needsUpdate = true;
  return tex;
}

function drawProblemBase(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(26, 26, width - 52, 22);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2, 62);
  ctx.lineTo(width / 2, height - 24);
  ctx.stroke();

  const drawColumnBlocks = (startX: number) => {
    for (let q = 0; q < 4; q += 1) {
      const topY = 76 + q * 134;
      ctx.fillStyle = '#334155';
      ctx.fillRect(startX, topY, 34, 14);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(startX + 42, topY + 2, 145, 9);
      ctx.fillRect(startX, topY + 24, 186, 8);
      ctx.fillRect(startX, topY + 40, 165, 8);
      ctx.fillRect(startX + 8, topY + 58, 120, 7);
    }
  };

  drawColumnBlocks(28);
  drawColumnBlocks(width / 2 + 18);
}

function createProblemSheetTexture(
  kind: 'blank' | 'sparse' | 'solved_0' | 'solved_1' | 'solved_2',
): THREE.Texture {
  if (typeof document === 'undefined') {
    return createFallbackTexture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawProblemBase(ctx, canvas.width, canvas.height);

    if (kind === 'sparse') {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(32, 108);
      ctx.lineTo(170, 108);
      ctx.moveTo(282, 242);
      ctx.lineTo(410, 242);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(44, 83, 14, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind.startsWith('solved_')) {
      const variant = Number(kind.split('_')[1] ?? '0');
      const inkColors = ['#1d4ed8', '#0f172a', '#1e40af'];
      const penColor = inkColors[variant % inkColors.length];

      ctx.strokeStyle = penColor;
      ctx.lineCap = 'round';

      const colOffsets = [32, 276];
      for (let c = 0; c < colOffsets.length; c += 1) {
        const baseX = colOffsets[c];
        for (let q = 0; q < 4; q += 1) {
          const baseY = 148 + q * 134;

          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(baseX + 12, baseY - 64, 15, 0, Math.PI * 2);
          ctx.stroke();

          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(baseX, baseY - 40);
          ctx.lineTo(baseX + 155, baseY - 38);
          ctx.stroke();

          ctx.lineWidth = 3;
          for (let line = 0; line < 3; line += 1) {
            const ly = baseY + line * 16;
            const segLen = 95 + ((variant + q + line) % 4) * 20;
            ctx.beginPath();
            ctx.moveTo(baseX + 6, ly);
            for (let sx = 12; sx <= segLen; sx += 14) {
              const jitter = Math.sin((sx + q * 19 + variant * 11) * 0.45) * 4.5;
              ctx.lineTo(baseX + sx, ly + jitter);
            }
            ctx.stroke();
          }

          if ((q + c + variant) % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(baseX + 125, baseY + 14);
            ctx.lineTo(baseX + 178, baseY + 14);
            ctx.moveTo(baseX + 134, baseY + 4);
            ctx.lineTo(baseX + 170, baseY + 4);
            ctx.moveTo(baseX + 136, baseY + 26);
            ctx.lineTo(baseX + 168, baseY + 26);
            ctx.stroke();
          }
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createOmrCardTexture(level: number): THREE.Texture {
  if (typeof document === 'undefined') {
    return createFallbackTexture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fff1f2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    ctx.fillStyle = '#be123c';
    ctx.fillRect(20, 20, canvas.width - 40, 32);

    const markedRows = Math.min(20, Math.max(0, level * 5));
    for (let row = 0; row < 20; row += 1) {
      const y = 74 + row * 21;
      ctx.fillStyle = '#be123c';
      ctx.fillRect(22, y - 5, 18, 9);

      const chosenCol = (row * 3 + 1) % 5;
      for (let col = 0; col < 5; col += 1) {
        const x = 62 + col * 34;
        if (row < markedRows && col === chosenCol) {
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.ellipse(x, y, 10, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#fb7185';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(x, y, 9, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPaperTextureSet(): PaperTextureSet {
  const problemBlank = createProblemSheetTexture('blank');
  const problemSparse = createProblemSheetTexture('sparse');
  const problemSolved: [THREE.Texture, THREE.Texture, THREE.Texture] = [
    createProblemSheetTexture('solved_0'),
    createProblemSheetTexture('solved_1'),
    createProblemSheetTexture('solved_2'),
  ];
  const omrLevels: [
    THREE.Texture,
    THREE.Texture,
    THREE.Texture,
    THREE.Texture,
    THREE.Texture,
  ] = [
    createOmrCardTexture(0),
    createOmrCardTexture(1),
    createOmrCardTexture(2),
    createOmrCardTexture(3),
    createOmrCardTexture(4),
  ];

  return {
    problemBlank,
    problemSparse,
    problemSolved,
    omrLevels,
    dispose: () => {
      problemBlank.dispose();
      problemSparse.dispose();
      for (const tex of problemSolved) tex.dispose();
      for (const tex of omrLevels) tex.dispose();
    },
  };
}
