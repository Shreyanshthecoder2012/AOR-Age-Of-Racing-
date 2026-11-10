export interface DistrictDefinition {
  id: string;
  number: string;
  name: string;
  type: 'residential' | 'downtown' | 'commercial' | 'civic' | 'industrial' | 'transit' | 'suburban' | 'waterfront' | 'infrastructure';
  gridX: number; // 0 to 3 (West to East)
  gridZ: number; // 0 to 3 (North to South)
  centerX: number;
  centerZ: number;
  japanese: string;
  tagline: string;
  palette: {
    primary: number;
    secondary: number;
    accent: number;
  };
  landmarks: string[];
  speedLimit: number;
}

export const VELORA_MAP_SIZE = 4000; // 4,000 meters x 4,000 meters (16 km²)
export const GRID_CELL_SIZE = 1000;  // 1,000 meters per district

/**
 * 16 Districts Master Layout of VELORA
 * Grid: 4 x 4 (North is -Z, West is -X)
 */
export const VELORA_DISTRICTS: DistrictDefinition[] = [
  // --- ROW 0: Northern Metropolitan Heart (Z: -2000 to -1000) ---
  {
    id: 'green_heights',
    number: '01',
    name: 'Green Heights',
    type: 'residential',
    gridX: 0,
    gridZ: 0,
    centerX: -1500,
    centerZ: -1500,
    japanese: '緑ヶ丘 · 閑静な住宅街',
    tagline: 'Quiet tree-lined residential community with central park & family homes',
    palette: { primary: 0x166534, secondary: 0xfef08a, accent: 0x15803d },
    landmarks: ['Green Heights Park', 'Community Clubhouse', 'Central Playground', 'Garden Petrol Station'],
    speedLimit: 60,
  },
  {
    id: 'downtown_west',
    number: '02',
    name: 'Downtown West',
    type: 'downtown',
    gridX: 1,
    gridZ: 0,
    centerX: -500,
    centerZ: -1500,
    japanese: '西都心 · 超高層ビル街',
    tagline: 'Corporate skyline, 6-lane boulevard & soaring glass skyscrapers',
    palette: { primary: 0x1e3a8a, secondary: 0x93c5fd, accent: 0x38bdf8 },
    landmarks: ['Velora Financial Tower (32F)', 'Meridian Tower (24F)', 'Orion Business Centre', 'Central Plaza'],
    speedLimit: 80,
  },
  {
    id: 'downtown_east',
    number: '03',
    name: 'Downtown East',
    type: 'downtown',
    gridX: 2,
    gridZ: 0,
    centerX: 500,
    centerZ: -1500,
    japanese: '東都心 · エンターテインメント',
    tagline: 'Shopping, dining, entertainment with giant LED billboards & convention centre',
    palette: { primary: 0xd946ef, secondary: 0x38bdf8, accent: 0xf43f5e },
    landmarks: ['Velora Grand Mall', 'Crystal Business Tower (28F)', 'Nova Cinema', 'City Convention Centre'],
    speedLimit: 80,
  },
  {
    id: 'elite_hills',
    number: '04',
    name: 'Elite Hills',
    type: 'residential',
    gridX: 3,
    gridZ: 0,
    centerX: 1500,
    centerZ: -1500,
    japanese: 'エリートヒルズ · 高級邸宅街',
    tagline: 'High elevation luxury estates with winding roads overlooking the downtown skyline',
    palette: { primary: 0xb45309, secondary: 0xfde047, accent: 0xd97706 },
    landmarks: ['Skyline Viewpoint', 'Private Tennis Club', 'Hillside Mansions', 'Clubhouse Vista'],
    speedLimit: 70,
  },

  // --- ROW 1: Central City Everyday Life (Z: -1000 to 0) ---
  {
    id: 'old_town',
    number: '05',
    name: 'Old Town',
    type: 'residential',
    gridX: 0,
    gridZ: 1,
    centerX: -1500,
    centerZ: -500,
    japanese: '旧市街 · 伝統の下町',
    tagline: 'Historical textured quarter with narrow 2-lane streets, tea shops & red tile roofs',
    palette: { primary: 0xb91c1c, secondary: 0xfbcfe8, accent: 0x991b1b },
    landmarks: ['Old Town Clocktower', 'Historical Tea Street', 'Red Tile Community Hall', 'Narrow Alley Market'],
    speedLimit: 50,
  },
  {
    id: 'civic_centre',
    number: '06',
    name: 'Civic Centre',
    type: 'civic',
    gridX: 1,
    gridZ: 1,
    centerX: -500,
    centerZ: -500,
    japanese: 'シビックセンター · 行政広場',
    tagline: 'Administrative heart of Velora with City Hall, grand plaza, museum & courthouse',
    palette: { primary: 0x0284c7, secondary: 0xf8fafc, accent: 0x0284c7 },
    landmarks: ['Central Civic Plaza Fountain', 'City Hall (6F)', 'Police HQ', 'Public Library & Museum'],
    speedLimit: 60,
  },
  {
    id: 'midtown_homes',
    number: '07',
    name: 'Midtown Homes',
    type: 'residential',
    gridX: 2,
    gridZ: 1,
    centerX: 500,
    centerZ: -500,
    japanese: 'ミッドタウン · アパート街',
    tagline: 'Vibrant middle-class apartments, schools, playgrounds & sports arena',
    palette: { primary: 0xf97316, secondary: 0xfef08a, accent: 0xea580c },
    landmarks: ['Velora Arena Stadium', 'Midtown Central School', 'Community Sports Complex', 'Market Street'],
    speedLimit: 60,
  },
  {
    id: 'luxury_enclave',
    number: '08',
    name: 'Luxury Enclave',
    type: 'residential',
    gridX: 3,
    gridZ: 1,
    centerX: 1500,
    centerZ: -500,
    japanese: 'ラグジュアリー特区 · ゲーテッド住宅',
    tagline: 'Gated enclave with landscaped roundabouts, contemporary villas & high-rise penthouses',
    palette: { primary: 0x047857, secondary: 0x6ee7b7, accent: 0x059669 },
    landmarks: ['Enclave Roundabout Fountain', 'Enclave Wellness Spa & Pool', 'Blue Glass Towers', 'Private Jogging Trail'],
    speedLimit: 60,
  },

  // --- ROW 2: Southern City Industry, Housing & Commerce (Z: 0 to 1000) ---
  {
    id: 'industrial_zone',
    number: '09',
    name: 'Industrial Zone',
    type: 'industrial',
    gridX: 0,
    gridZ: 2,
    centerX: -1500,
    centerZ: 500,
    japanese: '臨海工業地帯 · 巨大倉庫群',
    tagline: 'Heavy factories, oil storage tanks, loading docks & wide truck arterials',
    palette: { primary: 0x475569, secondary: 0xe2e8f0, accent: 0xf97316 },
    landmarks: ['Velora Steel Mills', 'Petrochemical Tank Farm', 'Central Water Treatment', 'Logistics Terminal'],
    speedLimit: 70,
  },
  {
    id: 'transit_quarter',
    number: '10',
    name: 'Transit Quarter',
    type: 'transit',
    gridX: 1,
    gridZ: 2,
    centerX: -500,
    centerZ: 500,
    japanese: 'トランスポート特区 · 中央駅',
    tagline: 'Transportation hub with Velora Central Railway Station, bus interchange & metro hub',
    palette: { primary: 0x2563eb, secondary: 0x93c5fd, accent: 0x1d4ed8 },
    landmarks: ['Velora Grand Central Station', 'Intercity Bus Terminal', 'Fleet Service Depot', 'Transit Mall'],
    speedLimit: 70,
  },
  {
    id: 'housing_colony',
    number: '11',
    name: 'Housing Colony',
    type: 'residential',
    gridX: 2,
    gridZ: 2,
    centerX: 500,
    centerZ: 500,
    japanese: '大団地 · コロニー住宅街',
    tagline: 'Major expanded AOR housing colony with 94+ varied homes (H01-H12) & central park',
    palette: { primary: 0xd97706, secondary: 0xfde68a, accent: 0xb45309 },
    landmarks: ['Colony Central Garden (100x80m)', 'Colony High School', 'Neighborhood Clinic', 'Shopping Bazaar'],
    speedLimit: 50,
  },
  {
    id: 'commercial_district',
    number: '12',
    name: 'Commercial District',
    type: 'commercial',
    gridX: 3,
    gridZ: 2,
    centerX: 1500,
    centerZ: 500,
    japanese: '商業特区 · ショールーム通り',
    tagline: 'Vibrant retail hub with automobile showrooms, electronics markets & dining strips',
    palette: { primary: 0x7c3aed, secondary: 0xc4b5fd, accent: 0xa855f7 },
    landmarks: ['AOR Motors Flagship Showroom', 'Mega Electronics Bazaar', 'Velora Cinema Multiplex', 'Fashion Galleria'],
    speedLimit: 70,
  },

  // --- ROW 3: Southern Outskirts, Riverfront & Highway (Z: 1000 to 2000) ---
  {
    id: 'outer_suburbs',
    number: '13',
    name: 'Outer Suburbs',
    type: 'suburban',
    gridX: 0,
    gridZ: 3,
    centerX: -1500,
    centerZ: 1500,
    japanese: '郊外田園 · ファームハウス',
    tagline: 'Rural transition zone with farmhouses, agricultural green fields & quiet lake',
    palette: { primary: 0x65a30d, secondary: 0xd9f99d, accent: 0x4d7c0f },
    landmarks: ['Lake Velora Shore', 'Suburban Farmhouses', 'Agricultural Produce Market', 'Old Windmill Park'],
    speedLimit: 80,
  },
  {
    id: 'riverfront',
    number: '14',
    name: 'Riverfront',
    type: 'waterfront',
    gridX: 1,
    gridZ: 3,
    centerX: -500,
    centerZ: 1500,
    japanese: 'リバーフロント · 水辺プロムナード',
    tagline: 'Scenic coastal waterfront promenade with cafes, viewing decks & sunset promenade',
    palette: { primary: 0x06b6d4, secondary: 0x67e8f9, accent: 0x0891b2 },
    landmarks: ['Sunset Promenade', 'Marina Boat Docks', 'Glass Pavilion Deck', 'Riverside Bistro Walk'],
    speedLimit: 60,
  },
  {
    id: 'bridge_district',
    number: '15',
    name: 'Bridge District',
    type: 'infrastructure',
    gridX: 2,
    gridZ: 3,
    centerX: 500,
    centerZ: 1500,
    japanese: '大橋地区 · 湾岸ブリッジ',
    tagline: 'Iconic 600m Velora Grand Bridge with cable-stayed steel towers & river access ramps',
    palette: { primary: 0x3b82f6, secondary: 0xbfdbfe, accent: 0x1d4ed8 },
    landmarks: ['Velora Grand Bridge (600m)', 'River Road Underpass', 'Bridge Scenic Vista', 'South Pier Light'],
    speedLimit: 100,
  },
  {
    id: 'highway_outskirts',
    number: '16',
    name: 'Highway Outskirts',
    type: 'infrastructure',
    gridX: 3,
    gridZ: 3,
    centerX: 1500,
    centerZ: 1500,
    japanese: '高速郊外 · ハイウェイインターチェンジ',
    tagline: 'High-speed 6-lane bypass, massive cloverleaf interchange, truck stops & open straights',
    palette: { primary: 0x0f172a, secondary: 0xf8fafc, accent: 0xf59e0b },
    landmarks: ['Grand Cloverleaf Interchange', 'Velora Truck Stop & Diner', 'Expressway Maintenance Depot', 'East Speed Straight'],
    speedLimit: 140,
  },
];

export function getVeloraDistrictByCoords(x: number, z: number): DistrictDefinition {
  // Clamp coordinates within map bounds
  const clampedX = Math.max(-1999, Math.min(1999, x));
  const clampedZ = Math.max(-1999, Math.min(1999, z));

  const col = Math.floor((clampedX + 2000) / GRID_CELL_SIZE);
  const row = Math.floor((clampedZ + 2000) / GRID_CELL_SIZE);
  const index = Math.max(0, Math.min(15, row * 4 + col));

  return VELORA_DISTRICTS[index];
}
