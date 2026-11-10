import * as THREE from 'three';
import { DedicatedCityMap, TOTAL_MAP_LENGTH } from './DedicatedCityMap';
import { DetailedRoadway } from './DetailedRoadway';
import { DetailedTrafficManager } from './DetailedTrafficManager';
import { PainterlyRainSystem } from './PainterlyRainSystem';
import { TokyoPedestrianWalkways } from './TokyoPedestrianWalkways';
import { VeloraRoadNetwork } from './VeloraRoadNetwork';
import { VeloraDistrictBuilder } from './VeloraDistrictBuilder';
import { VeloraCollisionSystem } from './VeloraCollisionSystem';

/**
 * RealisticScenicWorld - 4x4 KM Open World VELORA (16 km² area)
 * Integrates 16 architectural districts, extensive highway network,
 * physical 3D building collision & crash system, and painterly rain.
 */
export class RealisticScenicWorld {
  public group: THREE.Group;
  public collisionSystem: VeloraCollisionSystem;
  public cityMap: DedicatedCityMap;
  public roadway: DetailedRoadway;
  public walkways: TokyoPedestrianWalkways;
  public trafficManager: DetailedTrafficManager;
  public rainSystem: PainterlyRainSystem;
  public veloraRoads: VeloraRoadNetwork;
  public veloraDistricts: VeloraDistrictBuilder;
  public isRaining: boolean = true;
  private totalElapsed: number = 0;

  constructor() {
    this.group = new THREE.Group();

    // 1. Physical 3D Building Collision & Crash-Through Engine
    this.collisionSystem = new VeloraCollisionSystem();
    this.group.add(this.collisionSystem.getVisualGroup());

    // 2. 4x4 KM Velora Ground Terrain & Interconnected Road Network (Highways, Boulevards, Bridges)
    this.veloraRoads = new VeloraRoadNetwork();
    this.group.add(this.veloraRoads.group);

    // 3. All 16 Architectural Districts with signature landmarks & colliders
    this.veloraDistricts = new VeloraDistrictBuilder(this.collisionSystem);
    this.group.add(this.veloraDistricts.group);

    // 4. Detailed Roadway with asphalt markings, arrows, manholes, gantries
    this.roadway = new DetailedRoadway(TOTAL_MAP_LENGTH, 240);
    this.group.add(this.roadway.group);

    // 5. City Map dense roadside frontage with colliders
    this.cityMap = new DedicatedCityMap(this.collisionSystem);
    this.group.add(this.cityMap.group);

    // 6. Pedestrian Walkways, Tactile Paving & Walking People
    this.walkways = new TokyoPedestrianWalkways(TOTAL_MAP_LENGTH);
    this.group.add(this.walkways.group);

    // 7. High-End Traffic (F1, Rolls-Royce, Supercars)
    this.trafficManager = new DetailedTrafficManager();
    this.group.add(this.trafficManager.group);

    // 8. Painterly Rain System
    this.rainSystem = new PainterlyRainSystem();
    this.group.add(this.rainSystem.group);
  }

  public setRainActive(active: boolean) {
    this.isRaining = active;
    this.rainSystem.group.visible = active;
    const lens = this.rainSystem.getLensMesh();
    lens.visible = active;
  }

  public update(delta: number, carPos: THREE.Vector3, wipersActive: boolean) {
    this.totalElapsed += delta;

    // 1. Update Physical Debris, Sparks & Smoke
    this.collisionSystem.update(delta);

    // 2. Update Velora district animated elements (windmills, rooftop beacons)
    this.veloraDistricts.update(this.totalElapsed, delta);

    // 3. Update Pedestrian Walkways
    this.walkways.update(delta, carPos.z);

    // 4. Update Rain System (if raining)
    if (this.isRaining) {
      this.rainSystem.update(delta, carPos, wipersActive);
    }
  }
}
