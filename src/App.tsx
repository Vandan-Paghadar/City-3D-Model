/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Activity,
  Droplets,
  Flame,
  Wind,
  Compass,
  RotateCcw,
  Tag,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  X,
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
} from 'lucide-react';
import {
  SENSOR_CATEGORIES,
  SENSOR_MARKERS,
  CITY_LANDMARKS,
  CAMERA_PRESETS,
  CALAMITY_SCENARIOS,
} from './data/cityData';
import { SensorMarkerData, SensorType, CalamityType } from './types/city';
import { createCityTextures } from './three/textures';
import { buildSmartCityScene, BuiltCityScene } from './three/builders';

// Pre-allocated math helpers at module scope (zero GC in render loop)
const _projVec = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

interface ScreenCoord {
  x: number;
  y: number;
  visible: boolean;
}

const SENSOR_ICON_COMPONENTS: Record<SensorType, React.FC<{ className?: string }>> = {
  earthquake: Activity,
  water: Droplets,
  gas: Flame,
  air: Wind,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Interactive UI State
  const [activeFilter, setActiveFilter] = useState<SensorType | 'all'>('all');
  const [selectedSensor, setSelectedSensor] = useState<SensorMarkerData | null>(null);
  const [activeCalamity, setActiveCalamity] = useState<CalamityType>('none');

  const [activePresetId, setActivePresetId] = useState<string>('overview');
  const [showLandmarkLabels, setShowLandmarkLabels] = useState<boolean>(true);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [showReferenceModal, setShowReferenceModal] = useState<boolean>(false);
  const [refImageError, setRefImageError] = useState<boolean>(false);

  // Projected 2D screen positions for 3D labels (only used when no calamity is active)
  const [selectedScreenPos, setSelectedScreenPos] = useState<ScreenCoord>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [landmarkScreenMap, setLandmarkScreenMap] = useState<Record<string, ScreenCoord>>({});

  // Mutable refs for reading inside the requestAnimationFrame loop
  const selectedSensorRef = useRef<SensorMarkerData | null>(selectedSensor);
  selectedSensorRef.current = selectedSensor;

  const activeFilterRef = useRef<SensorType | 'all'>(activeFilter);
  activeFilterRef.current = activeFilter;

  const activeCalamityRef = useRef<CalamityType>(activeCalamity);
  activeCalamityRef.current = activeCalamity;

  const showLandmarkLabelsRef = useRef<boolean>(showLandmarkLabels);
  showLandmarkLabelsRef.current = showLandmarkLabels;

  // Refs for imperative camera preset flights & lighting updates
  const flyTransitionRef = useRef<{ active: boolean }>({ active: false });
  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    keyLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    builtCity: BuiltCityScene;
  } | null>(null);

  // Trigger smooth camera flight to a preset or specific sensor
  const flyToCamera = useCallback(
    (pos: [number, number, number], target: [number, number, number], presetId?: string) => {
      _camGoalPos.set(pos[0], pos[1], pos[2]);
      _camGoalTarget.set(target[0], target[1], target[2]);
      flyTransitionRef.current.active = true;
      if (presetId) setActivePresetId(presetId);
    },
    []
  );

  const handleSelectSensor = useCallback(
    (sensor: SensorMarkerData, focusCamera = false) => {
      setSelectedSensor(sensor);
      if (focusCamera) {
        const [sx, sy, sz] = sensor.position;
        flyToCamera([sx - 16, sy + 22, sz + 28], [sx, sy + 2, sz]);
      }
    },
    [flyToCamera]
  );

  // Trigger a calamity:
  // - Only the related sensors remain visible in the 3D scene
  // - No sensor names, no callout cards, no zone labels are displayed
  // - The related 3D sensor pins glow and pulse brightly in the 3D scene
  const handleTriggerCalamity = useCallback((calamity: CalamityType) => {
    setActiveCalamity((prev) => {
      const next = prev === calamity ? 'none' : calamity;
      if (next !== 'none') {
        // Clear any open sensor name label so nothing blocks the glowing pins
        setSelectedSensor(null);
      }
      return next;
    });
  }, []);

  // Sync sensor pin visibility and glow state whenever calamity or filter changes
  useEffect(() => {
    const ctx = sceneRefs.current;
    if (!ctx) return;

    ctx.builtCity.sensorPinsMap.forEach((pinGroup, id) => {
      const data = pinGroup.userData.sensorData as SensorMarkerData;
      const pinColorMat = pinGroup.userData.pinColorMat as THREE.MeshStandardMaterial;
      const glowHalo = pinGroup.userData.glowHalo as THREE.Mesh;
      const beaconRing = pinGroup.userData.beaconRing as THREE.Mesh;

      if (activeCalamity !== 'none') {
        // When any calamity occurs, ONLY the related sensors stay visible and glow
        const isRelated = data.type === activeCalamity;
        pinGroup.visible = isRelated;
        glowHalo.visible = isRelated;
        beaconRing.visible = isRelated;
        if (isRelated) {
          pinColorMat.emissiveIntensity = 1.4;
          pinGroup.scale.setScalar(1.32);
        } else {
          pinColorMat.emissiveIntensity = 0.18;
          pinGroup.scale.setScalar(1.0);
        }
      } else {
        // Normal mode: follow Legend filter, turn off calamity glow
        const matchesFilter = activeFilter === 'all' || data.type === activeFilter;
        pinGroup.visible = matchesFilter;
        glowHalo.visible = false;
        beaconRing.visible = false;
        pinColorMat.emissiveIntensity = 0.18;
        const isSelected = selectedSensor?.id === id;
        pinGroup.scale.setScalar(isSelected ? 1.32 : 1.0);
      }
    });

    ctx.builtCity.animatedObjects.gasHazardGroup.visible = activeCalamity === 'gas';
    ctx.builtCity.animatedObjects.smogHazardGroup.visible = activeCalamity === 'air';
  }, [activeFilter, selectedSensor, activeCalamity]);

  // Sync Day / Dusk atmosphere lighting
  useEffect(() => {
    const ctx = sceneRefs.current;
    if (!ctx) return;
    const { scene, keyLight, hemiLight } = ctx;
    if (isNightMode) {
      const nightSky = new THREE.Color(0x0f172a);
      scene.background = nightSky;
      scene.fog = new THREE.FogExp2(0x0f172a, 0.0038);
      keyLight.color.setHex(0x93c5fd);
      keyLight.intensity = 1.1;
      hemiLight.color.setHex(0x38bdf8);
      hemiLight.groundColor.setHex(0x0f172a);
      hemiLight.intensity = 0.55;
    } else {
      const daySky = new THREE.Color(0xdbeafe);
      scene.background = daySky;
      scene.fog = new THREE.FogExp2(0xdbeafe, 0.0028);
      keyLight.color.setHex(0xfffbeb);
      keyLight.intensity = 2.2;
      hemiLight.color.setHex(0xbae6fd);
      hemiLight.groundColor.setHex(0x3f6212);
      hemiLight.intensity = 0.85;
    }
  }, [isNightMode]);

  // Keyboard shortcuts: 'H' bottom dock, 'L' Smart City sidebar, 'Escape' clear
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'l' || e.key === 'L') {
        setSidebarCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (showReferenceModal) setShowReferenceModal(false);
        else if (activeCalamity !== 'none') setActiveCalamity('none');
        else setSelectedSensor(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showReferenceModal, activeCalamity]);

  // Initialize Three.js Scene once inside stable mount ref
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL detection per Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbeafe);
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.0028);

    // 2. Studio Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      1,
      420
    );
    camera.position.set(-18, 78, 98);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(2, 4, 2);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minPolarAngle = 0.15;
    controls.minDistance = 18;
    controls.maxDistance = 185;
    controls.update();

    const onControlStart = () => {
      flyTransitionRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // 4. Warm Key Light + Cool Hemisphere Fill + Rim Light
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x3f6212, 0.85);
    hemiLight.position.set(0, 80, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(-65, 95, 55);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    const d = 95;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 240;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rimLight.position.set(70, 50, -70);
    scene.add(rimLight);

    // 5. Build Smart City & Sensor Network
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const textures = createCityTextures(maxAnisotropy);
    const builtCity = buildSmartCityScene(textures);
    scene.add(builtCity.rootGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneRefs.current = {
      scene,
      camera,
      controls,
      keyLight,
      hemiLight,
      builtCity,
    };

    // 6. Raycasting for Sensor Pin Clicks (only shows label in normal mode)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      // During a calamity, do not open any text label
      if (activeCalamityRef.current !== 'none') return;

      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moveDist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const visibleClickables = builtCity.clickableMeshes.filter(
        (m) => m.parent && m.parent.visible
      );
      const hits = raycaster.intersectObjects(visibleClickables, false);

      if (hits.length > 0) {
        const hitSensor = hits[0].object.userData.sensorData as SensorMarkerData | undefined;
        if (hitSensor) {
          setSelectedSensor(hitSensor);
        }
      }
    };

    let lastHoverTime = 0;
    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 60) return;
      lastHoverTime = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const visibleClickables = builtCity.clickableMeshes.filter(
        (m) => m.parent && m.parent.visible
      );
      const hits = raycaster.intersectObjects(visibleClickables, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    domElem.addEventListener('pointerup', onPointerUp);
    domElem.addEventListener('pointermove', onPointerMove);

    // 7. Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 8. Animation & Paced Software-WebGL Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let isUnmounted = false;
    let lastOverlaySync = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isUnmounted) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const projectToScreen = (
      x: number,
      y: number,
      z: number,
      width: number,
      height: number
    ): ScreenCoord => {
      _projVec.set(x, y, z).project(camera);
      const visible = _projVec.z >= -1 && _projVec.z <= 1;
      return {
        x: ((_projVec.x + 1) / 2) * width,
        y: (-(_projVec.y - 1) / 2) * height,
        visible,
      };
    };

    function tick() {
      if (isUnmounted) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Smooth damped camera flight if preset was triggered
      if (flyTransitionRef.current.active) {
        const lambda = 5.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, lambda, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, lambda, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, lambda, dt);

        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _camGoalTarget.x,
          lambda,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _camGoalTarget.y,
          lambda,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _camGoalTarget.z,
          lambda,
          dt
        );

        if (
          camera.position.distanceToSquared(_camGoalPos) < 0.25 &&
          controls.target.distanceToSquared(_camGoalTarget) < 0.25
        ) {
          flyTransitionRef.current.active = false;
        }
      }

      controls.update();

      const calamity = activeCalamityRef.current;

      // 1. Earthquake tremor
      if (calamity === 'earthquake') {
        builtCity.rootGroup.position.x = Math.sin(elapsed * 35) * 0.22;
        builtCity.rootGroup.position.z = Math.cos(elapsed * 30) * 0.18;
      } else {
        builtCity.rootGroup.position.x = THREE.MathUtils.damp(
          builtCity.rootGroup.position.x,
          0,
          8,
          dt
        );
        builtCity.rootGroup.position.z = THREE.MathUtils.damp(
          builtCity.rootGroup.position.z,
          0,
          8,
          dt
        );
      }

      // 2. Flood water level rise
      const targetWaterY = calamity === 'water' ? 1.75 : 0.6;
      builtCity.animatedObjects.waterMesh.position.y = THREE.MathUtils.damp(
        builtCity.animatedObjects.waterMesh.position.y,
        targetWaterY,
        3.5,
        dt
      );
      builtCity.animatedObjects.boatGroup.position.y =
        builtCity.animatedObjects.waterMesh.position.y + 0.12;
      builtCity.animatedObjects.boatGroup.position.z = 50 + Math.sin(elapsed * 0.45) * 6;

      // 3. Animate glowing sensor pins & expanding beacon rings when calamity is active
      if (calamity !== 'none') {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 7.0);
        const ringPhase = (elapsed * 1.4) % 1;

        builtCity.sensorPinsMap.forEach((pinGroup) => {
          const sData = pinGroup.userData.sensorData as SensorMarkerData;
          if (sData.type === calamity) {
            const pinColorMat = pinGroup.userData.pinColorMat as THREE.MeshStandardMaterial;
            const glowHalo = pinGroup.userData.glowHalo as THREE.Mesh;
            const haloMat = pinGroup.userData.haloMat as THREE.MeshBasicMaterial;
            const beaconRing = pinGroup.userData.beaconRing as THREE.Mesh;
            const beaconMat = pinGroup.userData.beaconMat as THREE.MeshBasicMaterial;

            // Intense emissive glow pulse on the pin itself
            pinColorMat.emissiveIntensity = 0.8 + pulse * 1.6;

            // Pulsing 3D glowing aura sphere around the pin head
            const haloScale = 1.0 + pulse * 0.45;
            glowHalo.scale.setScalar(haloScale);
            haloMat.opacity = 0.28 + pulse * 0.42;

            // Expanding ground shockwave ring
            const ringScale = 0.8 + ringPhase * 2.2;
            beaconRing.scale.setScalar(ringScale);
            beaconMat.opacity = (1.0 - ringPhase) * 0.85;
          }
        });
      }

      // Clarifier scraper arms rotation
      for (const arm of builtCity.animatedObjects.clarifierBridges) {
        arm.rotation.y = elapsed * 0.25;
      }

      renderer.render(scene, camera);

      // Update projected 2D screen coordinates only when no calamity is active
      const now = performance.now();
      if (calamity === 'none' && now - lastOverlaySync > 45) {
        lastOverlaySync = now;
        const w = container.clientWidth;
        const h = container.clientHeight;

        const sel = selectedSensorRef.current;
        if (sel) {
          const [sx, sy, sz] = sel.position;
          setSelectedScreenPos(projectToScreen(sx, sy + 6.0, sz, w, h));
        }

        if (showLandmarkLabelsRef.current) {
          const nextLandmarks: Record<string, ScreenCoord> = {};
          for (const lm of CITY_LANDMARKS) {
            nextLandmarks[lm.id] = projectToScreen(
              lm.position[0],
              lm.position[1],
              lm.position[2],
              w,
              h
            );
          }
          setLandmarkScreenMap(nextLandmarks);
        }
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.removeEventListener('start', onControlStart);
      domElem.removeEventListener('pointerdown', onPointerDown);
      domElem.removeEventListener('pointerup', onPointerUp);
      domElem.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      builtCity.dispose();
      Object.values(textures.sensorIcons).forEach((t) => t.dispose());
      textures.officeWindows.dispose();
      textures.apartmentWindows.dispose();
      textures.hospitalFacade.dispose();
      textures.helipad.dispose();
      textures.smokestackStripe.dispose();
      textures.clarifierWater.dispose();
      textures.contactShadow.dispose();
      renderer.dispose();
    };
  }, []);

  // Counts per sensor type
  const sensorCounts = useMemo(() => {
    const counts: Record<SensorType | 'all', number> = {
      all: SENSOR_MARKERS.length,
      earthquake: 0,
      water: 0,
      gas: 0,
      air: 0,
    };
    for (const s of SENSOR_MARKERS) {
      counts[s.type]++;
    }
    return counts;
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Dedicated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* =====================================================================
          3D WORLD-ANCHORED LANDMARK LABELS (Hidden during calamity so only glowing sensors show)
      ====================================================================== */}
      {showLandmarkLabels && activeCalamity === 'none' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {CITY_LANDMARKS.map((lm) => {
            const coord = landmarkScreenMap[lm.id];
            if (!coord || !coord.visible) return null;
            return (
              <button
                key={lm.id}
                type="button"
                onClick={() => flyToCamera(lm.cameraPos, lm.cameraTarget)}
                style={{
                  transform: `translate3d(${Math.round(coord.x)}px, ${Math.round(
                    coord.y
                  )}px, 0) translate(-50%, -50%)`,
                }}
                className="pointer-events-auto absolute top-0 left-0 px-2.5 py-1 rounded-md bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 shadow-md transition-colors whitespace-nowrap"
              >
                <span className="text-xs font-semibold tracking-tight">{lm.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          CLICKED SENSOR FLOATING LABEL (Only in Normal Mode; hidden during calamity)
      ====================================================================== */}
      {activeCalamity === 'none' && selectedSensor && selectedScreenPos.visible && (
        <div
          style={{
            transform: `translate3d(${Math.round(selectedScreenPos.x)}px, ${Math.round(
              selectedScreenPos.y
            )}px, 0) translate(-50%, -100%)`,
          }}
          className="absolute top-0 left-0 z-20 pointer-events-auto w-72 rounded-xl bg-slate-900/95 border border-slate-700 text-white shadow-2xl p-3.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                style={{ backgroundColor: SENSOR_CATEGORIES[selectedSensor.type].colorHex }}
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white"
              >
                {React.createElement(SENSOR_ICON_COMPONENTS[selectedSensor.type], {
                  className: 'w-3.5 h-3.5',
                })}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-mono-tabular text-slate-400">
                  {selectedSensor.code} · {SENSOR_CATEGORIES[selectedSensor.type].label}
                </div>
                <h3 className="text-sm font-semibold text-white truncate">
                  {selectedSensor.name}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSensor(null)}
              aria-label="Close sensor label"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            {selectedSensor.purpose}
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {selectedSensor.zone} · {selectedSensor.mountType}
            </span>
            <button
              type="button"
              onClick={() => handleSelectSensor(selectedSensor, true)}
              className="text-sky-400 hover:text-sky-300 font-medium whitespace-nowrap"
            >
              Focus View
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TOP-LEFT HEADER & SENSOR LEGEND (COLLAPSIBLE SIDEBAR)
      ====================================================================== */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5 max-w-xs sm:max-w-sm pointer-events-auto">
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            title="Show Smart City Sidebar (Shortcut: L)"
            className="px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700/80 shadow-xl flex items-center gap-2 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <PanelLeftOpen className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Show Smart City Panel (L)</span>
          </button>
        ) : (
          <>
            {/* Title Banner */}
            <div className="rounded-xl bg-slate-900/94 border border-slate-700/80 px-4 py-3 text-white shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                    Smart City
                  </h1>
                  <p className="text-xs text-slate-300 truncate">
                    Sensor Network for a Safer Tomorrow
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowReferenceModal(true)}
                    title="View Project Blueprint Image"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Blueprint</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(true)}
                    title="Hide Smart City Sidebar (Shortcut: L)"
                    aria-label="Hide Smart City Sidebar"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-slate-300 hover:text-white transition-colors shrink-0"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sensor Network Legend */}
            <div className="rounded-xl bg-slate-900/94 border border-slate-700/80 p-3 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-slate-200">
                  Sensor Network Legend
                </span>
                {activeFilter !== 'all' || activeCalamity !== 'none' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter('all');
                      setActiveCalamity('none');
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                  >
                    Show All ({sensorCounts.all})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(true)}
                    className="text-[11px] text-slate-400 hover:text-white font-medium"
                  >
                    Hide (L)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-1">
                {(Object.keys(SENSOR_CATEGORIES) as SensorType[]).map((type) => {
                  const cat = SENSOR_CATEGORIES[type];
                  const Icon = SENSOR_ICON_COMPONENTS[type];
                  const isFiltered = activeFilter === type && activeCalamity === 'none';
                  const isCalamityActive = activeCalamity === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setActiveCalamity('none');
                        setActiveFilter(isFiltered ? 'all' : type);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        isCalamityActive
                          ? 'bg-slate-800 border border-amber-400/80'
                          : isFiltered
                          ? 'bg-slate-800 border border-slate-600'
                          : 'hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          style={{ backgroundColor: cat.colorHex }}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 border border-white/80 shadow-sm"
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white leading-tight truncate">
                            {cat.label}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-tight truncate">
                            {cat.subtitle}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono-tabular text-slate-300 shrink-0">
                        {sensorCounts[type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* =====================================================================
          UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK
      ====================================================================== */}
      <div
        style={{
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'min(980px, 96vw)',
        }}
        className="fixed z-20 w-full pointer-events-auto flex flex-col items-center"
      >
        {/* Collapse / Expand Toggle Tab */}
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="mb-1.5 px-3.5 py-1 rounded-lg bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 shadow-lg transition-colors whitespace-nowrap"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        {/* Main Control Bar */}
        {!dockCollapsed && (
          <div className="w-full rounded-xl bg-slate-900/95 border border-slate-700/90 px-4 py-3 text-white shadow-2xl flex flex-col gap-2.5">
            {/* Row 1: Camera Zone Presets + Scene Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  <span>Zones:</span>
                </span>
                {CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => flyToCamera(preset.position, preset.target, preset.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      activePresetId === preset.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Scene Display Toggles */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    !sidebarCollapsed
                      ? 'bg-slate-700 text-white border border-slate-500'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                  ) : (
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  )}
                  <span>Sidebar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLandmarkLabels((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    showLandmarkLabels && activeCalamity === 'none'
                      ? 'bg-slate-700 text-white border border-slate-500'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Zone Labels</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNightMode((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {isNightMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Daylight</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Dusk</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const ov = CAMERA_PRESETS[0];
                    flyToCamera(ov.position, ov.target, ov.id);
                    setActiveFilter('all');
                    setActiveCalamity('none');
                    setSelectedSensor(null);
                  }}
                  title="Reset Camera, Filters & Calamity"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Row 2: Calamity Trigger Buttons (Only shows & glows the related 3D sensors, zero text labels) */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mr-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Trigger Calamity:</span>
                </span>
                {(['earthquake', 'water', 'gas', 'air'] as CalamityType[]).map((cType) => {
                  const sc = CALAMITY_SCENARIOS[cType];
                  const cat = SENSOR_CATEGORIES[cType as SensorType];
                  const isActive = activeCalamity === cType;
                  return (
                    <button
                      key={cType}
                      type="button"
                      onClick={() => handleTriggerCalamity(cType)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 border ${
                        isActive
                          ? 'bg-slate-800 text-white border-amber-400 shadow-md'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border-transparent'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: cat.colorHex }}
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                      />
                      <span>{sc.shortLabel}</span>
                    </button>
                  );
                })}
                {activeCalamity !== 'none' && (
                  <button
                    type="button"
                    onClick={() => setActiveCalamity('none')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    Stop Calamity
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          REFERENCE BLUEPRINT MODAL
      ====================================================================== */}
      {showReferenceModal && (
        <div
          onClick={() => setShowReferenceModal(false)}
          className="fixed inset-0 z-30 bg-slate-950/80 flex items-center justify-center p-4 pointer-events-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full rounded-2xl bg-slate-900 border border-slate-700 p-4 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold">
                  Smart City Project Reference Blueprint
                </h2>
                <p className="text-xs text-slate-400">
                  Visual layout guide for Dam, Bridges, Hospital, Fire Station, Control Center, Industry Zone, Drainage System & Sensor Pins
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReferenceModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!refImageError ? (
              <div className="overflow-hidden rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                <img
                  src="/assets/aistudio/1dc26128-0be2-4dfa-8a91-64b26e3627e7_2bc48da6.png"
                  alt="Smart City Sensor Network Reference Poster"
                  referrerPolicy="no-referrer"
                  onError={() => setRefImageError(true)}
                  className="max-h-[72vh] w-auto object-contain"
                />
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                <p className="text-sm text-slate-300">
                  Smart City Reference Diagram
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
