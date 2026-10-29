import * as THREE from 'three';
import { SensorType } from '../types/city';

export interface CityTextures {
  officeWindows: THREE.CanvasTexture;
  apartmentWindows: THREE.CanvasTexture;
  hospitalFacade: THREE.CanvasTexture;
  helipad: THREE.CanvasTexture;
  smokestackStripe: THREE.CanvasTexture;
  clarifierWater: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  sensorIcons: Record<SensorType, THREE.CanvasTexture>;
}

function configureTexture(tex: THREE.CanvasTexture, maxAnisotropy: number, repeatX = 1, repeatY = 1) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createCityTextures(maxAnisotropy: number): CityTextures {
  // 1. Office Building Curtain Wall Texture
  const officeCanvas = document.createElement('canvas');
  officeCanvas.width = 256;
  officeCanvas.height = 512;
  const oCtx = officeCanvas.getContext('2d')!;
  oCtx.fillStyle = '#cbd5e1';
  oCtx.fillRect(0, 0, 256, 512);

  const cols = 4;
  const rows = 10;
  const padX = 8;
  const padY = 8;
  const cellW = 256 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + padX;
      const y = r * cellH + padY;
      const w = cellW - padX * 2;
      const h = cellH - padY * 2;

      const grad = oCtx.createLinearGradient(x, y, x + w, y + h);
      const isLit = (r * 7 + c * 3) % 5 === 0;
      if (isLit) {
        grad.addColorStop(0, '#bae6fd');
        grad.addColorStop(1, '#38bdf8');
      } else {
        grad.addColorStop(0, '#334155');
        grad.addColorStop(1, '#1e293b');
      }
      oCtx.fillStyle = grad;
      oCtx.fillRect(x, y, w, h);

      oCtx.strokeStyle = '#94a3b8';
      oCtx.lineWidth = 2;
      oCtx.strokeRect(x, y, w, h);
    }
  }
  const officeWindows = configureTexture(new THREE.CanvasTexture(officeCanvas), maxAnisotropy);

  // 2. Apartment Building Windows Texture
  const aptCanvas = document.createElement('canvas');
  aptCanvas.width = 256;
  aptCanvas.height = 256;
  const aCtx = aptCanvas.getContext('2d')!;
  aCtx.fillStyle = '#e2d9c8';
  aCtx.fillRect(0, 0, 256, 256);

  const aCols = 4;
  const aRows = 5;
  const aW = 256 / aCols;
  const aH = 256 / aRows;
  for (let r = 0; r < aRows; r++) {
    // Horizontal floor ledge
    aCtx.fillStyle = '#cbbba0';
    aCtx.fillRect(0, r * aH, 256, 4);
    for (let c = 0; c < aCols; c++) {
      const x = c * aW + 12;
      const y = r * aH + 10;
      const w = aW - 24;
      const h = aH - 18;
      aCtx.fillStyle = (r + c) % 3 === 0 ? '#7dd3fc' : '#334155';
      aCtx.fillRect(x, y, w, h);
      aCtx.strokeStyle = '#f8fafc';
      aCtx.lineWidth = 2;
      aCtx.strokeRect(x, y, w, h);
    }
  }
  const apartmentWindows = configureTexture(new THREE.CanvasTexture(aptCanvas), maxAnisotropy);

  // 3. Hospital Facade Texture
  const hospCanvas = document.createElement('canvas');
  hospCanvas.width = 256;
  hospCanvas.height = 256;
  const hCtx = hospCanvas.getContext('2d')!;
  hCtx.fillStyle = '#f8fafc';
  hCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 4; r++) {
    hCtx.fillStyle = '#e2e8f0';
    hCtx.fillRect(0, r * 64, 256, 4);
    for (let c = 0; c < 6; c++) {
      hCtx.fillStyle = '#38bdf8';
      hCtx.fillRect(c * 42 + 8, r * 64 + 14, 26, 36);
      hCtx.strokeStyle = '#cbd5e1';
      hCtx.lineWidth = 2;
      hCtx.strokeRect(c * 42 + 8, r * 64 + 14, 26, 36);
    }
  }
  const hospitalFacade = configureTexture(new THREE.CanvasTexture(hospCanvas), maxAnisotropy);

  // 4. Helipad Texture (H)
  const heliCanvas = document.createElement('canvas');
  heliCanvas.width = 256;
  heliCanvas.height = 256;
  const hlCtx = heliCanvas.getContext('2d')!;
  hlCtx.fillStyle = '#475569';
  hlCtx.fillRect(0, 0, 256, 256);
  hlCtx.strokeStyle = '#f8fafc';
  hlCtx.lineWidth = 10;
  hlCtx.beginPath();
  hlCtx.arc(128, 128, 96, 0, Math.PI * 2);
  hlCtx.stroke();
  hlCtx.strokeStyle = '#facc15';
  hlCtx.lineWidth = 6;
  hlCtx.strokeRect(14, 14, 228, 228);
  hlCtx.fillStyle = '#ffffff';
  hlCtx.fillRect(82, 72, 22, 112);
  hlCtx.fillRect(152, 72, 22, 112);
  hlCtx.fillRect(82, 116, 92, 22);
  const helipad = configureTexture(new THREE.CanvasTexture(heliCanvas), maxAnisotropy);

  // 5. Smokestack Red & White Stripes
  const stackCanvas = document.createElement('canvas');
  stackCanvas.width = 64;
  stackCanvas.height = 256;
  const sCtx = stackCanvas.getContext('2d')!;
  sCtx.fillStyle = '#e2e8f0';
  sCtx.fillRect(0, 0, 64, 256);
  const stripeBands = [
    { y: 0, h: 36, color: '#dc2626' },
    { y: 36, h: 36, color: '#f8fafc' },
    { y: 72, h: 36, color: '#dc2626' },
    { y: 108, h: 36, color: '#f8fafc' },
    { y: 144, h: 36, color: '#dc2626' },
    { y: 180, h: 76, color: '#cbd5e1' },
  ];
  for (const b of stripeBands) {
    sCtx.fillStyle = b.color;
    sCtx.fillRect(0, b.y, 64, b.h);
  }
  const smokestackStripe = configureTexture(new THREE.CanvasTexture(stackCanvas), maxAnisotropy);

  // 6. Clarifier Basin Water Texture
  const clarCanvas = document.createElement('canvas');
  clarCanvas.width = 256;
  clarCanvas.height = 256;
  const cCtx = clarCanvas.getContext('2d')!;
  const cGrad = cCtx.createRadialGradient(128, 128, 10, 128, 128, 124);
  cGrad.addColorStop(0, '#1e3a8a');
  cGrad.addColorStop(0.55, '#0284c7');
  cGrad.addColorStop(0.85, '#38bdf8');
  cGrad.addColorStop(1, '#bae6fd');
  cCtx.fillStyle = cGrad;
  cCtx.fillRect(0, 0, 256, 256);
  cCtx.strokeStyle = 'rgba(255,255,255,0.35)';
  cCtx.lineWidth = 3;
  for (const rad of [38, 72, 104]) {
    cCtx.beginPath();
    cCtx.arc(128, 128, rad, 0, Math.PI * 2);
    cCtx.stroke();
  }
  const clarifierWater = configureTexture(new THREE.CanvasTexture(clarCanvas), maxAnisotropy);

  // 7. Soft Radial Contact Shadow Texture
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const shCtx = shCanvas.getContext('2d')!;
  const shGrad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  shGrad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  shGrad.addColorStop(0.6, 'rgba(15, 23, 42, 0.22)');
  shGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadow = configureTexture(new THREE.CanvasTexture(shCanvas), maxAnisotropy);

  // 8. Sensor Pin Icon Badges
  const createSensorIcon = (type: SensorType, bgHex: string): THREE.CanvasTexture => {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext('2d')!;

    // Colored circular background with crisp white rim
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'earthquake') {
      // Seismic accelerometer waveform pulse
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(46, 128);
      ctx.lineTo(82, 128);
      ctx.lineTo(102, 72);
      ctx.lineTo(126, 186);
      ctx.lineTo(150, 90);
      ctx.lineTo(168, 148);
      ctx.lineTo(182, 128);
      ctx.lineTo(210, 128);
      ctx.stroke();
    } else if (type === 'water') {
      // Water droplet + level wave
      ctx.beginPath();
      ctx.moveTo(128, 56);
      ctx.bezierCurveTo(168, 108, 182, 134, 182, 158);
      ctx.arc(128, 158, 54, 0, Math.PI, false);
      ctx.bezierCurveTo(74, 134, 88, 108, 128, 56);
      ctx.closePath();
      ctx.fill();

      // Subtle inner highlight
      ctx.strokeStyle = bgHex;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(114, 160, 26, Math.PI * 0.65, Math.PI * 1.15);
      ctx.stroke();
    } else if (type === 'gas') {
      // Flame / gas detector icon
      ctx.beginPath();
      ctx.moveTo(128, 52);
      ctx.bezierCurveTo(175, 95, 190, 132, 182, 166);
      ctx.bezierCurveTo(176, 194, 154, 210, 128, 210);
      ctx.bezierCurveTo(102, 210, 80, 194, 74, 166);
      ctx.bezierCurveTo(66, 132, 85, 105, 108, 86);
      ctx.bezierCurveTo(104, 110, 114, 120, 128, 52);
      ctx.closePath();
      ctx.fill();

      // Inner flame core
      ctx.fillStyle = bgHex;
      ctx.beginPath();
      ctx.moveTo(128, 124);
      ctx.bezierCurveTo(148, 145, 152, 165, 146, 182);
      ctx.bezierCurveTo(142, 194, 135, 198, 128, 198);
      ctx.bezierCurveTo(121, 198, 114, 194, 110, 182);
      ctx.bezierCurveTo(104, 165, 108, 145, 128, 124);
      ctx.closePath();
      ctx.fill();
    } else {
      // Air Quality leaf icon
      ctx.beginPath();
      ctx.moveTo(186, 70);
      ctx.bezierCurveTo(186, 152, 144, 192, 82, 188);
      ctx.bezierCurveTo(78, 126, 118, 70, 186, 70);
      ctx.closePath();
      ctx.fill();

      // Leaf stem & vein
      ctx.strokeStyle = bgHex;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(86, 184);
      ctx.quadraticCurveTo(132, 138, 170, 86);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(90, 180);
      ctx.quadraticCurveTo(72, 196, 64, 204);
      ctx.stroke();
    }

    return configureTexture(new THREE.CanvasTexture(cv), maxAnisotropy);
  };

  return {
    officeWindows,
    apartmentWindows,
    hospitalFacade,
    helipad,
    smokestackStripe,
    clarifierWater,
    contactShadow,
    sensorIcons: {
      earthquake: createSensorIcon('earthquake', '#16a34a'),
      water: createSensorIcon('water', '#2563eb'),
      gas: createSensorIcon('gas', '#ea580c'),
      air: createSensorIcon('air', '#9333ea'),
    },
  };
}
