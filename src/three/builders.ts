import * as THREE from 'three';
import { CityTextures } from './textures';
import { SENSOR_CATEGORIES, SENSOR_MARKERS } from '../data/cityData';
import { SensorMarkerData } from '../types/city';

export interface BuiltCityScene {
  rootGroup: THREE.Group;
  sensorPinsMap: Map<string, THREE.Group>;
  clickableMeshes: THREE.Object3D[];
  animatedObjects: {
    waterMesh: THREE.Mesh;
    spillwayMeshes: THREE.Mesh[];
    clarifierBridges: THREE.Object3D[];
    boatGroup: THREE.Group;
    pinRings: THREE.Mesh[];
    gasHazardGroup: THREE.Group;
    smogHazardGroup: THREE.Group;
  };
  dispose: () => void;
}

function addContactShadow(
  parent: THREE.Object3D,
  tex: THREE.CanvasTexture,
  width: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  opacity = 0.42
) {
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y + 0.03, z);
  parent.add(mesh);
}

export function buildSmartCityScene(textures: CityTextures): BuiltCityScene {
  const rootGroup = new THREE.Group();
  const sensorPinsMap = new Map<string, THREE.Group>();
  const clickableMeshes: THREE.Object3D[] = [];
  const spillwayMeshes: THREE.Mesh[] = [];
  const clarifierBridges: THREE.Object3D[] = [];
  const pinRings: THREE.Mesh[] = [];

  // Shared Materials Library (varied roughness/metalness per Three.js skill)
  const mats = {
    grassMain: new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.88, metalness: 0.02 }),
    grassPark: new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.85, metalness: 0.02 }),
    hillGrass: new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9, metalness: 0.02 }),
    earthBank: new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.92, metalness: 0.05 }),
    rockCliff: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, metalness: 0.1 }),
    concreteLight: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72, metalness: 0.08 }),
    concreteMid: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.78, metalness: 0.12 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82, metalness: 0.15 }),
    asphalt: new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    roadLine: new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    yellowLine: new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    waterRiver: new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      metalness: 0.1,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
    }),
    waterFoam: new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
      roughness: 0.3,
      metalness: 0.05,
    }),
    officeWall: new THREE.MeshStandardMaterial({
      map: textures.officeWindows,
      roughness: 0.32,
      metalness: 0.45,
    }),
    aptWall: new THREE.MeshStandardMaterial({
      map: textures.apartmentWindows,
      roughness: 0.55,
      metalness: 0.15,
    }),
    hospitalWall: new THREE.MeshStandardMaterial({
      map: textures.hospitalFacade,
      roughness: 0.4,
      metalness: 0.2,
    }),
    whiteWall: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6, metalness: 0.1 }),
    creamWall: new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7, metalness: 0.05 }),
    warmSandWall: new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.72, metalness: 0.05 }),
    brickRed: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.75, metalness: 0.08 }),
    roofTerracotta: new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.65, metalness: 0.1 }),
    roofSlate: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.25 }),
    glassBlue: new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      roughness: 0.15,
      metalness: 0.65,
      clearcoat: 0.9,
    }),
    bridgeSteel: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.38, metalness: 0.78 }),
    bridgeSteelLight: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.82 }),
    industrialSteel: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.75 }),
    tankWhite: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42, metalness: 0.55 }),
    rustAccent: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.6 }),
    redCross: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.2,
      roughness: 0.4,
    }),
    smokestackMat: new THREE.MeshStandardMaterial({
      map: textures.smokestackStripe,
      roughness: 0.55,
      metalness: 0.2,
    }),
    helipadMat: new THREE.MeshStandardMaterial({
      map: textures.helipad,
      roughness: 0.6,
      metalness: 0.2,
    }),
    clarifierWaterMat: new THREE.MeshStandardMaterial({
      map: textures.clarifierWater,
      roughness: 0.2,
      metalness: 0.15,
    }),
  };

  // ============================================================================
  // 1. TERRAIN, RIVER CHANNEL, AND NORTHERN RESERVOIR HILLS
  // ============================================================================
  const terrainGroup = new THREE.Group();
  rootGroup.add(terrainGroup);

  // Base riverbed/water table
  const riverBedGeo = new THREE.BoxGeometry(210, 3, 180);
  const riverBed = new THREE.Mesh(riverBedGeo, mats.earthBank);
  riverBed.position.set(0, -1.5, -5);
  riverBed.receiveShadow = true;
  terrainGroup.add(riverBed);

  // River Water Surface
  const waterGeo = new THREE.PlaneGeometry(205, 175, 32, 32);
  const waterMesh = new THREE.Mesh(waterGeo, mats.waterRiver);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, 0.6, -5);
  waterMesh.receiveShadow = true;
  terrainGroup.add(waterMesh);

  // West Bank Landmass (Sculpted Polygon Extrusion)
  const westShape = new THREE.Shape();
  westShape.moveTo(-98, -88);
  westShape.lineTo(6, -88);
  westShape.lineTo(4, -55);
  westShape.lineTo(-2, -32);
  westShape.lineTo(3, -10);
  westShape.lineTo(-5, 12);
  westShape.lineTo(-10, 32);
  westShape.lineTo(-4, 78);
  westShape.lineTo(-98, 78);
  westShape.closePath();

  const landExtrude = {
    steps: 1,
    depth: 2.0,
    bevelEnabled: true,
    bevelThickness: 0.45,
    bevelSize: 0.6,
    bevelSegments: 2,
  };
  const westGeo = new THREE.ExtrudeGeometry(westShape, landExtrude);
  westGeo.rotateX(Math.PI / 2);
  const westLand = new THREE.Mesh(westGeo, mats.grassMain);
  westLand.position.set(0, 2.0, 0);
  westLand.receiveShadow = true;
  westLand.castShadow = true;
  terrainGroup.add(westLand);

  // East Bank Landmass (Downstream of Dam)
  const eastShape = new THREE.Shape();
  eastShape.moveTo(52, -52);
  eastShape.lineTo(98, -52);
  eastShape.lineTo(98, 78);
  eastShape.lineTo(16, 78);
  eastShape.lineTo(14, 46);
  eastShape.lineTo(11, 24);
  eastShape.lineTo(17, 4);
  eastShape.lineTo(20, -16);
  eastShape.lineTo(16, -38);
  eastShape.closePath();

  const eastGeo = new THREE.ExtrudeGeometry(eastShape, landExtrude);
  eastGeo.rotateX(Math.PI / 2);
  const eastLand = new THREE.Mesh(eastGeo, mats.grassMain);
  eastLand.position.set(0, 2.0, 0);
  eastLand.receiveShadow = true;
  eastLand.castShadow = true;
  terrainGroup.add(eastLand);

  // Concrete River Embankment Walls along urban and industrial edges
  const createEmbankment = (pts: [number, number][]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i];
      const [x2, z2] = pts[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, len), mats.concreteMid);
      wall.position.set((x1 + x2) / 2, 1.1, (z1 + z2) / 2);
      wall.rotation.y = Math.atan2(dx, dz);
      wall.receiveShadow = true;
      wall.castShadow = true;
      terrainGroup.add(wall);
    }
  };
  createEmbankment([
    [1, -32],
    [5, -10],
    [-3, 12],
    [-8, 32],
    [-2, 68],
  ]);
  createEmbankment([
    [18, -36],
    [20, -16],
    [17, 4],
    [11, 24],
    [14, 46],
    [16, 68],
  ]);

  // Northern Reservoir Basin & Flanking Hills
  const reservoirWater = new THREE.Mesh(new THREE.BoxGeometry(58, 16, 34), mats.waterRiver);
  reservoirWater.position.set(33, 10.5, -73);
  terrainGroup.add(reservoirWater);

  // Left & Right Mountain Ridges framing the Dam & Reservoir
  const createHill = (x: number, y: number, z: number, rBottom: number, rTop: number, h: number) => {
    const hillGroup = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 9), mats.hillGrass);
    cone.position.y = h / 2;
    cone.castShadow = true;
    cone.receiveShadow = true;
    hillGroup.add(cone);

    const rockOutcrop = new THREE.Mesh(new THREE.DodecahedronGeometry(rTop * 0.65, 0), mats.rockCliff);
    rockOutcrop.position.set(rTop * 0.3, h * 0.6, rTop * 0.2);
    rockOutcrop.scale.set(1.3, 0.8, 1.1);
    hillGroup.add(rockOutcrop);

    hillGroup.position.set(x, y, z);
    terrainGroup.add(hillGroup);
  };

  createHill(4, 2, -62, 15, 7, 23);
  createHill(-12, 2, -74, 22, 10, 28);
  createHill(62, 2, -56, 16, 8, 24);
  createHill(78, 2, -68, 24, 12, 30);
  createHill(75, 2, -38, 16, 8, 16);

  // ============================================================================
  // 2. HYDROELECTRIC DAM & SPILLWAY (Top-Right)
  // ============================================================================
  const damGroup = new THREE.Group();
  damGroup.position.set(32, 0, -55);
  rootGroup.add(damGroup);

  // Main Gravity Dam Wall
  const damWall = new THREE.Mesh(new THREE.BoxGeometry(46, 21.5, 6), mats.concreteMid);
  damWall.position.set(0, 10.75, 0);
  damWall.castShadow = true;
  damWall.receiveShadow = true;
  damGroup.add(damWall);

  // Crest Roadway & Parapet Walls
  const damCrest = new THREE.Mesh(new THREE.BoxGeometry(47, 1.0, 7.2), mats.concreteLight);
  damCrest.position.set(0, 21.5, 0);
  damCrest.castShadow = true;
  damCrest.receiveShadow = true;
  damGroup.add(damCrest);

  const damRoad = new THREE.Mesh(new THREE.BoxGeometry(46, 0.15, 4.6), mats.asphalt);
  damRoad.position.set(0, 22.05, 0);
  damGroup.add(damRoad);

  // Angled Concrete Buttresses across downstream face
  for (let bx = -18; bx <= 18; bx += 6) {
    const buttress = new THREE.Mesh(new THREE.BoxGeometry(2.2, 20, 7), mats.concreteDark);
    buttress.position.set(bx, 10, 3.2);
    buttress.rotation.x = 0.22;
    buttress.castShadow = true;
     buttress.receiveShadow = true;
    damGroup.add(buttress);
  }

  // 3 Spillway Water Chutes & Foam Pool
  for (const sx of [-9, -3, 3]) {
    const chute = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 21, 1, 8), mats.waterFoam);
    chute.position.set(sx, 10.6, 4.9);
    chute.rotation.x = -0.24;
    damGroup.add(chute);
    spillwayMeshes.push(chute);
  }

  // Spillway Splash Foam Basin at base
  const foamPool = new THREE.Mesh(new THREE.CylinderGeometry(11, 12, 0.5, 16), mats.waterFoam);
  foamPool.position.set(-3, 0.7, 9.5);
  foamPool.scale.set(1.4, 1, 0.7);
  damGroup.add(foamPool);

  // Dam Control & Turbine Intake Tower
  const intakeTower = new THREE.Mesh(new THREE.BoxGeometry(5.5, 5.5, 5.5), mats.concreteLight);
  intakeTower.position.set(9, 24.2, -1);
  intakeTower.castShadow = true;
  damGroup.add(intakeTower);

  const intakeGlass = new THREE.Mesh(new THREE.BoxGeometry(5.7, 2.0, 5.7), mats.glassBlue);
  intakeGlass.position.set(9, 25.2, -1);
  damGroup.add(intakeGlass);

  // ============================================================================
  // 3. TWO BRIDGES ACROSS THE RIVER
  // ============================================================================
  // 3A. Main Steel Arch Truss Highway Bridge (Lower-Middle)
  const mainBridge = new THREE.Group();
  mainBridge.position.set(-2, 0, 30);
  mainBridge.rotation.y = -0.18;
  rootGroup.add(mainBridge);

  const bridgeSpan = 30;
  const bridgeWidth = 10;
  const deckY = 4.6;

  // Concrete Bridge Piers in the river
  for (const px of [-9, 9]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6.2, 11.5), mats.concreteMid);
    pier.position.set(px, 2.5, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    mainBridge.add(pier);
  }

  // Bridge Deck & Dual-Lane Asphalt Roadway
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(bridgeSpan, 1.1, bridgeWidth), mats.concreteLight);
  bridgeDeck.position.set(0, deckY, 0);
  bridgeDeck.castShadow = true;
  bridgeDeck.receiveShadow = true;
  mainBridge.add(bridgeDeck);

  const bridgeRoad = new THREE.Mesh(new THREE.BoxGeometry(bridgeSpan, 0.15, bridgeWidth - 1.6), mats.asphalt);
  bridgeRoad.position.set(0, deckY + 0.6, 0);
  mainBridge.add(bridgeRoad);

  // Center Median & Dashed Road Lines on Bridge
  const median = new THREE.Mesh(new THREE.BoxGeometry(bridgeSpan, 0.25, 0.4), mats.concreteMid);
  median.position.set(0, deckY + 0.68, 0);
  mainBridge.add(median);

  // Overhead Steel Truss Arches (North & South sides of deck)
  for (const sideZ of [-bridgeWidth / 2 + 0.4, bridgeWidth / 2 - 0.4]) {
    // Parabolic arch segments
    const numSegs = 8;
    const archSpan = 22;
    const archHeight = 7.2;
    for (let i = 0; i < numSegs; i++) {
      const t1 = i / numSegs - 0.5;
      const t2 = (i + 1) / numSegs - 0.5;
      const x1 = t1 * archSpan;
      const x2 = t2 * archSpan;
      const y1 = deckY + 0.5 + Math.cos(t1 * Math.PI) * archHeight;
      const y2 = deckY + 0.5 + Math.cos(t2 * Math.PI) * archHeight;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const segLen = Math.hypot(dx, dy);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.2, 0.55, 0.55), mats.bridgeSteel);
      beam.position.set((x1 + x2) / 2, (y1 + y2) / 2, sideZ);
      beam.rotation.z = Math.atan2(dy, dx);
      beam.castShadow = true;
      mainBridge.add(beam);

      // Vertical truss hanger post
      if (i > 0) {
        const postH = y1 - (deckY + 0.5);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, postH, 6), mats.bridgeSteelLight);
        post.position.set(x1, deckY + 0.5 + postH / 2, sideZ);
        mainBridge.add(post);
      }
    }
  }

  // Lateral overhead cross-bracing struts connecting the two steel arches
  for (const cx of [-6, -2, 2, 6]) {
    const t = cx / 22;
    const cy = deckY + 0.5 + Math.cos(t * Math.PI) * 7.2;
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, bridgeWidth - 0.8), mats.bridgeSteel);
    crossBeam.position.set(cx, cy, 0);
    crossBeam.castShadow = true;
    mainBridge.add(crossBeam);
  }

  // 3B. Secondary Upstream Arch Bridge (Connecting Civic Center to Industry Zone)
  const northBridge = new THREE.Group();
  northBridge.position.set(6, 0, 10);
  northBridge.rotation.y = -0.12;
  rootGroup.add(northBridge);

  const nbDeck = new THREE.Mesh(new THREE.BoxGeometry(24, 0.9, 5.4), mats.concreteLight);
  nbDeck.position.set(0, 4.0, 0);
  nbDeck.castShadow = true;
  nbDeck.receiveShadow = true;
  northBridge.add(nbDeck);

  const nbRoad = new THREE.Mesh(new THREE.BoxGeometry(24, 0.14, 4.2), mats.asphalt);
  nbRoad.position.set(0, 4.5, 0);
  northBridge.add(nbRoad);

  for (const sz of [-2.4, 2.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(24, 0.65, 0.25), mats.bridgeSteelLight);
    rail.position.set(0, 4.8, sz);
    northBridge.add(rail);
  }

  for (const px of [-6.5, 6.5]) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 4.5, 8), mats.concreteMid);
    pier.position.set(px, 2.0, 0);
    northBridge.add(pier);
  }

  // ============================================================================
  // 4. ROAD NETWORK & INTERSECTIONS
  // ============================================================================
  const roadsGroup = new THREE.Group();
  rootGroup.add(roadsGroup);

  const addRoadSegment = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    width = 5.4,
    hasDashedLine = true
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const segGroup = new THREE.Group();
    segGroup.position.set((x1 + x2) / 2, 2.04, (z1 + z2) / 2);
    segGroup.rotation.y = angle;

    // Sidewalk curb base
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(width + 1.4, 0.14, length + 1.0), mats.concreteLight);
    sidewalk.receiveShadow = true;
    segGroup.add(sidewalk);

    // Asphalt road surface
    const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, length + 0.6), mats.asphalt);
    road.position.y = 0.03;
    road.receiveShadow = true;
    segGroup.add(road);

    // Dashed white center markings
    if (hasDashedLine) {
      const dashCount = Math.floor(length / 4.2);
      for (let i = 0; i < dashCount; i++) {
        const zOff = -length / 2 + 2.2 + i * 4.2;
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.8), mats.roadLine);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, 0.14, zOff);
        segGroup.add(dash);
      }
    }

    roadsGroup.add(segGroup);
  };

  // West Bank Arterial Grid
  addRoadSegment(-86, 42, -16, 33, 7.2); // Southern Highway approach to Main Bridge
  addRoadSegment(-42, -58, -42, 36, 5.6); // West North-South Avenue (Hospital & Residential)
  addRoadSegment(-16, -54, -16, 33, 5.8); // Civic Center North-South Boulevard
  addRoadSegment(-84, -22, -4, -22, 5.4); // North Cross Street
  addRoadSegment(-84, 4, -5, 10, 5.4); // Central Cross Street (connects to Secondary Arch Bridge)
  addRoadSegment(-84, 24, -42, 24, 4.8); // South Residential Street
  addRoadSegment(-66, -54, -66, 38, 4.8); // Far-West Suburban Avenue

  // East Bank Industrial & Drainage Arterial Roads
  addRoadSegment(12, 27, 88, 12, 7.0); // East Highway continuation from Main Bridge
  addRoadSegment(17, 8, 56, -8, 5.2); // Industrial Zone Access Road from Secondary Bridge
  addRoadSegment(56, -34, 56, 38, 5.4); // East Perimeter Road
  addRoadSegment(22, 26, 22, 56, 4.8); // Drainage Facility Access Road

  // ============================================================================
  // 5. HOSPITAL, FIRE STATION & MUNICIPAL CONTROL CENTER
  // ============================================================================
  // 5A. Hospital (Multi-Wing Medical Complex at [-53, 2, -12])
  const hospitalGroup = new THREE.Group();
  hospitalGroup.position.set(-54, 2.0, -11);
  rootGroup.add(hospitalGroup);

  addContactShadow(hospitalGroup, textures.contactShadow, 22, 18, 0, 0, 0);

  // Main Central Tower
  const hospMain = new THREE.Mesh(new THREE.BoxGeometry(14, 9.5, 7), mats.hospitalWall);
  hospMain.position.set(0, 4.75, 0);
  hospMain.castShadow = true;
  hospMain.receiveShadow = true;
  hospitalGroup.add(hospMain);

  // East & West Wings
  const hospWingL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 6.8, 11), mats.hospitalWall);
  hospWingL.position.set(-6.5, 3.4, 2);
  hospWingL.castShadow = true;
  hospWingL.receiveShadow = true;
  hospitalGroup.add(hospWingL);

  const hospWingR = new THREE.Mesh(new THREE.BoxGeometry(5.5, 6.8, 11), mats.hospitalWall);
  hospWingR.position.set(6.5, 3.4, 2);
  hospWingR.castShadow = true;
  hospWingR.receiveShadow = true;
  hospitalGroup.add(hospWingR);

  // Emergency Entrance Canopy
  const hospCanopy = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.6, 3.6), mats.concreteLight);
  hospCanopy.position.set(0, 3.2, 5.0);
  hospCanopy.castShadow = true;
  hospitalGroup.add(hospCanopy);

  // Iconic Red Cross Emblem on Hospital Facade & Roof
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.8, 0.3), mats.redCross);
  crossV.position.set(0, 7.2, 3.6);
  hospitalGroup.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 0.3), mats.redCross);
  crossH.position.set(0, 7.2, 3.6);
  hospitalGroup.add(crossH);

  // Rooftop Helipad / HVAC Penthouse
  const hospRoofBox = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 4), mats.whiteWall);
  hospRoofBox.position.set(0, 10.4, -0.5);
  hospRoofBox.castShadow = true;
  hospitalGroup.add(hospRoofBox);

  // 5B. Municipal Control Center / City Hall ([-10, 2, -9])
  const controlGroup = new THREE.Group();
  controlGroup.position.set(-8, 2.0, -9);
  rootGroup.add(controlGroup);

  addContactShadow(controlGroup, textures.contactShadow, 20, 18, 0, 0, 0);

  // Civic Podium Base
  const civicPodium = new THREE.Mesh(new THREE.BoxGeometry(14, 3.2, 12), mats.concreteLight);
  civicPodium.position.set(0, 1.6, 0);
  civicPodium.castShadow = true;
  civicPodium.receiveShadow = true;
  controlGroup.add(civicPodium);

  // Twin Stepped Glass Control Towers
  const ctrlTowerMain = new THREE.Mesh(new THREE.BoxGeometry(11, 9.5, 8.5), mats.glassBlue);
  ctrlTowerMain.position.set(0, 7.8, 0);
  ctrlTowerMain.castShadow = true;
  controlGroup.add(ctrlTowerMain);

  // Architectural White Frame Fins
  for (const fx of [-5.6, 0, 5.6]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10.0, 9.0), mats.whiteWall);
    fin.position.set(fx, 7.8, 0);
    fin.castShadow = true;
    controlGroup.add(fin);
  }

  // Rooftop Sensor Operations Comms Array & Radar Dome
  const commsBase = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.2, 16), mats.concreteLight);
  commsBase.position.set(0, 13.1, 0);
  controlGroup.add(commsBase);

  const radarDome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), mats.whiteWall);
  radarDome.position.set(-2.5, 13.5, 1.2);
  controlGroup.add(radarDome);

  const antennaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 5.5, 8), mats.bridgeSteelLight);
  antennaMast.position.set(2.2, 15.2, -1.2);
  controlGroup.add(antennaMast);

  // Adjacent Helipad Skyscraper (Matching the `(H)` tower in the reference image)
  const heliTower = new THREE.Group();
  heliTower.position.set(-28, 2.0, -14);
  rootGroup.add(heliTower);
  addContactShadow(heliTower, textures.contactShadow, 12, 12, 0, 0, 0);

  const htBody = new THREE.Mesh(new THREE.BoxGeometry(8.8, 18.5, 8.8), mats.officeWall);
  htBody.position.set(0, 9.25, 0);
  htBody.castShadow = true;
  htBody.receiveShadow = true;
  heliTower.add(htBody);

  const htCrown = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.2, 9.4), mats.concreteLight);
  htCrown.position.set(0, 18.8, 0);
  heliTower.add(htCrown);

  const htPad = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6), mats.helipadMat);
  htPad.rotation.x = -Math.PI / 2;
  htPad.position.set(0, 19.45, 0);
  heliTower.add(htPad);

  // 5C. Fire Station ([-29, 2, 17] with Red Garage Bays & Parked Fire Trucks)
  const fireGroup = new THREE.Group();
  fireGroup.position.set(-29, 2.0, 17);
  rootGroup.add(fireGroup);

  addContactShadow(fireGroup, textures.contactShadow, 18, 14, 0, 0, 1);

  // Concrete Apron Driveway in front of bays
  const fireApron = new THREE.Mesh(new THREE.BoxGeometry(14, 0.16, 12), mats.concreteLight);
  fireApron.position.set(0, 0.08, 2.5);
  fireApron.receiveShadow = true;
  fireGroup.add(fireApron);

  // Main Red-Brick Apparatus Hall
  const fireHall = new THREE.Mesh(new THREE.BoxGeometry(13, 5.8, 8.2), mats.brickRed);
  fireHall.position.set(0, 2.9, -1.2);
  fireHall.castShadow = true;
  fireHall.receiveShadow = true;
  fireGroup.add(fireHall);

  // White Roof Cornice & Drill Hose Tower
  const fireCornice = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.7, 8.8), mats.whiteWall);
  fireCornice.position.set(0, 6.0, -1.2);
  fireGroup.add(fireCornice);

  const hoseTower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 9.5, 3.2), mats.brickRed);
  hoseTower.position.set(-4.5, 4.75, -2.5);
  hoseTower.castShadow = true;
  fireGroup.add(hoseTower);

  // 3 Apparatus Bay Doors + 3 Composite Red Fire Engines
  for (const bx of [-3.8, 0, 3.8]) {
    const bayDoor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 0.3), mats.concreteDark);
    bayDoor.position.set(bx, 1.7, 2.9);
    fireGroup.add(bayDoor);

    // Composite Fire Engine (Cab + Tank Body + White Ladder + Wheels)
    const truck = new THREE.Group();
    truck.position.set(bx, 0.16, 5.2);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 3.4), mats.redCross);
    body.position.set(0, 0.85, 0);
    body.castShadow = true;
    truck.add(body);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.7, 1.1), mats.glassBlue);
    cab.position.set(0, 1.05, 1.25);
    truck.add(cab);

    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 3.0), mats.whiteWall);
    ladder.position.set(0, 1.62, -0.1);
    truck.add(ladder);

    fireGroup.add(truck);
  }

  // ============================================================================
  // 6. COMMERCIAL TOWERS, APARTMENT BLOCKS & RESIDENTIAL NEIGHBORHOODS
  // ============================================================================
  const buildingsGroup = new THREE.Group();
  rootGroup.add(buildingsGroup);

  const createCommercialTower = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    isApartment = false
  ) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 2.0, z);
    addContactShadow(bGroup, textures.contactShadow, w + 3, d + 3, 0, 0, 0);

    // Podium lobby
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 2.2, d + 0.8), mats.concreteLight);
    podium.position.y = 1.1;
    podium.castShadow = true;
    podium.receiveShadow = true;
    bGroup.add(podium);

    // Main shaft
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      isApartment ? mats.aptWall : mats.officeWall
    );
    shaft.position.y = 2.2 + h / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    bGroup.add(shaft);

    // Roof parapet & mechanical penthouse
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.7, d + 0.4), mats.concreteMid);
    roof.position.y = 2.2 + h + 0.35;
    bGroup.add(roof);

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 1.4, d * 0.45), mats.concreteDark);
    hvac.position.y = 2.2 + h + 1.2;
    hvac.castShadow = true;
    bGroup.add(hvac);

    buildingsGroup.add(bGroup);
  };

  // Commercial & Mid-Rise Apartment District (Upper-West & Central-West)
  const commercialSpecs: [number, number, number, number, number, boolean][] = [
    [-28, -32, 7.5, 15, 7.5, false],
    [-28, -46, 7.0, 12, 7.0, true],
    [-12, -32, 8.0, 13, 7.5, false],
    [-8, -46, 7.5, 10, 7.5, true],
    [-52, -34, 7.5, 14, 7.5, true],
    [-52, -48, 7.0, 11, 7.0, true],
    [-36, -62, 6.8, 12, 6.8, true],
    [-22, -62, 7.2, 10, 7.2, false],
    [-28, 2, 7.0, 11, 7.0, false],
    [-16, 20, 6.5, 8.5, 6.5, true],
  ];
  for (const [x, z, w, h, d, isApt] of commercialSpecs) {
    createCommercialTower(x, z, w, h, d, isApt);
  }

  // Suburban Pitched-Roof Residential Houses (Northwest & Southwest Neighborhoods)
  const createSuburbanHouse = (x: number, z: number, rotY = 0, variant = 0) => {
    const hGroup = new THREE.Group();
    hGroup.position.set(x, 2.0, z);
    hGroup.rotation.y = rotY;
    addContactShadow(hGroup, textures.contactShadow, 6.2, 5.6, 0, 0, 0, 0.32);

    const wallMat = variant % 2 === 0 ? mats.creamWall : mats.warmSandWall;
    const roofMat = variant % 3 === 0 ? mats.roofSlate : mats.roofTerracotta;

    // House body
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.8, 3.8), wallMat);
    body.position.y = 1.4;
    body.castShadow = true;
    body.receiveShadow = true;
    hGroup.add(body);

    // Pitched 4-sided pyramid/hip roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.1, 4), roofMat);
    roof.position.y = 2.8 + 1.05;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.12, 1, 0.98);
    roof.castShadow = true;
    hGroup.add(roof);

    // Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.6, 0.55), mats.brickRed);
    chimney.position.set(1.1, 3.6, -0.7);
    hGroup.add(chimney);

    buildingsGroup.add(hGroup);
  };

  const houseCoords: [number, number, number][] = [
    // Northwest residential block
    [-76, -42, 0],
    [-76, -32, 1],
    [-76, -12, 2],
    [-76, -3, 0],
    [-58, -14, 1],
    [-58, -4, 2],
    // West central residential
    [-76, 12, 1],
    [-76, 20, 0],
    // Southwest residential neighborhood (matching lower-left of poster)
    [-76, 32, 0],
    [-66, 32, 2],
    [-56, 32, 1],
    [-76, 48, 1],
    [-66, 48, 0],
    [-54, 46, 2],
    [-42, 46, 1],
    [-54, 16, 0],
  ];
  houseCoords.forEach(([hx, hz, v], idx) => {
    createSuburbanHouse(hx, hz, (idx % 2) * (Math.PI / 2), v);
  });

  // ============================================================================
  // 7. INDUSTRIAL ZONE (East Bank: Factories, Smokestacks, Silos & Storage Tanks)
  // ============================================================================
  const industryGroup = new THREE.Group();
  industryGroup.position.set(0, 2.0, 0);
  rootGroup.add(industryGroup);

  // Concrete Industrial Foundation Pad
  const indPad = new THREE.Mesh(new THREE.BoxGeometry(36, 0.25, 38), mats.concreteMid);
  indPad.position.set(39, 0.12, -2);
  indPad.receiveShadow = true;
  industryGroup.add(indPad);

  // North Refinery & Chemical Process Plant ([34, y, -14])
  const northPlant = new THREE.Mesh(new THREE.BoxGeometry(11, 10.5, 9), mats.concreteDark);
  northPlant.position.set(34, 5.25, -14);
  northPlant.castShadow = true;
  northPlant.receiveShadow = true;
  industryGroup.add(northPlant);

  for (const fx of [30, 34, 38]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 14, 12), mats.industrialSteel);
    tower.position.set(fx, 7.0, -9);
    tower.castShadow = true;
    industryGroup.add(tower);
  }

  // West Factory Assembly Hall ([26, y, -2])
  const westFactory = new THREE.Mesh(new THREE.BoxGeometry(9.5, 6.2, 12), mats.concreteLight);
  westFactory.position.set(26, 3.1, -2);
  westFactory.castShadow = true;
  westFactory.receiveShadow = true;
  industryGroup.add(westFactory);

  // Twin Tall Red-and-White Striped Smokestacks & Boiler House ([37, y, 7])
  const boilerHouse = new THREE.Mesh(new THREE.BoxGeometry(10, 6.8, 8), mats.concreteMid);
  boilerHouse.position.set(37, 3.4, 7);
  boilerHouse.castShadow = true;
  boilerHouse.receiveShadow = true;
  industryGroup.add(boilerHouse);

  for (const [sx, sz, sh] of [
    [35, 9, 16.5],
    [39, 8, 15.0],
    [41, -7, 15.5],
  ]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.45, sh, 16), mats.smokestackMat);
    stack.position.set(sx, sh / 2, sz);
    stack.castShadow = true;
    industryGroup.add(stack);
  }

  // Large Cylindrical Storage Silos / Tanks ([46, y, -4])
  for (const [tx, tz, r, h] of [
    [46, -5, 4.2, 10.2],
    [46, 4.5, 3.8, 9.0],
  ]) {
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mats.tankWhite);
    silo.position.set(tx, h / 2, tz);
    silo.castShadow = true;
    silo.receiveShadow = true;
    industryGroup.add(silo);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      mats.industrialSteel
    );
    dome.position.set(tx, h, tz);
    dome.scale.y = 0.28;
    industryGroup.add(dome);
  }

  // South Pressurized Gas Storage Tanks ([51, y, 10])
  for (const [gx, gz] of [
    [51, 8.5],
    [52, 13.5],
  ]) {
    const gasTank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 6.5, 20), mats.tankWhite);
    gasTank.position.set(gx, 3.25, gz);
    gasTank.castShadow = true;
    industryGroup.add(gasTank);
  }

  // Overhead Industrial Pipe Rack connecting Refinery to Silos
  const pipeRack = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 18, 8), mats.rustAccent);
  pipeRack.rotation.z = Math.PI / 2;
  pipeRack.position.set(40, 6.5, -5);
  industryGroup.add(pipeRack);

  // ============================================================================
  // 8. DRAINAGE & WASTEWATER TREATMENT FACILITY (Lower-Right)
  // ============================================================================
  const drainageGroup = new THREE.Group();
  drainageGroup.position.set(38, 2.0, 42);
  rootGroup.add(drainageGroup);

  // Walled Treatment Compound Base
  const drainPad = new THREE.Mesh(new THREE.BoxGeometry(28, 0.3, 24), mats.concreteLight);
  drainPad.position.set(0, 0.15, 0);
  drainPad.receiveShadow = true;
  drainageGroup.add(drainPad);

  // Perimeter Security Wall
  for (const [wx, wz, ww, wd] of [
    [0, -11.6, 28, 0.7],
    [0, 11.6, 28, 0.7],
    [-13.6, 0, 0.7, 24],
    [13.6, 0, 0.7, 24],
  ]) {
    const pWall = new THREE.Mesh(new THREE.BoxGeometry(ww, 1.8, wd), mats.concreteMid);
    pWall.position.set(wx, 0.9, wz);
    pWall.castShadow = true;
    drainageGroup.add(pWall);
  }

  // Two Circular Clarifier Settling Tanks (with rotating scraper bridges)
  for (const [cx, cz] of [
    [-5.5, 2.8],
    [5.2, 4.2],
  ]) {
    const tankGroup = new THREE.Group();
    tankGroup.position.set(cx, 0.2, cz);

    // Outer concrete ring wall
    const outerRing = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 1.5, 28), mats.concreteMid);
    outerRing.position.y = 0.75;
    outerRing.castShadow = true;
    outerRing.receiveShadow = true;
    tankGroup.add(outerRing);

    // Clarifier Water Disc
    const waterDisc = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 1.58, 28), mats.clarifierWaterMat);
    waterDisc.position.y = 0.76;
    tankGroup.add(waterDisc);

    // Central Pier & Rotating Scraper Arm Bridge
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 2.1, 12), mats.concreteLight);
    pier.position.y = 1.05;
    tankGroup.add(pier);

    const bridgeArm = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, 0.65), mats.bridgeSteelLight);
    bridgeArm.position.y = 1.85;
    bridgeArm.castShadow = true;
    tankGroup.add(bridgeArm);
    clarifierBridges.push(bridgeArm);

    drainageGroup.add(tankGroup);
  }

  // Rectangular Primary Filtration & Aeration Basins + Pump House
  for (const rx of [-5.5, 3.0]) {
    const rectBasin = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.4, 5.2), mats.concreteMid);
    rectBasin.position.set(rx, 0.7, -5.8);
    rectBasin.castShadow = true;
    drainageGroup.add(rectBasin);

    const rectWater = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.48, 4.4), mats.waterRiver);
    rectWater.position.set(rx, 0.72, -5.8);
    drainageGroup.add(rectWater);
  }

  const pumpHouse = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.6, 5.5), mats.whiteWall);
  pumpHouse.position.set(10.0, 1.8, -5.5);
  pumpHouse.castShadow = true;
  drainageGroup.add(pumpHouse);

  // ============================================================================
  // 9. PARKS, INSTANCED TREES, STREETLIGHTS & VEHICLES
  // ============================================================================
  // West Central Park Lawn & Pond ([-50, 2.05, 1])
  const parkLawn = new THREE.Mesh(new THREE.BoxGeometry(16, 0.12, 12), mats.grassPark);
  parkLawn.position.set(-50, 2.05, 1);
  parkLawn.receiveShadow = true;
  rootGroup.add(parkLawn);

  const parkPond = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.16, 16), mats.waterRiver);
  parkPond.position.set(-49, 2.08, 1.5);
  parkPond.scale.set(1.3, 1, 0.85);
  rootGroup.add(parkPond);

  // Instanced Multi-Part Trees (Trunk + Lower Canopy + Upper Canopy)
  const treePositions: [number, number, number, number][] = [
    // Park & Hospital surroundings
    [-55, 2, -2, 1.1],
    [-45, 2, -2, 0.95],
    [-54, 2, 4, 1.05],
    [-45, 2, 5, 1.15],
    [-62, 2, -26, 1.2],
    [-60, 2, -36, 1.0],
    [-64, 2, -18, 1.1],
    // Riverbank greenbelt West
    [-2, 2, -28, 1.15],
    [0, 2, -16, 1.0],
    [-2, 2, 0, 1.1],
    [-8, 2, 20, 0.95],
    [-12, 2, 46, 1.2],
    [-22, 2, 48, 1.1],
    [-32, 2, 52, 1.25],
    [-46, 2, 56, 1.1],
    [-62, 2, 56, 1.0],
    // Riverbank & Industrial buffer East
    [22, 2, -32, 1.1],
    [20, 2, -20, 1.0],
    [16, 2, 16, 1.15],
    [18, 2, 36, 1.05],
    [20, 2, 56, 1.2],
    [32, 2, 60, 1.1],
    [48, 2, 58, 1.25],
    [64, 2, 42, 1.15],
    [66, 2, 24, 1.0],
    [66, 2, 2, 1.2],
    [64, 2, -18, 1.1],
    // Dam & Northern Mountain Forest
    [8, 12, -58, 1.3],
    [4, 15, -64, 1.2],
    [-6, 14, -70, 1.4],
    [58, 12, -54, 1.3],
    [64, 16, -60, 1.25],
    [72, 14, -42, 1.2],
  ];

  const treeCount = treePositions.length;
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 });

  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.42, 1.8, 7), trunkMat, treeCount);
  const canopyLowMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1.65, 2.8, 7), foliageMat, treeCount);
  const canopyTopMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 2.2, 7), foliageMat, treeCount);

  trunkMesh.castShadow = true;
  canopyLowMesh.castShadow = true;
  canopyTopMesh.castShadow = true;

  const dummy = new THREE.Object3D();
  const colorHelper = new THREE.Color();
  const greenShades = [0x15803d, 0x166534, 0x16a34a, 0x3f6212];

  treePositions.forEach(([tx, ty, tz, s], i) => {
    dummy.position.set(tx, ty + 0.9 * s, tz);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, ty + 2.4 * s, tz);
    dummy.updateMatrix();
    canopyLowMesh.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, ty + 3.8 * s, tz);
    dummy.updateMatrix();
    canopyTopMesh.setMatrixAt(i, dummy.matrix);

    colorHelper.setHex(greenShades[i % greenShades.length]);
    canopyLowMesh.setColorAt(i, colorHelper);
    canopyTopMesh.setColorAt(i, colorHelper.clone().offsetHSL(0, 0, 0.05));
  });

  trunkMesh.instanceMatrix.needsUpdate = true;
  canopyLowMesh.instanceMatrix.needsUpdate = true;
  canopyTopMesh.instanceMatrix.needsUpdate = true;
  if (canopyLowMesh.instanceColor) canopyLowMesh.instanceColor.needsUpdate = true;
  if (canopyTopMesh.instanceColor) canopyTopMesh.instanceColor.needsUpdate = true;
  trunkMesh.computeBoundingSphere();
  canopyLowMesh.computeBoundingSphere();
  canopyTopMesh.computeBoundingSphere();

  rootGroup.add(trunkMesh, canopyLowMesh, canopyTopMesh);

  // Streetlights along main avenues and bridges
  const streetlightCoords: [number, number][] = [
    [-39, -38],
    [-39, -18],
    [-39, 0],
    [-39, 18],
    [-19, -38],
    [-19, -18],
    [-19, 0],
    [-19, 18],
    [-55, 36],
    [-35, 34],
    [22, 22],
    [42, 18],
    [53, 6],
    [53, -14],
  ];
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 3.6, 6);
  const lampGeo = new THREE.SphereGeometry(0.32, 8, 8);
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 0.85,
  });

  const polesInst = new THREE.InstancedMesh(poleGeo, mats.bridgeSteel, streetlightCoords.length);
  const lampsInst = new THREE.InstancedMesh(lampGeo, lampMat, streetlightCoords.length);

  streetlightCoords.forEach(([lx, lz], i) => {
    dummy.scale.setScalar(1);
    dummy.position.set(lx, 3.8, lz);
    dummy.updateMatrix();
    polesInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lx, 5.7, lz);
    dummy.updateMatrix();
    lampsInst.setMatrixAt(i, dummy.matrix);
  });
  polesInst.instanceMatrix.needsUpdate = true;
  lampsInst.instanceMatrix.needsUpdate = true;
  polesInst.computeBoundingSphere();
  lampsInst.computeBoundingSphere();
  rootGroup.add(polesInst, lampsInst);

  // Patrol Boat on the Lower River (matching reference image)
  const boatGroup = new THREE.Group();
  boatGroup.position.set(4, 0.72, 52);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 3.4), mats.whiteWall);
  hull.castShadow = true;
  boatGroup.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 1.4), mats.glassBlue);
  cabin.position.set(0, 0.45, -0.2);
  boatGroup.add(cabin);
  rootGroup.add(boatGroup);

  // ============================================================================
  // 10. COLORED PIN-SHAPED SENSOR MARKERS (Green, Blue, Orange, Purple)
  // ============================================================================
  const createSensorPinGroup = (sensor: SensorMarkerData): THREE.Group => {
    const meta = SENSOR_CATEGORIES[sensor.type];
    const pinGroup = new THREE.Group();
    const [sx, sy, sz] = sensor.position;
    pinGroup.position.set(sx, sy, sz);

    const pinColorMat = new THREE.MeshStandardMaterial({
      color: meta.colorInt,
      roughness: 0.25,
      metalness: 0.15,
      emissive: meta.colorInt,
      emissiveIntensity: 0.18,
    });

    // 1. Ground/Mount Anchor Ring
    const ringGeo = new THREE.RingGeometry(0.9, 1.45, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: meta.colorInt,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    pinGroup.add(ring);
    pinRings.push(ring);

    // 1B. Outer Glowing Beacon Ring (Visible & pulsing when calamity triggers)
    const beaconGeo = new THREE.RingGeometry(1.5, 3.4, 32);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: meta.colorInt,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const beaconRing = new THREE.Mesh(beaconGeo, beaconMat);
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.y = 0.12;
    beaconRing.visible = false;
    pinGroup.add(beaconRing);

    // 2. Inverted Cone Pin Stem (Pointing down to exact sensor spot)
    const coneGeo = new THREE.ConeGeometry(1.35, 3.2, 24);
    coneGeo.rotateX(Math.PI); // tip at bottom
    const coneMesh = new THREE.Mesh(coneGeo, pinColorMat);
    coneMesh.position.y = 1.8;
    coneMesh.castShadow = true;
    pinGroup.add(coneMesh);

    // 3. Spherical Pin Head
    const headGeo = new THREE.SphereGeometry(1.65, 24, 20);
    const headMesh = new THREE.Mesh(headGeo, pinColorMat);
    headMesh.position.y = 3.7;
    headMesh.castShadow = true;
    pinGroup.add(headMesh);

    // 3B. 3D Glowing Aura Halo around Pin Head (Visible & pulsing when calamity triggers)
    const haloGeo = new THREE.SphereGeometry(2.55, 24, 20);
    const haloMat = new THREE.MeshBasicMaterial({
      color: meta.colorInt,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowHalo = new THREE.Mesh(haloGeo, haloMat);
    glowHalo.position.y = 3.7;
    glowHalo.visible = false;
    pinGroup.add(glowHalo);

    // 4. Crisp Front & Back Icon Medallions on the Pin Head
    const badgeGeo = new THREE.CircleGeometry(1.32, 24);
    const badgeMat = new THREE.MeshBasicMaterial({
      map: textures.sensorIcons[sensor.type],
    });
    const frontBadge = new THREE.Mesh(badgeGeo, badgeMat);
    frontBadge.position.set(0, 3.7, 1.56);
    pinGroup.add(frontBadge);

    const backBadge = new THREE.Mesh(badgeGeo, badgeMat);
    backBadge.rotation.y = Math.PI;
    backBadge.position.set(0, 3.7, -1.56);
    pinGroup.add(backBadge);

    // 5. Enlarged Invisible Raycast Hit Proxy for effortless clicking
    const hitGeo = new THREE.CylinderGeometry(2.3, 1.5, 6.2, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitProxy = new THREE.Mesh(hitGeo, hitMat);
    hitProxy.position.y = 3.1;
    hitProxy.userData = { sensorId: sensor.id, sensorData: sensor };
    pinGroup.add(hitProxy);
    clickableMeshes.push(hitProxy);

    pinGroup.userData = {
      sensorId: sensor.id,
      sensorData: sensor,
      pinColorMat,
      glowHalo,
      haloMat,
      beaconRing,
      beaconMat,
    };

    return pinGroup;
  };

  for (const sensor of SENSOR_MARKERS) {
    const pin = createSensorPinGroup(sensor);
    sensorPinsMap.set(sensor.id, pin);
    rootGroup.add(pin);
  }

  // ============================================================================
  // 11. 3D CALAMITY VISUALIZATION PLUMES (Gas Leak & Urban Smog)
  // ============================================================================
  const gasHazardGroup = new THREE.Group();
  gasHazardGroup.visible = false;
  const gasPlumeMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  for (const [px, py, pz, r] of [
    [46, 15, -4, 6.5],
    [34, 16, -14, 5.5],
    [37, 19, 7, 6.0],
    [50, 12, 9, 5.0],
    [26, 11, -2, 4.5],
  ]) {
    const plume = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), gasPlumeMat);
    plume.position.set(px, py, pz);
    plume.scale.set(1.2, 0.75, 1.2);
    gasHazardGroup.add(plume);
  }
  rootGroup.add(gasHazardGroup);

  const smogHazardGroup = new THREE.Group();
  smogHazardGroup.visible = false;
  const smogPlumeMat = new THREE.MeshBasicMaterial({
    color: 0x9333ea,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  for (const [sx, sy, sz, rx, rz] of [
    [-18, 9, -34, 14, 12],
    [2, 9, -8, 13, 13],
    [-46, 8, 25, 14, 11],
    [54, 10, 28, 16, 14],
    [38, 18, 2, 18, 16],
  ]) {
    const smogCloud = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), smogPlumeMat);
    smogCloud.position.set(sx, sy, sz);
    smogCloud.scale.set(rx, 3.8, rz);
    smogHazardGroup.add(smogCloud);
  }
  rootGroup.add(smogHazardGroup);

  const dispose = () => {
    rootGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  };

  return {
    rootGroup,
    sensorPinsMap,
    clickableMeshes,
    animatedObjects: {
      waterMesh,
      spillwayMeshes,
      clarifierBridges,
      boatGroup,
      pinRings,
      gasHazardGroup,
      smogHazardGroup,
    },
    dispose,
  };
}
