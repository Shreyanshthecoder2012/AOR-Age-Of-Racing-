import * as THREE from 'three';
import { VELORA_DISTRICTS, DistrictDefinition } from './VeloraWorldData';
import { VeloraCollisionSystem } from './VeloraCollisionSystem';

/**
 * VeloraDistrictBuilder - Generates rich, distinct 3D architecture, landmarks,
 * and environmental details for all 16 districts across the 4,000m x 4,000m map.
 *
 * Each district has a distinct architectural language, silhouette, color palette,
 * and signature landmarks according to the Velora World Design specification.
 */
export class VeloraDistrictBuilder {
  public group: THREE.Group;
  public collisionSystem: VeloraCollisionSystem;
  private animatedElements: Array<{ update: (time: number, delta: number) => void }> = [];

  constructor(collisionSystem: VeloraCollisionSystem) {
    this.group = new THREE.Group();
    this.collisionSystem = collisionSystem;
    this.buildAllDistricts();
  }

  private buildAllDistricts() {
    for (const district of VELORA_DISTRICTS) {
      const districtGroup = new THREE.Group();
      districtGroup.name = `district_${district.id}`;

      switch (district.id) {
        case 'green_heights':
          this.buildGreenHeights(districtGroup, district);
          break;
        case 'downtown_west':
          this.buildDowntownWest(districtGroup, district);
          break;
        case 'downtown_east':
          this.buildDowntownEast(districtGroup, district);
          break;
        case 'elite_hills':
          this.buildEliteHills(districtGroup, district);
          break;
        case 'old_town':
          this.buildOldTown(districtGroup, district);
          break;
        case 'civic_centre':
          this.buildCivicCentre(districtGroup, district);
          break;
        case 'midtown_homes':
          this.buildMidtownHomes(districtGroup, district);
          break;
        case 'luxury_enclave':
          this.buildLuxuryEnclave(districtGroup, district);
          break;
        case 'industrial_zone':
          this.buildIndustrialZone(districtGroup, district);
          break;
        case 'transit_quarter':
          this.buildTransitQuarter(districtGroup, district);
          break;
        case 'housing_colony':
          this.buildHousingColony(districtGroup, district);
          break;
        case 'commercial_district':
          this.buildCommercialDistrict(districtGroup, district);
          break;
        case 'outer_suburbs':
          this.buildOuterSuburbs(districtGroup, district);
          break;
        case 'riverfront':
          this.buildRiverfront(districtGroup, district);
          break;
        case 'bridge_district':
          this.buildBridgeDistrict(districtGroup, district);
          break;
        case 'highway_outskirts':
          this.buildHighwayOutskirts(districtGroup, district);
          break;
      }

      this.group.add(districtGroup);
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 01: GREEN HEIGHTS (Quiet residential, G1-G4 homes, Central Park)
  // -------------------------------------------------------------
  private buildGreenHeights(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Central Neighborhood Park (200m x 200m)
    const parkGeo = new THREE.PlaneGeometry(220, 220);
    parkGeo.rotateX(-Math.PI / 2);
    const parkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
    const parkMesh = new THREE.Mesh(parkGeo, parkMat);
    parkMesh.position.set(cx, 0.12, cz);
    group.add(parkMesh);

    // Park trees & playground
    this.addParkTrees(group, cx, cz, 40, 95);

    // Community Clubhouse in park
    const clubhouse = this.createPitchedHouse(24, 12, 14, 0xfef08a, 0x991b1b, 'Community Clubhouse');
    clubhouse.position.set(cx, 0, cz);
    group.add(clubhouse);
    this.collisionSystem.registerBox('Community Clubhouse', cx, cz, 24, 14, 12, true, clubhouse);

    // 2. G1-G4 Residential Homes along streets
    const houseColors = [
      { wall: 0xfef3c7, roof: 0xb45309 }, // G1: Cream + terracotta sloped
      { wall: 0xf8fafc, roof: 0x334155 }, // G2: Modern white + charcoal
      { wall: 0xd6d3d1, roof: 0x44403c }, // G3: Beige + dark brown
      { wall: 0xfef9c3, roof: 0xca8a04 }, // G4: Pale yellow + white
    ];

    // Grid of homes around the park
    for (let x = -380; x <= 380; x += 110) {
      for (let z = -380; z <= 380; z += 110) {
        if (Math.abs(x) < 140 && Math.abs(z) < 140) continue; // Skip park center

        const col = houseColors[Math.abs(x + z) % houseColors.length];
        const isModern = Math.random() > 0.45;
        const hMesh = isModern
          ? this.createModernFlatHouse(16, 10, 14, col.wall, col.roof)
          : this.createPitchedHouse(16, 9, 14, col.wall, col.roof);

        const hx = cx + x + (Math.random() - 0.5) * 15;
        const hz = cz + z + (Math.random() - 0.5) * 15;
        hMesh.position.set(hx, 0, hz);
        hMesh.rotation.y = (Math.floor(Math.random() * 4) * Math.PI) / 2;
        group.add(hMesh);
        this.collisionSystem.registerBox('Residential Home', hx, hz, 16, 14, 9, true, hMesh);

        // Garden tree next to house
        if (Math.random() > 0.3) {
          this.addSingleAnimeTree(group, cx + x + 12, cz + z + 10, 6 + Math.random() * 3);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 02: DOWNTOWN WEST (Velora Financial Tower, Meridian, Orion)
  // -------------------------------------------------------------
  private buildDowntownWest(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Velora Financial Tower (32 floors, 135m tall, soaring glass skyscraper)
    const finTower = this.createGlassSkyscraper(42, 135, 42, 0x1e3a8a, 0x38bdf8, 'VELORA FINANCIAL');
    finTower.position.set(cx - 80, 0, cz - 60);
    group.add(finTower);
    this.collisionSystem.registerBox('Velora Financial Tower', cx - 80, cz - 60, 42, 42, 135, false, finTower);

    // Rooftop beacon animation
    const beaconGeo = new THREE.SphereGeometry(1.8, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(cx - 80, 136, cz - 60);
    group.add(beacon);
    this.animatedElements.push({
      update: (time) => {
        beaconMat.opacity = Math.sin(time * 3.5) > 0 ? 1 : 0.2;
      },
    });

    // 2. Meridian Tower (24 floors, 95m tall, rectangular grey/blue)
    const meridian = this.createOfficeTower(36, 95, 30, 0x334155, 0x93c5fd);
    meridian.position.set(cx + 90, 0, cz - 80);
    group.add(meridian);
    this.collisionSystem.registerBox('Meridian Tower', cx + 90, cz - 80, 36, 30, 95, false, meridian);

    // 3. Orion Business Centre (18 floors twin towers with skybridge)
    const orion1 = this.createOfficeTower(26, 75, 26, 0x0f172a, 0x38bdf8);
    orion1.position.set(cx - 90, 0, cz + 100);
    const orion2 = this.createOfficeTower(26, 75, 26, 0x0f172a, 0x38bdf8);
    orion2.position.set(cx - 45, 0, cz + 100);
    const skybridge = new THREE.Mesh(
      new THREE.BoxGeometry(22, 7, 10),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, metalness: 0.9 })
    );
    skybridge.position.set(cx - 67.5, 52, cz + 100);
    group.add(orion1);
    group.add(orion2);
    group.add(skybridge);
    this.collisionSystem.registerBox('Orion Business Centre A', cx - 90, cz + 100, 26, 26, 75, false, orion1);
    this.collisionSystem.registerBox('Orion Business Centre B', cx - 45, cz + 100, 26, 26, 75, false, orion2);

    // 4. Central Plaza Commercial Complex (12 floors)
    const plaza = this.createGlassSkyscraper(55, 48, 50, 0x1e293b, 0xfde047, 'CENTRAL PLAZA');
    plaza.position.set(cx + 80, 0, cz + 90);
    group.add(plaza);
    this.collisionSystem.registerBox('Central Plaza', cx + 80, cz + 90, 55, 50, 48, false, plaza);

    // 5. Surrounding corporate skyline blocks
    for (let x = -350; x <= 350; x += 140) {
      for (let z = -350; z <= 350; z += 140) {
        if (Math.abs(x) < 120 && Math.abs(z) < 120) continue;
        const height = 45 + Math.random() * 55;
        const tower = this.createOfficeTower(28, height, 28, 0x1e293b, 0x60a5fa);
        tower.position.set(cx + x, 0, cz + z);
        group.add(tower);
        this.collisionSystem.registerBox('Corporate Tower', cx + x, cz + z, 28, 28, height, false, tower);
      }
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 03: DOWNTOWN EAST (Velora Grand Mall, Crystal Tower, Nova Cinema)
  // -------------------------------------------------------------
  private buildDowntownEast(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Velora Grand Mall (5 floors, 120m long, white & bronze glass atrium)
    const mallGeo = new THREE.BoxGeometry(110, 26, 70);
    const mallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.4 });
    const mall = new THREE.Mesh(mallGeo, mallMat);
    mall.position.set(cx - 60, 13, cz - 40);
    group.add(mall);
    this.collisionSystem.registerBox('Velora Grand Mall', cx - 60, cz - 40, 110, 70, 26, false, mall);

    // Mall Glass Atrium & Glowing Entrance
    const atrium = new THREE.Mesh(
      new THREE.BoxGeometry(70, 22, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, emissive: 0x0284c7, emissiveIntensity: 0.4 })
    );
    atrium.position.set(cx - 60, 12, cz - 3);
    group.add(atrium);

    // 2. Crystal Business Tower (28 floors, 115m tall, blue reflective glass)
    const crystal = this.createGlassSkyscraper(38, 115, 38, 0x0284c7, 0x7dd3fc, 'CRYSTAL TOWER');
    crystal.position.set(cx + 85, 0, cz - 60);
    group.add(crystal);
    this.collisionSystem.registerBox('Crystal Business Tower', cx + 85, cz - 60, 38, 38, 115, false, crystal);

    // 3. Nova Cinema (4 floors, red & black facade with giant LED billboards)
    const cinema = new THREE.Mesh(
      new THREE.BoxGeometry(60, 22, 50),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    cinema.position.set(cx - 70, 11, cz + 100);
    group.add(cinema);
    this.collisionSystem.registerBox('Nova Cinema', cx - 70, cz + 100, 60, 50, 22, false, cinema);

    // Giant Illuminated Billboard
    const billboard = this.createGlowingBillboard(34, 14, 0xf43f5e, 'NOVA CINEMA · IMAX 3D');
    billboard.position.set(cx - 70, 22, cz + 74);
    group.add(billboard);

    // 4. City Convention Centre (Curved Roof)
    const convGeo = new THREE.CylinderGeometry(40, 40, 24, 24, 1, false, 0, Math.PI);
    convGeo.rotateZ(Math.PI / 2);
    const convMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const conv = new THREE.Mesh(convGeo, convMat);
    conv.position.set(cx + 80, 12, cz + 90);
    group.add(conv);
    this.collisionSystem.registerBox('City Convention Centre', cx + 80, cz + 90, 80, 50, 24, false, conv);

    // Public Fountain Plaza in Downtown East
    this.createPublicFountain(group, cx, cz + 20, 18);
    this.collisionSystem.registerCircle('East Fountain Basin', cx, cz + 20, 18, 2, false);
  }

  // -------------------------------------------------------------
  // DISTRICT 04: ELITE HILLS (Elevated Mansions E1-E5, Tennis Club, Overlook)
  // -------------------------------------------------------------
  private buildEliteHills(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // Viewpoint Deck overlooking Downtown skyline
    const deckGeo = new THREE.BoxGeometry(45, 2, 35);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(cx - 120, 36, cz - 120);
    group.add(deck);
    this.collisionSystem.registerBox('Skyline Viewpoint Deck', cx - 120, cz - 120, 45, 35, 3, false, deck);

    // Railing
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(44, 1.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 })
    );
    rail.position.set(cx - 120, 37.6, cz - 137);
    group.add(rail);

    // Tennis Court
    const tennisGeo = new THREE.PlaneGeometry(36, 22);
    tennisGeo.rotateX(-Math.PI / 2);
    const tennisMat = new THREE.MeshStandardMaterial({ color: 0x059669 });
    const tennis = new THREE.Mesh(tennisGeo, tennisMat);
    tennis.position.set(cx + 80, 32.1, cz - 70);
    group.add(tennis);

    // Luxury Mansions E1-E5 on the hill
    const mansionPositions = [
      { x: -70, z: -40, style: 'E1', col: 0xffffff, roof: 0x0f172a }, // Minimalist
      { x: 50, z: 20, style: 'E2', col: 0xfef3c7, roof: 0x9a3412 },  // Mediterranean
      { x: -90, z: 80, style: 'E3', col: 0x94a3b8, roof: 0x38bdf8 },  // Glass front
      { x: 80, z: 120, style: 'E4', col: 0xd6d3d1, roof: 0x292524 }, // Contemporary
      { x: -20, z: 160, style: 'E5', col: 0x78716c, roof: 0x1c1917 }, // Japanese modern
    ];

    for (const m of mansionPositions) {
      const mansion = this.createLuxuryMansion(28, 14, 22, m.col, m.roof);
      mansion.position.set(cx + m.x, 30, cz + m.z);
      group.add(mansion);
      this.collisionSystem.registerBox('Elite Luxury Mansion ' + m.style, cx + m.x, cz + m.z, 28, 22, 14, true, mansion);

      // Private pool
      const poolGeo = new THREE.PlaneGeometry(16, 9);
      poolGeo.rotateX(-Math.PI / 2);
      const poolMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.8 });
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.position.set(cx + m.x + 18, 30.1, cz + m.z);
      group.add(pool);

      // Palm & pine trees
      this.addSingleAnimeTree(group, cx + m.x - 16, cz + m.z, 9);
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 05: OLD TOWN (Narrow streets, traditional 3F houses, clocktower)
  // -------------------------------------------------------------
  private buildOldTown(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Old Town Historical Clocktower (38m tall, stone & copper roof)
    const towerGeo = new THREE.BoxGeometry(10, 38, 10);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(cx, 19, cz);
    group.add(tower);
    this.collisionSystem.registerBox('Old Town Clocktower', cx, cz, 10, 10, 45, false, tower);

    // Copper Roof
    const roofGeo = new THREE.ConeGeometry(8, 10, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(cx, 43, cz);
    group.add(roof);

    // Glowing clock face
    const clockGeo = new THREE.CircleGeometry(2.2, 16);
    const clockMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const clock = new THREE.Mesh(clockGeo, clockMat);
    clock.position.set(cx, 32, cz + 5.1);
    group.add(clock);

    // 2. Traditional dense row houses with tiled roofs & tea shop lanterns
    for (let x = -320; x <= 320; x += 65) {
      for (let z = -320; z <= 320; z += 75) {
        if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;

        const h = this.createOldTownHouse(15, 12, 16, 0x44403c, 0x991b1b);
        h.position.set(cx + x, 0, cz + z);
        group.add(h);
        this.collisionSystem.registerBox('Old Town House', cx + x, cz + z, 15, 16, 12, true, h);

        // Warm paper lantern glow
        const lanternGeo = new THREE.BoxGeometry(0.8, 1.4, 0.8);
        const lanternMat = new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xf97316,
          emissiveIntensity: 0.8,
        });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(cx + x + 8, 3.2, cz + z + 8);
        group.add(lantern);
      }
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 06: CIVIC CENTRE (City Hall, Police HQ, Grand Civic Fountain)
  // -------------------------------------------------------------
  private buildCivicCentre(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Velora City Hall (6 floors, Neoclassical modern with grand colonnade)
    const hallGeo = new THREE.BoxGeometry(90, 30, 45);
    const hallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
    const cityHall = new THREE.Mesh(hallGeo, hallMat);
    cityHall.position.set(cx, 15, cz - 90);
    group.add(cityHall);
    this.collisionSystem.registerBox('Velora City Hall', cx, cz - 90, 90, 45, 30, false, cityHall);

    // Columns
    for (let c = -35; c <= 35; c += 10) {
      const colGeo = new THREE.CylinderGeometry(1.2, 1.2, 22, 12);
      const colMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.set(cx + c, 11, cz - 66);
      group.add(colMesh);
    }

    // 2. Central Civic Plaza & Grand Fountain
    const plazaGeo = new THREE.PlaneGeometry(120, 100);
    plazaGeo.rotateX(-Math.PI / 2);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(cx, 0.12, cz - 10);
    group.add(plaza);

    this.createPublicFountain(group, cx, cz - 10, 24);
    this.collisionSystem.registerCircle('Central Civic Fountain', cx, cz - 10, 24, 2, false);

    // 3. Velora Police HQ & Justice Courthouse
    const policeHQ = this.createOfficeTower(45, 42, 38, 0x1e293b, 0x38bdf8);
    policeHQ.position.set(cx - 120, 0, cz + 70);
    group.add(policeHQ);
    this.collisionSystem.registerBox('Velora Police HQ', cx - 120, cz + 70, 45, 38, 42, false, policeHQ);

    const museum = this.createPitchedHouse(55, 20, 35, 0xe2e8f0, 0x334155, 'VELORA MUSEUM OF ART');
    museum.position.set(cx + 120, 0, cz + 70);
    group.add(museum);
    this.collisionSystem.registerBox('Velora Museum of Art', cx + 120, cz + 70, 55, 35, 20, false, museum);
  }

  // -------------------------------------------------------------
  // DISTRICT 07: MIDTOWN HOMES (Apartments 3-7F, School, Velora Arena)
  // -------------------------------------------------------------
  private buildMidtownHomes(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Velora Arena Stadium (Iconic circular sports dome)
    const arenaGeo = new THREE.CylinderGeometry(65, 75, 26, 32);
    const arenaMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.5 });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.position.set(cx - 100, 13, cz - 80);
    group.add(arena);
    this.collisionSystem.registerCircle('Velora Arena Stadium', cx - 100, cz - 80, 75, 26, false, arena);

    // Glowing stadium rim
    const rimGeo = new THREE.TorusGeometry(67, 1.8, 12, 32);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.8 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(cx - 100, 26, cz - 80);
    group.add(rim);

    // 2. Midtown School & Running Track
    const school = this.createOfficeTower(40, 16, 25, 0xfef08a, 0x475569);
    school.position.set(cx + 110, 0, cz - 80);
    group.add(school);
    this.collisionSystem.registerBox('Midtown Central School', cx + 110, cz - 80, 40, 25, 16, false, school);

    // 3. Medium-rise residential apartment blocks (4-7 floors)
    for (let x = -300; x <= 300; x += 120) {
      for (let z = 10; z <= 320; z += 110) {
        const floors = 4 + Math.floor(Math.random() * 4);
        const apt = this.createApartmentBlock(32, floors * 3.8, 24, 0xf1f5f9, 0xf97316);
        apt.position.set(cx + x, 0, cz + z);
        group.add(apt);
        this.collisionSystem.registerBox('Midtown Apartment Block', cx + x, cz + z, 32, 24, floors * 3.8, false, apt);
      }
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 08: LUXURY ENCLAVE (Gated community, roundabouts, blue glass)
  // -------------------------------------------------------------
  private buildLuxuryEnclave(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // Landscaped Roundabout with Obelisk
    const roundGeo = new THREE.CylinderGeometry(25, 25, 0.6, 24);
    const roundMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
    const roundabout = new THREE.Mesh(roundGeo, roundMat);
    roundabout.position.set(cx, 0.3, cz);
    group.add(roundabout);
    this.collisionSystem.registerCircle('Enclave Roundabout Island', cx, cz, 25, 1, false);

    // Central Obelisk
    const obGeo = new THREE.CylinderGeometry(0.8, 2.2, 28, 4);
    const obMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const obelisk = new THREE.Mesh(obGeo, obMat);
    obelisk.position.set(cx, 14, cz);
    group.add(obelisk);
    this.collisionSystem.registerCircle('Enclave Monument Obelisk', cx, cz, 2.5, 28, false, obelisk);

    // Contemporary duplex villas & blue glass penthouses
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 140;
      const vx = cx + Math.cos(angle) * dist;
      const vz = cz + Math.sin(angle) * dist;

      const villa = this.createLuxuryMansion(26, 16, 20, 0xf8fafc, 0x0284c7);
      villa.position.set(vx, 0, vz);
      villa.rotation.y = -angle + Math.PI / 2;
      group.add(villa);
      this.collisionSystem.registerBox('Enclave Luxury Villa', vx, vz, 26, 20, 16, true, villa);

      this.addSingleAnimeTree(group, vx + 16, vz + 12, 8);
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 09: INDUSTRIAL ZONE (Steel mills, oil tanks, warehouses)
  // -------------------------------------------------------------
  private buildIndustrialZone(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Cylindrical Petrochemical Oil Tanks (4 large tanks)
    const tankGeo = new THREE.CylinderGeometry(18, 18, 16, 24);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.6 });

    const tankOffsets = [
      { x: -90, z: -90 },
      { x: -50, z: -90 },
      { x: -90, z: -50 },
      { x: -50, z: -50 },
    ];
    for (const off of tankOffsets) {
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(cx + off.x, 8, cz + off.z);
      group.add(tank);
      this.collisionSystem.registerCircle('Petrochemical Oil Tank', cx + off.x, cz + off.z, 18, 16, false, tank);
    }

    // 2. Velora Steel Mill & Chimney Stacks
    const millGeo = new THREE.BoxGeometry(85, 24, 60);
    const millMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const mill = new THREE.Mesh(millGeo, millMat);
    mill.position.set(cx + 80, 12, cz - 60);
    group.add(mill);
    this.collisionSystem.registerBox('Velora Steel Mill', cx + 80, cz - 60, 85, 60, 24, false, mill);

    // 2 Tall Smokestacks
    for (const sx of [60, 100]) {
      const stackGeo = new THREE.CylinderGeometry(2.5, 4.5, 52, 16);
      const stackMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
      const stack = new THREE.Mesh(stackGeo, stackMat);
      stack.position.set(cx + sx, 26, cz - 60);
      group.add(stack);
      this.collisionSystem.registerCircle('Steel Mill Smokestack', cx + sx, cz - 60, 4.5, 52, false, stack);
    }

    // 3. Logistics Warehouses & Loading Bays
    for (let z = 40; z <= 240; z += 90) {
      const whGeo = new THREE.BoxGeometry(90, 14, 45);
      const whMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
      const wh = new THREE.Mesh(whGeo, whMat);
      wh.position.set(cx, 7, cz + z);
      group.add(wh);
      this.collisionSystem.registerBox('Logistics Warehouse', cx, cz + z, 90, 45, 14, false, wh);
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 10: TRANSIT QUARTER (Velora Central Railway Station, Bus Bays)
  // -------------------------------------------------------------
  private buildTransitQuarter(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Velora Grand Central Station (Arched glass canopy, clock facade)
    const stationGeo = new THREE.BoxGeometry(130, 28, 65);
    const stationMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
    const station = new THREE.Mesh(stationGeo, stationMat);
    station.position.set(cx, 14, cz - 60);
    group.add(station);
    this.collisionSystem.registerBox('Velora Grand Central Station', cx, cz - 60, 130, 65, 28, false, station);

    // Grand Arched Glass Canopy
    const archGeo = new THREE.CylinderGeometry(40, 40, 90, 24, 1, false, 0, Math.PI);
    archGeo.rotateZ(Math.PI / 2);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.75,
      metalness: 0.9,
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(cx, 18, cz + 10);
    group.add(arch);

    // 2. Intercity Bus Terminal Bays
    const bayGeo = new THREE.BoxGeometry(110, 6, 25);
    const bayMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.set(cx, 3, cz + 110);
    group.add(bay);
    this.collisionSystem.registerBox('Intercity Bus Terminal', cx, cz + 110, 110, 25, 6, false, bay);
  }

  // -------------------------------------------------------------
  // DISTRICT 11: HOUSING COLONY (AOR Colony, 94+ homes, central garden 100x80m)
  // -------------------------------------------------------------
  private buildHousingColony(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Colony Central Garden (100m x 80m)
    const gardenGeo = new THREE.PlaneGeometry(120, 90);
    gardenGeo.rotateX(-Math.PI / 2);
    const gardenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
    const garden = new THREE.Mesh(gardenGeo, gardenMat);
    garden.position.set(cx, 0.12, cz);
    group.add(garden);

    this.addParkTrees(group, cx, cz, 30, 45);

    // Colony Clinic & High School
    const clinic = this.createPitchedHouse(26, 12, 18, 0xf8fafc, 0xd97706, 'COLONY CLINIC');
    clinic.position.set(cx + 80, 0, cz);
    group.add(clinic);
    this.collisionSystem.registerBox('Colony Clinic', cx + 80, cz, 26, 18, 12, true, clinic);

    // 2. AOR Colony H01-H12 Homes
    const colonyColors = [
      { wall: 0xfef3c7, roof: 0xb45309 },
      { wall: 0xffedd5, roof: 0xc2410c },
      { wall: 0xf3f4f6, roof: 0x374151 },
      { wall: 0xfef9c3, roof: 0xca8a04 },
    ];

    for (let x = -340; x <= 340; x += 85) {
      for (let z = -340; z <= 340; z += 85) {
        if (Math.abs(x) < 80 && Math.abs(z) < 70) continue; // Skip central garden

        const col = colonyColors[Math.abs(x + z) % colonyColors.length];
        const h = this.createPitchedHouse(16, 8.5, 14, col.wall, col.roof);
        h.position.set(cx + x, 0, cz + z);
        group.add(h);
        this.collisionSystem.registerBox('Colony Home', cx + x, cz + z, 16, 14, 9, true, h);
      }
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 12: COMMERCIAL DISTRICT (AOR Motors Showroom, Mega Bazaar)
  // -------------------------------------------------------------
  private buildCommercialDistrict(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. AOR Motors Flagship Showroom (Cylindrical Glass Showcase with display car)
    const showroomGeo = new THREE.CylinderGeometry(24, 24, 14, 24);
    const showroomMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.7,
      metalness: 0.9,
    });
    const showroom = new THREE.Mesh(showroomGeo, showroomMat);
    showroom.position.set(cx - 70, 7, cz - 60);
    group.add(showroom);
    this.collisionSystem.registerCircle('AOR Motors Flagship Showroom', cx - 70, cz - 60, 24, 14, false, showroom);

    // Billboard for AOR Motors
    const aorSign = this.createGlowingBillboard(28, 8, 0x38bdf8, 'AOR MOTORS · FLAGSHIP');
    aorSign.position.set(cx - 70, 16, cz - 60);
    group.add(aorSign);

    // 2. Mega Electronics Bazaar
    const elecGeo = new THREE.BoxGeometry(80, 24, 50);
    const elecMat = new THREE.MeshStandardMaterial({ color: 0x6b21a8 });
    const elec = new THREE.Mesh(elecGeo, elecMat);
    elec.position.set(cx + 80, 12, cz - 60);
    group.add(elec);
    this.collisionSystem.registerBox('Mega Electronics Bazaar', cx + 80, cz - 60, 80, 50, 24, false, elec);

    // 3. Retail Shopping strips
    for (let z = 30; z <= 240; z += 90) {
      const storeGeo = new THREE.BoxGeometry(100, 16, 35);
      const storeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const store = new THREE.Mesh(storeGeo, storeMat);
      store.position.set(cx, 8, cz + z);
      group.add(store);
      this.collisionSystem.registerBox('Commercial Retail Block', cx, cz + z, 100, 35, 16, false, store);
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 13: OUTER SUBURBS (Farmhouses, windmill, agricultural fields)
  // -------------------------------------------------------------
  private buildOuterSuburbs(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Agricultural Farmland Patches (Golden wheat & green crops)
    const farmColors = [0xca8a04, 0x65a30d, 0x15803d, 0x854d0e];
    for (let x = -280; x <= 280; x += 140) {
      for (let z = -280; z <= 280; z += 140) {
        const patchGeo = new THREE.PlaneGeometry(120, 120);
        patchGeo.rotateX(-Math.PI / 2);
        const col = farmColors[Math.abs(x + z) % farmColors.length];
        const patchMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 });
        const patch = new THREE.Mesh(patchGeo, patchMat);
        patch.position.set(cx + x, 0.1, cz + z);
        group.add(patch);
      }
    }

    // 2. Rustic Farmhouses & Red Barns
    const barn = this.createPitchedHouse(26, 14, 18, 0x991b1b, 0xffffff, 'RED BARN');
    barn.position.set(cx - 80, 0, cz - 40);
    group.add(barn);
    this.collisionSystem.registerBox('Red Barn Farmhouse', cx - 80, cz - 40, 26, 18, 14, true, barn);

    // 3. Classic Windmill with spinning sails
    const millBaseGeo = new THREE.CylinderGeometry(5, 7, 26, 8);
    const millBaseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const windmillBase = new THREE.Mesh(millBaseGeo, millBaseMat);
    windmillBase.position.set(cx + 90, 13, cz + 60);
    group.add(windmillBase);
    this.collisionSystem.registerCircle('Classic Windmill', cx + 90, cz + 60, 7, 26, false, windmillBase);

    // Windmill Sails Group
    const sailsGroup = new THREE.Group();
    sailsGroup.position.set(cx + 90, 24, cz + 67.5);
    for (let s = 0; s < 4; s++) {
      const sailMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 22, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x78716c })
      );
      sailMesh.rotation.z = (s * Math.PI) / 2;
      sailsGroup.add(sailMesh);
    }
    group.add(sailsGroup);

    this.animatedElements.push({
      update: (_time, delta) => {
        sailsGroup.rotation.z += delta * 0.8;
      },
    });
  }

  // -------------------------------------------------------------
  // DISTRICT 14: RIVERFRONT (Waterfront promenade, marina docks, cafes)
  // -------------------------------------------------------------
  private buildRiverfront(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // Waterfront Wooden Boardwalk (300m long)
    const walkGeo = new THREE.PlaneGeometry(340, 35);
    walkGeo.rotateX(-Math.PI / 2);
    const walkMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7 });
    const walk = new THREE.Mesh(walkGeo, walkMat);
    walk.position.set(cx, 0.25, cz + 60);
    group.add(walk);

    // Glass Cafe Pavilions & viewing decks
    for (const offX of [-100, 0, 100]) {
      const cafe = new THREE.Mesh(
        new THREE.BoxGeometry(22, 7, 16),
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          transparent: true,
          opacity: 0.8,
          metalness: 0.8,
        })
      );
      cafe.position.set(cx + offX, 3.8, cz + 60);
      group.add(cafe);
      this.collisionSystem.registerBox('Waterfront Glass Cafe', cx + offX, cz + 60, 22, 16, 7, true, cafe);
    }

    // Waterfront Palm Trees
    for (let x = -150; x <= 150; x += 30) {
      this.addSingleAnimeTree(group, cx + x, cz + 40, 8);
    }
  }

  // -------------------------------------------------------------
  // DISTRICT 15: BRIDGE DISTRICT (Velora Grand Bridge 600m, Towers, Lighthouse)
  // -------------------------------------------------------------
  private buildBridgeDistrict(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Velora Grand Bridge Suspension Towers (Two massive 75m towers)
    for (const tz of [cz - 150, cz + 150]) {
      const towerGroup = new THREE.Group();
      const towerMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.2 });

      // Left & Right steel pillars
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 75, 4), towerMat);
      p1.position.set(cx - 12, 37.5, tz);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 75, 4), towerMat);
      p2.position.set(cx + 12, 37.5, tz);

      // Crossbeams
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(28, 3, 3), towerMat);
      cross1.position.set(cx, 65, tz);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(28, 3, 3), towerMat);
      cross2.position.set(cx, 40, tz);

      towerGroup.add(p1);
      towerGroup.add(p2);
      towerGroup.add(cross1);
      towerGroup.add(cross2);
      group.add(towerGroup);
      this.collisionSystem.registerBox('Grand Bridge Suspension Tower', cx, tz, 28, 6, 75, false, towerGroup);
    }

    // 2. South Pier Lighthouse
    const lightGeo = new THREE.CylinderGeometry(3.5, 6, 32, 16);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const lighthouse = new THREE.Mesh(lightGeo, lightMat);
    lighthouse.position.set(cx + 140, 16, cz + 200);
    group.add(lighthouse);
    this.collisionSystem.registerCircle('South Pier Lighthouse', cx + 140, cz + 200, 6, 32, false, lighthouse);

    // Glowing revolving beacon
    const lampGeo = new THREE.SphereGeometry(2.5, 12, 12);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(cx + 140, 33, cz + 200);
    group.add(lamp);
  }

  // -------------------------------------------------------------
  // DISTRICT 16: HIGHWAY OUTSKIRTS (Cloverleaf, 24h Truck Stop Diner)
  // -------------------------------------------------------------
  private buildHighwayOutskirts(group: THREE.Group, d: DistrictDefinition) {
    const cx = d.centerX;
    const cz = d.centerZ;

    // 1. Velora 24h Truck Stop & Diner
    const dinerGeo = new THREE.BoxGeometry(45, 9, 28);
    const dinerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.7, roughness: 0.2 });
    const diner = new THREE.Mesh(dinerGeo, dinerMat);
    diner.position.set(cx - 80, 4.5, cz - 60);
    group.add(diner);
    this.collisionSystem.registerBox('Velora 24H Diner', cx - 80, cz - 60, 45, 28, 9, false, diner);

    // Retro Neon Diner Sign
    const sign = this.createGlowingBillboard(24, 7, 0xf59e0b, 'VELORA 24H DINER');
    sign.position.set(cx - 80, 12, cz - 60);
    group.add(sign);

    // 2. Expressway Maintenance Depot & Fuel Canopy
    const canopyGeo = new THREE.BoxGeometry(60, 2, 35);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(cx + 80, 7.5, cz + 60);
    group.add(canopy);
    this.collisionSystem.registerBox('Expressway Maintenance Canopy', cx + 80, cz + 60, 60, 35, 8, false, canopy);

    // Canopy Pillars
    for (const px of [60, 100]) {
      for (const pz of [50, 70]) {
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 7.5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        pil.position.set(cx + px - 80, 3.75, cz + pz);
        group.add(pil);
      }
    }
  }

  // -------------------------------------------------------------
  // REUSABLE ARCHITECTURAL HELPER BUILDERS
  // -------------------------------------------------------------
  private createPitchedHouse(w: number, h: number, d: number, wallCol: number, roofCol: number, _label?: string): THREE.Group {
    const g = new THREE.Group();
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const wallMat = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.7 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = h / 2;
    g.add(walls);

    // Pitched Roof
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.75, h * 0.55, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + h * 0.27;
    g.add(roof);

    return g;
  }

  private createModernFlatHouse(w: number, h: number, d: number, wallCol: number, roofCol: number): THREE.Group {
    const g = new THREE.Group();
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.3 })
    );
    wallMesh.position.y = h / 2;
    g.add(wallMesh);

    // Charcoal roof trim
    const trimMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w + 1.2, 0.8, d + 1.2),
      new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.4 })
    );
    trimMesh.position.y = h + 0.4;
    g.add(trimMesh);

    return g;
  }

  private createGlassSkyscraper(w: number, h: number, d: number, glassCol: number, glowCol: number, _name: string): THREE.Group {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: glassCol,
      metalness: 0.9,
      roughness: 0.1,
    });
    const tower = new THREE.Mesh(geo, mat);
    tower.position.y = h / 2;
    g.add(tower);

    // Glowing illuminated top crown
    const crownGeo = new THREE.BoxGeometry(w * 0.7, 6, d * 0.7);
    const crownMat = new THREE.MeshStandardMaterial({
      color: glowCol,
      emissive: glowCol,
      emissiveIntensity: 0.7,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = h + 3;
    g.add(crown);

    return g;
  }

  private createOfficeTower(w: number, h: number, d: number, wallCol: number, windowCol: number): THREE.Group {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.5 });
    const tower = new THREE.Mesh(geo, mat);
    tower.position.y = h / 2;
    g.add(tower);

    // Horizontal window bands
    const bands = Math.floor(h / 7);
    for (let i = 1; i < bands; i++) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.4, 1.8, d + 0.4),
        new THREE.MeshStandardMaterial({ color: windowCol, metalness: 0.7, roughness: 0.2 })
      );
      band.position.y = i * 7;
      g.add(band);
    }

    return g;
  }

  private createApartmentBlock(w: number, h: number, d: number, col: number, accentCol: number): THREE.Group {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col }));
    mesh.position.y = h / 2;
    g.add(mesh);

    // Colored Balcony strips
    for (let y = 4; y < h - 2; y += 4) {
      const balc = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.8, 1.2, 1.8),
        new THREE.MeshStandardMaterial({ color: accentCol })
      );
      balc.position.set(0, y, d / 2 + 0.9);
      g.add(balc);
    }

    return g;
  }

  private createLuxuryMansion(w: number, h: number, d: number, wallCol: number, roofCol: number): THREE.Group {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.2 }));
    base.position.y = h / 2;
    g.add(base);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 1.2, d * 0.9), new THREE.MeshStandardMaterial({ color: roofCol }));
    roof.position.y = h + 0.6;
    g.add(roof);

    return g;
  }

  private createOldTownHouse(w: number, h: number, d: number, woodCol: number, tileCol: number): THREE.Group {
    const g = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: woodCol, roughness: 0.9 }));
    walls.position.y = h / 2;
    g.add(walls);

    // Japanese Hipped Tiled Roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.72, 4.5, 4),
      new THREE.MeshStandardMaterial({ color: tileCol, roughness: 0.6 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + 2.2;
    g.add(roof);

    return g;
  }

  private createGlowingBillboard(w: number, h: number, col: number, text: string): THREE.Group {
    const g = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#' + col.toString(16).padStart(6, '0');
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    g.add(board);
    return g;
  }

  private createPublicFountain(parent: THREE.Group, x: number, z: number, radius: number) {
    const basinGeo = new THREE.CylinderGeometry(radius, radius, 1.2, 24);
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const basin = new THREE.Mesh(basinGeo, basinMat);
    basin.position.set(x, 0.6, z);
    parent.add(basin);

    // Water pool
    const waterGeo = new THREE.CircleGeometry(radius - 0.8, 24);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.1, metalness: 0.9 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(x, 1.15, z);
    parent.add(water);
  }

  private addParkTrees(parent: THREE.Group, cx: number, cz: number, count: number, radius: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const tx = cx + Math.cos(angle) * r;
      const tz = cz + Math.sin(angle) * r;
      this.addSingleAnimeTree(parent, tx, tz, 6 + Math.random() * 4);
    }
  }

  private addSingleAnimeTree(parent: THREE.Group, x: number, z: number, height: number) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, height * 0.45, 6),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
    );
    trunk.position.set(x, (height * 0.45) / 2, z);
    parent.add(trunk);

    const foliageColors = [0x166534, 0x15803d, 0x22c55e, 0xf472b6]; // Lush green & cherry blossom pink
    const folCol = foliageColors[Math.floor(Math.random() * foliageColors.length)];
    const folGeo = new THREE.DodecahedronGeometry(height * 0.4);
    const folMat = new THREE.MeshStandardMaterial({ color: folCol, roughness: 0.8 });
    const foliage = new THREE.Mesh(folGeo, folMat);
    foliage.position.set(x, height * 0.72, z);
    parent.add(foliage);
  }

  public update(time: number, delta: number) {
    for (const elem of this.animatedElements) {
      elem.update(time, delta);
    }
  }
}
