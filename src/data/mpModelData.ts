export type WeekKey = '1W' | '2W' | '3W' | '4W';
export type LineKey = 'LineA' | 'LineB';
export type SheetKey = 'CAB' | 'FG' | 'ALL';

export type ModelSeries =
  | 'TM19/21'
  | 'TM14'
  | 'BM TD'
  | 'BM'
  | 'T-Door'
  | 'SBS'
  | 'T-Door ice';

export interface ModelMetadata {
  id: ModelSeries;
  name: string;
  thaiDesc: string;
  category: string;
  color: string;
}

export interface StationConfig {
  id: string;
  code: string;
  name: string; // 线段
  thaiName: string;
  area: LineKey | string; // 区域 (LineA or LineB)
  subArea: 'CAB' | 'FG' | string; // CAB or FG
  uph: number; // Default UPH
  uphByWeek?: Record<WeekKey, number>; // Editable per-week UPH
  efficiency: number; // Line Balance / Allowances Factor (η)
  standardTimes: Record<ModelSeries, number>; // 产品工时 (Seconds)
  manualWeightedST?: Partial<Record<WeekKey, number | null>>;
  manualStdMP?: Partial<Record<WeekKey, number | null>>;
  sheetNote?: string;
  sheetDisplayedWeightedST?: Record<WeekKey, number>;
  sheetDisplayedSummary?: { avg: number; min: number; max: number };
}

export const WEEKS: WeekKey[] = ['1W', '2W', '3W', '4W'];
export const LINES: LineKey[] = ['LineA', 'LineB'];

export const INITIAL_MODELS: ModelMetadata[] = [
  {
    id: 'TM19/21',
    name: 'TM19/21',
    thaiDesc: 'ตู้เย็น 2 ประตู บน (Top Mount 19/21Q)',
    category: 'Top Mount',
    color: '#1d4ed8',
  },
  {
    id: 'TM14',
    name: 'TM14',
    thaiDesc: 'ตู้เย็น 2 ประตู บน (Top Mount 14Q)',
    category: 'Top Mount',
    color: '#0284c7',
  },
  {
    id: 'BM TD',
    name: 'BM TD',
    thaiDesc: 'ตู้เย็นช่องแข็งล่าง 3 ประตู (Bottom Mount TD)',
    category: 'Bottom Mount',
    color: '#0d9488',
  },
  {
    id: 'BM',
    name: 'BM',
    thaiDesc: 'ตู้เย็นช่องแข็งล่าง (Bottom Mount)',
    category: 'Bottom Mount',
    color: '#059669',
  },
  {
    id: 'T-Door',
    name: 'T-Door',
    thaiDesc: 'ตู้เย็นมินิมอล 3 ประตู (Three-Door)',
    category: 'Multi-Door',
    color: '#d97706',
  },
  {
    id: 'SBS',
    name: 'SBS',
    thaiDesc: 'ตู้เย็น Side-by-Side 2 ประตูใหญ่',
    category: 'Multi-Door',
    color: '#7c3aed',
  },
  {
    id: 'T-Door ice',
    name: 'T-Door ice',
    thaiDesc: 'ตู้เย็น 3 ประตู ระบบทำน้ำแข็ง (T-Door Ice)',
    category: 'Multi-Door',
    color: '#e11d48',
  },
];

export const MODELS = INITIAL_MODELS;

// Line B: 9月订单量 (September Weekly Order Volumes from Spreadsheet)
export const INITIAL_WEEKLY_VOLUMES: Record<ModelSeries, Record<WeekKey, number>> = {
  'TM19/21': { '1W': 3788, '2W': 5880, '3W': 5880, '4W': 5880 },
  'TM14': { '1W': 1189, '2W': 1680, '3W': 1680, '4W': 1680 },
  'BM TD': { '1W': 645, '2W': 1260, '3W': 1260, '4W': 1260 },
  'BM': { '1W': 2106, '2W': 2100, '3W': 1850, '4W': 2100 },
  'T-Door': { '1W': 443, '2W': 840, '3W': 81, '4W': 683 },
  'SBS': { '1W': 1352, '2W': 1680, '3W': 2439, '4W': 1517 },
  'T-Door ice': { '1W': 0, '2W': 0, '3W': 0, '4W': 0 },
};

// Line A: 9月订单量 (Default Weekly Order Volumes for LineA — fully editable)
export const INITIAL_LINE_A_VOLUMES: Record<ModelSeries, Record<WeekKey, number>> = {
  'TM19/21': { '1W': 4200, '2W': 5600, '3W': 5600, '4W': 5400 },
  'TM14': { '1W': 1500, '2W': 1960, '3W': 1960, '4W': 1800 },
  'BM TD': { '1W': 800, '2W': 1120, '3W': 1120, '4W': 1100 },
  'BM': { '1W': 1950, '2W': 2240, '3W': 2100, '4W': 2200 },
  'T-Door': { '1W': 520, '2W': 700, '3W': 420, '4W': 600 },
  'SBS': { '1W': 1150, '2W': 1540, '3W': 1820, '4W': 1600 },
  'T-Door ice': { '1W': 280, '2W': 280, '3W': 280, '4W': 300 },
};

export const INITIAL_VOLUMES_BY_LINE: Record<
  LineKey,
  Record<ModelSeries, Record<WeekKey, number>>
> = {
  LineA: INITIAL_LINE_A_VOLUMES,
  LineB: INITIAL_WEEKLY_VOLUMES,
};

// ============================================================================
// LINE B STATIONS (CAB 9 Stations + FG 7 Stations)
// ============================================================================
export const INITIAL_CAB_STATIONS: StationConfig[] = [
  {
    id: 'cab_rooling',
    code: 'B-CAB-01',
    name: 'Rooling',
    thaiName: 'งานม้วนพับตัวถัง (Cabinet Rolling)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.805,
    standardTimes: {
      'TM19/21': 185.44,
      'TM14': 185.44,
      'BM TD': 65.84,
      'BM': 22.20,
      'T-Door': 477.88,
      'SBS': 105.48,
      'T-Door ice': 254.57,
    },
  },
  {
    id: 'cab_inner_box_2',
    code: 'B-CAB-02',
    name: 'Inner Box2',
    thaiName: 'ประกอบกล่องใน 2 (รุ่น TM14 / Multi-Door / SBS)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.81,
    standardTimes: {
      'TM19/21': 0.00,
      'TM14': 820.12,
      'BM TD': 0.00,
      'BM': 0.00,
      'T-Door': 1423.45,
      'SBS': 1495.70,
      'T-Door ice': 1830.22,
    },
    sheetNote:
      'หมายเหตุจากไฟล์ต้นฉบับ LineB CAB: ช่อง 加权工时 ของ Inner Box2 ใน Excel คัดลอกค่า (143, 157, 138, 154) มาจาก Rooling แต่ช่อง STD MP (18, 18, 19, 17) คำนวณจากเวลามาตรฐานจริงของ Inner Box2 (381, 378, 390, 352 วินาที)',
    sheetDisplayedWeightedST: { '1W': 143, '2W': 157, '3W': 138, '4W': 154 },
    sheetDisplayedSummary: { avg: 6, min: 6, max: 7 },
  },
  {
    id: 'cab_inner_box_1',
    code: 'B-CAB-03',
    name: 'Inner Box 1',
    thaiName: 'ประกอบกล่องใน 1 (รุ่น TM19/21 / BM TD / BM)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.80,
    standardTimes: {
      'TM19/21': 1280.55,
      'TM14': 0.00,
      'BM TD': 51.69,
      'BM': 2118.62,
      'T-Door': 0.00,
      'SBS': 0.00,
      'T-Door ice': 0.00,
    },
  },
  {
    id: 'cab_per_2',
    code: 'B-CAB-04',
    name: 'Cab per2',
    thaiName: 'เตรียมตู้ Cab 2 (รุ่น TM14 / Multi-Door / SBS)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.80,
    standardTimes: {
      'TM19/21': 0.00,
      'TM14': 500.79,
      'BM TD': 0.00,
      'BM': 0.00,
      'T-Door': 713.30,
      'SBS': 756.17,
      'T-Door ice': 1268.71,
    },
  },
  {
    id: 'cab_per_1',
    code: 'B-CAB-05',
    name: 'Cab per1',
    thaiName: 'เตรียมตู้ Cab 1 (รุ่น TM19/21 / BM TD / BM)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.705,
    standardTimes: {
      'TM19/21': 754.03,
      'TM14': 0.00,
      'BM TD': 700.63,
      'BM': 830.26,
      'T-Door': 0.00,
      'SBS': 0.00,
      'T-Door ice': 0.00,
    },
  },
  {
    id: 'cab_compressor_prep',
    code: 'B-CAB-06',
    name: 'เตรียม Compressor',
    thaiName: 'งานเตรียมคอมเพรสเซอร์ (Compressor Prep)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.80,
    standardTimes: {
      'TM19/21': 81.10,
      'TM14': 81.10,
      'BM TD': 138.76,
      'BM': 138.76,
      'T-Door': 122.76,
      'SBS': 74.55,
      'T-Door ice': 127.38,
    },
  },
  {
    id: 'cab_pu_foam_b',
    code: 'B-CAB-07',
    name: 'PU Foam B',
    thaiName: 'ฉีดโฟม PU B (รุ่น TM14 / Multi-Door / SBS)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.80,
    standardTimes: {
      'TM19/21': 0.00,
      'TM14': 215.84,
      'BM TD': 0.00,
      'BM': 0.00,
      'T-Door': 146.23,
      'SBS': 160.79,
      'T-Door ice': 132.37,
    },
  },
  {
    id: 'cab_pu_foam_a',
    code: 'B-CAB-08',
    name: 'PU Foam A',
    thaiName: 'ฉีดโฟม PU A (รุ่น TM19/21 / BM TD / BM)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.705,
    standardTimes: {
      'TM19/21': 201.70,
      'TM14': 0.00,
      'BM TD': 169.91,
      'BM': 144.15,
      'T-Door': 0.00,
      'SBS': 0.00,
      'T-Door ice': 0.00,
    },
  },
  {
    id: 'cab_pu_foam_pre_system',
    code: 'B-CAB-09',
    name: 'PU Foam ก่อนเข้า System',
    thaiName: 'งานเตรียมตู้ก่อนเข้าระบบโฟม (Pre-System PU Foam)',
    area: 'LineB',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 533.72,
      'TM14': 547.23,
      'BM TD': 596.82,
      'BM': 526.95,
      'T-Door': 633.76,
      'SBS': 595.14,
      'T-Door ice': 540.12,
    },
  },
];

export const INITIAL_FG_STATIONS: StationConfig[] = [
  {
    id: 'fg_system_vacuum',
    code: 'B-FG-01',
    name: 'System & Vacuum',
    thaiName: 'งานเชื่อมระบบท่อและแวคคั่ม (System & Vacuum)',
    area: 'LineB',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.702,
    standardTimes: {
      'TM19/21': 658.60,
      'TM14': 623.60,
      'BM TD': 676.33,
      'BM': 711.22,
      'T-Door': 399.48,
      'SBS': 419.02,
      'T-Door ice': 377.67,
    },
  },
  {
    id: 'fg_assembly',
    code: 'B-FG-02',
    name: 'Assembly',
    thaiName: 'งานประกอบชิ้นส่วนภายในและอุปกรณ์ (Main Assembly)',
    area: 'LineB',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 369.93,
      'TM14': 326.91,
      'BM TD': 578.82,
      'BM': 974.56,
      'T-Door': 321.26,
      'SBS': 460.82,
      'T-Door ice': 331.55,
    },
  },
  {
    id: 'fg_door_assembly',
    code: 'B-FG-03',
    name: 'Door assemby',
    thaiName: 'งานประกอบบานประตูตู้เย็น (Door Assembly)',
    area: 'LineB',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 783.35,
      'TM14': 721.94,
      'BM TD': 702.72,
      'BM': 946.61,
      'T-Door': 649.17,
      'SBS': 514.98,
      'T-Door ice': 765.56,
    },
  },
  {
    id: 'fg_test_air',
    code: 'B-FG-04',
    name: 'Test air',
    thaiName: 'งานตรวจสอบการรั่วซึมและแรงดันลม (Air Leak Test)',
    area: 'LineB',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 0.00,
      'TM14': 0.00,
      'BM TD': 157.13,
      'BM': 159.88,
      'T-Door': 0.00,
      'SBS': 0.00,
      'T-Door ice': 0.00,
    },
  },
  {
    id: 'fg_cooling',
    code: 'B-FG-05',
    name: 'Coolling',
    thaiName: 'งานทดสอบระบบทำความเย็น (Cooling Performance Test)',
    area: 'LineB',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 193.10,
      'TM14': 168.52,
      'BM TD': 149.08,
      'BM': 213.57,
      'T-Door': 57.20,
      'SBS': 108.89,
      'T-Door ice': 318.79,
    },
  },
  {
    id: 'fg_final',
    code: 'B-FG-06',
    name: 'Final',
    thaiName: 'งานตรวจสอบขั้นสุดท้ายและทำความสะอาด (Final Inspection)',
    area: 'LineB',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 492.04,
      'TM14': 453.66,
      'BM TD': 493.09,
      'BM': 720.66,
      'T-Door': 381.14,
      'SBS': 488.42,
      'T-Door ice': 425.47,
    },
  },
  {
    id: 'fg_packing',
    code: 'B-FG-07',
    name: 'Packing',
    thaiName: 'งานบรรจุหีบห่อสินค้าสำเร็จรูป (Final Packing)',
    area: 'LineB',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 110.47,
      'TM14': 98.50,
      'BM TD': 47.10,
      'BM': 110.73,
      'T-Door': 39.57,
      'SBS': 59.20,
      'T-Door ice': 43.10,
    },
  },
];

// ============================================================================
// LINE A STATIONS (CAB 9 Stations + FG 7 Stations — Distinct ST & Line Characteristics)
// ============================================================================
export const INITIAL_LINE_A_CAB_STATIONS: StationConfig[] = [
  {
    id: 'linea_cab_rooling',
    code: 'A-CAB-01',
    name: 'Rooling',
    thaiName: 'งานม้วนพับตัวถัง (Cabinet Rolling Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.81,
    standardTimes: {
      'TM19/21': 165.20,
      'TM14': 165.20,
      'BM TD': 72.40,
      'BM': 28.50,
      'T-Door': 512.30,
      'SBS': 118.60,
      'T-Door ice': 275.40,
    },
  },
  {
    id: 'linea_cab_inner_box_2',
    code: 'A-CAB-02',
    name: 'Inner Box2',
    thaiName: 'ประกอบกล่องใน 2 (รุ่น TM14 / Multi-Door / SBS Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.815,
    standardTimes: {
      'TM19/21': 0.00,
      'TM14': 765.40,
      'BM TD': 0.00,
      'BM': 0.00,
      'T-Door': 1380.20,
      'SBS': 1540.80,
      'T-Door ice': 1795.50,
    },
  },
  {
    id: 'linea_cab_inner_box_1',
    code: 'A-CAB-03',
    name: 'Inner Box 1',
    thaiName: 'ประกอบกล่องใน 1 (รุ่น TM19/21 / BM TD / BM Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.805,
    standardTimes: {
      'TM19/21': 1195.80,
      'TM14': 0.00,
      'BM TD': 58.20,
      'BM': 2045.30,
      'T-Door': 0.00,
      'SBS': 0.00,
      'T-Door ice': 0.00,
    },
  },
  {
    id: 'linea_cab_per_2',
    code: 'A-CAB-04',
    name: 'Cab per2',
    thaiName: 'เตรียมตู้ Cab 2 (รุ่น TM14 / Multi-Door / SBS Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.80,
    standardTimes: {
      'TM19/21': 0.00,
      'TM14': 480.50,
      'BM TD': 0.00,
      'BM': 0.00,
      'T-Door': 685.40,
      'SBS': 795.20,
      'T-Door ice': 1220.60,
    },
  },
  {
    id: 'linea_cab_per_1',
    code: 'A-CAB-05',
    name: 'Cab per1',
    thaiName: 'เตรียมตู้ Cab 1 (รุ่น TM19/21 / BM TD / BM Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.71,
    standardTimes: {
      'TM19/21': 710.20,
      'TM14': 0.00,
      'BM TD': 680.50,
      'BM': 810.40,
      'T-Door': 0.00,
      'SBS': 0.00,
      'T-Door ice': 0.00,
    },
  },
  {
    id: 'linea_cab_compressor_prep',
    code: 'A-CAB-06',
    name: 'เตรียม Compressor',
    thaiName: 'งานเตรียมคอมเพรสเซอร์ (Compressor Prep Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.80,
    standardTimes: {
      'TM19/21': 76.50,
      'TM14': 76.50,
      'BM TD': 142.30,
      'BM': 142.30,
      'T-Door': 118.50,
      'SBS': 79.20,
      'T-Door ice': 131.40,
    },
  },
  {
    id: 'linea_cab_pu_foam_b',
    code: 'A-CAB-07',
    name: 'PU Foam B',
    thaiName: 'ฉีดโฟม PU B (รุ่น TM14 / Multi-Door / SBS Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.80,
    standardTimes: {
      'TM19/21': 0.00,
      'TM14': 205.40,
      'BM TD': 0.00,
      'BM': 0.00,
      'T-Door': 152.80,
      'SBS': 172.50,
      'T-Door ice': 140.20,
    },
  },
  {
    id: 'linea_cab_pu_foam_a',
    code: 'A-CAB-08',
    name: 'PU Foam A',
    thaiName: 'ฉีดโฟม PU A (รุ่น TM19/21 / BM TD / BM Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.71,
    standardTimes: {
      'TM19/21': 192.60,
      'TM14': 0.00,
      'BM TD': 175.40,
      'BM': 152.80,
      'T-Door': 0.00,
      'SBS': 0.00,
      'T-Door ice': 0.00,
    },
  },
  {
    id: 'linea_cab_pu_foam_pre_system',
    code: 'A-CAB-09',
    name: 'PU Foam ก่อนเข้า System',
    thaiName: 'งานเตรียมตู้ก่อนเข้าระบบโฟม (Pre-System PU Foam Line A)',
    area: 'LineA',
    subArea: 'CAB',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.705,
    standardTimes: {
      'TM19/21': 510.40,
      'TM14': 525.60,
      'BM TD': 615.20,
      'BM': 545.80,
      'T-Door': 655.40,
      'SBS': 620.50,
      'T-Door ice': 565.80,
    },
  },
];

export const INITIAL_LINE_A_FG_STATIONS: StationConfig[] = [
  {
    id: 'linea_fg_system_vacuum',
    code: 'A-FG-01',
    name: 'System & Vacuum',
    thaiName: 'งานเชื่อมระบบท่อและแวคคั่ม (System & Vacuum Line A)',
    area: 'LineA',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.705,
    standardTimes: {
      'TM19/21': 620.50,
      'TM14': 595.40,
      'BM TD': 695.80,
      'BM': 735.40,
      'T-Door': 420.50,
      'SBS': 445.60,
      'T-Door ice': 395.20,
    },
  },
  {
    id: 'linea_fg_assembly',
    code: 'A-FG-02',
    name: 'Assembly',
    thaiName: 'งานประกอบชิ้นส่วนภายในและอุปกรณ์ (Main Assembly Line A)',
    area: 'LineA',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.705,
    standardTimes: {
      'TM19/21': 345.80,
      'TM14': 310.50,
      'BM TD': 595.40,
      'BM': 940.20,
      'T-Door': 340.80,
      'SBS': 485.50,
      'T-Door ice': 350.40,
    },
  },
  {
    id: 'linea_fg_door_assembly',
    code: 'A-FG-03',
    name: 'Door assemby',
    thaiName: 'งานประกอบบานประตูตู้เย็น (Door Assembly Line A)',
    area: 'LineA',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 745.60,
      'TM14': 695.80,
      'BM TD': 725.40,
      'BM': 915.20,
      'T-Door': 680.50,
      'SBS': 540.20,
      'T-Door ice': 795.40,
    },
  },
  {
    id: 'linea_fg_test_air',
    code: 'A-FG-04',
    name: 'Test air',
    thaiName: 'งานตรวจสอบการรั่วซึมและแรงดันลม (Air Leak Test Line A)',
    area: 'LineA',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 0.00,
      'TM14': 0.00,
      'BM TD': 165.40,
      'BM': 168.20,
      'T-Door': 0.00,
      'SBS': 0.00,
      'T-Door ice': 0.00,
    },
  },
  {
    id: 'linea_fg_cooling',
    code: 'A-FG-05',
    name: 'Coolling',
    thaiName: 'งานทดสอบระบบทำความเย็น (Cooling Performance Test Line A)',
    area: 'LineA',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 185.40,
      'TM14': 160.20,
      'BM TD': 155.60,
      'BM': 225.40,
      'T-Door': 62.50,
      'SBS': 115.80,
      'T-Door ice': 330.50,
    },
  },
  {
    id: 'linea_fg_final',
    code: 'A-FG-06',
    name: 'Final',
    thaiName: 'งานตรวจสอบขั้นสุดท้ายและทำความสะอาด (Final Inspection Line A)',
    area: 'LineA',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 468.50,
      'TM14': 432.40,
      'BM TD': 512.60,
      'BM': 745.20,
      'T-Door': 398.50,
      'SBS': 510.40,
      'T-Door ice': 445.60,
    },
  },
  {
    id: 'linea_fg_packing',
    code: 'A-FG-07',
    name: 'Packing',
    thaiName: 'งานบรรจุหีบห่อสินค้าสำเร็จรูป (Final Packing Line A)',
    area: 'LineA',
    subArea: 'FG',
    uph: 140,
    uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
    efficiency: 0.70,
    standardTimes: {
      'TM19/21': 105.20,
      'TM14': 92.40,
      'BM TD': 52.60,
      'BM': 118.50,
      'T-Door': 42.80,
      'SBS': 64.50,
      'T-Door ice': 48.20,
    },
  },
];

// Combined default stations across LineA and LineB
export const INITIAL_STATIONS: StationConfig[] = [
  ...INITIAL_LINE_A_CAB_STATIONS,
  ...INITIAL_LINE_A_FG_STATIONS,
  ...INITIAL_CAB_STATIONS,
  ...INITIAL_FG_STATIONS,
];

// Calculation Results Interfaces
export interface StationWeekMetric {
  uph: number;
  weightedST: number;
  roundedWeightedST: number;
  exactMP: number;
  stdMP: number;
  isManualWeightedST: boolean;
  isManualStdMP: boolean;
  totalWorkHours: number;
  lineHoursNeeded: number;
  utilizationPct: number;
}

export interface StationComputedRow {
  station: StationConfig;
  byWeek: Record<WeekKey, StationWeekMetric>;
  avgMP: number;
  minMP: number;
  maxMP: number;
}

export interface WeeklySummaryMetrics {
  totalVolume: Record<WeekKey, number>;
  mixRatios: Record<ModelSeries, Record<WeekKey, number>>;
  stationRows: StationComputedRow[];
  totalWeightedST: Record<WeekKey, number>;
  totalStdMP: Record<WeekKey, number>;
  totalExactMP: Record<WeekKey, number>;
  totalUphSum: Record<WeekKey, number>;
  lineHoursRequired: Record<WeekKey, number>;
  avgTotalMP: number;
  minTotalMP: number;
  maxTotalMP: number;
  sheetFooterReference: {
    weightedST: Record<WeekKey, number>;
    uph: Record<WeekKey, number>;
    stdMP: Record<WeekKey, number>;
    avg: number;
    min: number;
    max: number;
  };
}

export function calculateFactoryModel(
  stations: StationConfig[],
  weeklyVolumes: Record<ModelSeries, Record<WeekKey, number>>,
  globalUphOverride?: number,
  activeSheet: SheetKey = 'CAB',
  scaleUphWithVolume: boolean = true
): WeeklySummaryMetrics {
  const isLineA = stations[0]?.area === 'LineA';
  const baselineVolumesForLine = isLineA
    ? INITIAL_VOLUMES_BY_LINE.LineA
    : INITIAL_VOLUMES_BY_LINE.LineB;

  const baselineTotalVolume: Record<WeekKey, number> = {
    '1W': 0,
    '2W': 0,
    '3W': 0,
    '4W': 0,
  };
  const totalVolume: Record<WeekKey, number> = {
    '1W': 0,
    '2W': 0,
    '3W': 0,
    '4W': 0,
  };

  for (const w of WEEKS) {
    let sum = 0;
    let baseSum = 0;
    for (const m of INITIAL_MODELS) {
      sum += Math.max(0, weeklyVolumes[m.id]?.[w] || 0);
      baseSum += Math.max(0, baselineVolumesForLine[m.id]?.[w] || 0);
    }
    totalVolume[w] = sum;
    baselineTotalVolume[w] = baseSum > 0 ? baseSum : 13440;
  }

  const mixRatios = {} as Record<ModelSeries, Record<WeekKey, number>>;
  for (const m of INITIAL_MODELS) {
    mixRatios[m.id] = {
      '1W': totalVolume['1W'] > 0 ? (weeklyVolumes[m.id]['1W'] || 0) / totalVolume['1W'] : 0,
      '2W': totalVolume['2W'] > 0 ? (weeklyVolumes[m.id]['2W'] || 0) / totalVolume['2W'] : 0,
      '3W': totalVolume['3W'] > 0 ? (weeklyVolumes[m.id]['3W'] || 0) / totalVolume['3W'] : 0,
      '4W': totalVolume['4W'] > 0 ? (weeklyVolumes[m.id]['4W'] || 0) / totalVolume['4W'] : 0,
    };
  }

  const totalWeightedST: Record<WeekKey, number> = { '1W': 0, '2W': 0, '3W': 0, '4W': 0 };
  const totalStdMP: Record<WeekKey, number> = { '1W': 0, '2W': 0, '3W': 0, '4W': 0 };
  const totalExactMP: Record<WeekKey, number> = { '1W': 0, '2W': 0, '3W': 0, '4W': 0 };
  const totalUphSum: Record<WeekKey, number> = { '1W': 0, '2W': 0, '3W': 0, '4W': 0 };
  const lineHoursRequired: Record<WeekKey, number> = { '1W': 0, '2W': 0, '3W': 0, '4W': 0 };

  const stationRows: StationComputedRow[] = stations.map((station) => {
    const byWeek = {} as Record<WeekKey, StationWeekMetric>;

    for (const w of WEEKS) {
      const baseUph = globalUphOverride ?? station.uphByWeek?.[w] ?? station.uph;
      const volScaleRatio =
        scaleUphWithVolume && baselineTotalVolume[w] > 0
          ? totalVolume[w] / baselineTotalVolume[w]
          : 1;
      const uph = Math.round(baseUph * volScaleRatio * 10) / 10;
      const exactEffectiveUph = baseUph * volScaleRatio;

      let formulaWeightedST = 0;
      for (const m of INITIAL_MODELS) {
        const st = station.standardTimes[m.id] || 0;
        const ratio = mixRatios[m.id][w] || 0;
        formulaWeightedST += st * ratio;
      }

      const manualWST = station.manualWeightedST?.[w];
      const isManualWeightedST = manualWST !== undefined && manualWST !== null;
      const weightedST = isManualWeightedST ? manualWST : formulaWeightedST;

      const safeEfficiency = Math.max(0.05, station.efficiency || 0.8);
      const effectiveSecondsPerHour = 3600 * safeEfficiency;
      const exactMP =
        totalVolume[w] > 0
          ? (weightedST * exactEffectiveUph) / effectiveSecondsPerHour
          : 0;

      const manualMP = station.manualStdMP?.[w];
      const isManualStdMP = manualMP !== undefined && manualMP !== null;
      const stdMP = isManualStdMP ? manualMP : Math.round(exactMP);

      const lineHoursNeeded = baseUph > 0 ? totalVolume[w] / baseUph : 0;
      const totalWorkHours = (weightedST * totalVolume[w]) / effectiveSecondsPerHour;
      const utilizationPct = stdMP > 0 ? (exactMP / stdMP) * 100 : 0;

      byWeek[w] = {
        uph,
        weightedST,
        roundedWeightedST: Math.round(weightedST),
        exactMP,
        stdMP,
        isManualWeightedST,
        isManualStdMP,
        totalWorkHours,
        lineHoursNeeded,
        utilizationPct,
      };

      totalWeightedST[w] += weightedST;
      totalStdMP[w] += stdMP;
      totalExactMP[w] += exactMP;
      totalUphSum[w] += Math.round(uph);
      lineHoursRequired[w] = lineHoursNeeded;
    }

    const mpValues = WEEKS.map((w) => byWeek[w].stdMP);
    const avgMP = Math.round(mpValues.reduce((a, b) => a + b, 0) / mpValues.length);
    const minMP = Math.min(...mpValues);
    const maxMP = Math.max(...mpValues);

    return {
      station,
      byWeek,
      avgMP,
      minMP,
      maxMP,
    };
  });

  const weeklyTotals = WEEKS.map((w) => totalStdMP[w]);
  const avgTotalMP =
    weeklyTotals.length > 0
      ? Math.round(weeklyTotals.reduce((a, b) => a + b, 0) / weeklyTotals.length)
      : 0;
  const minTotalMP = weeklyTotals.length > 0 ? Math.min(...weeklyTotals) : 0;
  const maxTotalMP = weeklyTotals.length > 0 ? Math.max(...weeklyTotals) : 0;

  // For LineA, reference footer equals true calculated totals; for LineB, preserve original image reference
  const cabFooterRef = isLineA
    ? {
        weightedST: {
          '1W': Math.round(totalWeightedST['1W']),
          '2W': Math.round(totalWeightedST['2W']),
          '3W': Math.round(totalWeightedST['3W']),
          '4W': Math.round(totalWeightedST['4W']),
        },
        uph: totalUphSum,
        stdMP: totalStdMP,
        avg: avgTotalMP,
        min: minTotalMP,
        max: maxTotalMP,
      }
    : {
        weightedST: { '1W': 2486, '2W': 2439, '3W': 2362, '4W': 2432 },
        uph: { '1W': 1120, '2W': 1120, '3W': 1120, '4W': 1120 },
        stdMP: { '1W': 126, '2W': 124, '3W': 120, '4W': 135 },
        avg: 143,
        min: 120,
        max: 128,
      };

  const fgFooterRef = isLineA
    ? {
        weightedST: {
          '1W': Math.round(totalWeightedST['1W']),
          '2W': Math.round(totalWeightedST['2W']),
          '3W': Math.round(totalWeightedST['3W']),
          '4W': Math.round(totalWeightedST['4W']),
        },
        uph: totalUphSum,
        stdMP: totalStdMP,
        avg: avgTotalMP,
        min: minTotalMP,
        max: maxTotalMP,
      }
    : {
        weightedST: { '1W': 2752, '2W': 2674, '3W': 2664, '4W': 2692 },
        uph: { '1W': 980, '2W': 980, '3W': 980, '4W': 980 },
        stdMP: { '1W': 153, '2W': 149, '3W': 148, '4W': 150 },
        avg: 150,
        min: 148,
        max: 153,
      };

  const allFooterRef = {
    weightedST: {
      '1W': Math.round(totalWeightedST['1W']),
      '2W': Math.round(totalWeightedST['2W']),
      '3W': Math.round(totalWeightedST['3W']),
      '4W': Math.round(totalWeightedST['4W']),
    },
    uph: totalUphSum,
    stdMP: totalStdMP,
    avg: avgTotalMP,
    min: minTotalMP,
    max: maxTotalMP,
  };

  return {
    totalVolume,
    mixRatios,
    stationRows,
    totalWeightedST,
    totalStdMP,
    totalExactMP,
    totalUphSum,
    lineHoursRequired,
    avgTotalMP,
    minTotalMP,
    maxTotalMP,
    sheetFooterReference:
      activeSheet === 'FG'
        ? fgFooterRef
        : activeSheet === 'ALL'
        ? allFooterRef
        : cabFooterRef,
  };
}

export interface ForecastStationResult {
  station: StationConfig;
  weightedST: number;
  exactMP: number;
  stdMP: number;
  baselineMP: number;
  deltaMP: number;
  manHoursRequired: number;
  utilizationPct: number;
  dominantModel: ModelSeries | null;
}

export interface ForecastSummary {
  totalVolume: number;
  mixRatios: Record<ModelSeries, number>;
  uph: number;
  taktTimeSec: number;
  lineHoursNeeded: number;
  shiftsNeeded8Hr: number;
  daysNeededAt2Shifts: number;
  totalWeightedST: number;
  totalExactMP: number;
  totalStdMP: number;
  totalWithBufferMP: number;
  totalManHours: number;
  baselineTotalMP: number;
  deltaTotalMP: number;
  stations: ForecastStationResult[];
}

export function simulateVolumeForecast(
  stations: StationConfig[],
  volumes: Record<ModelSeries, number>,
  uph: number,
  absenteeismBufferPct: number,
  baselineWeekMetrics: StationComputedRow[],
  baselineWeek: WeekKey
): ForecastSummary {
  let totalVolume = 0;
  for (const m of INITIAL_MODELS) {
    totalVolume += Math.max(0, volumes[m.id] || 0);
  }

  const mixRatios = {} as Record<ModelSeries, number>;
  for (const m of INITIAL_MODELS) {
    mixRatios[m.id] = totalVolume > 0 ? Math.max(0, volumes[m.id] || 0) / totalVolume : 0;
  }

  const taktTimeSec = uph > 0 ? 3600 / uph : 0;
  const lineHoursNeeded = uph > 0 ? totalVolume / uph : 0;
  const shiftsNeeded8Hr = lineHoursNeeded / 8;
  const daysNeededAt2Shifts = lineHoursNeeded / 16;

  let totalWeightedST = 0;
  let totalExactMP = 0;
  let totalStdMP = 0;
  let totalManHours = 0;
  let baselineTotalMP = 0;

  const stationResults: ForecastStationResult[] = stations.map((station, idx) => {
    let weightedST = 0;
    let maxContribution = -1;
    let dominantModel: ModelSeries | null = null;

    for (const m of INITIAL_MODELS) {
      const st = station.standardTimes[m.id] || 0;
      const contrib = st * mixRatios[m.id];
      weightedST += contrib;
      if (contrib > maxContribution && contrib > 0) {
        maxContribution = contrib;
        dominantModel = m.id;
      }
    }

    const safeEff = Math.max(0.05, station.efficiency || 0.8);
    const effectiveSecPerHour = 3600 * safeEff;
    const exactMP = totalVolume > 0 ? (weightedST * uph) / effectiveSecPerHour : 0;
    const stdMP = Math.round(exactMP);
    const manHoursRequired = (weightedST * totalVolume) / effectiveSecPerHour;
    const utilizationPct = stdMP > 0 ? (exactMP / stdMP) * 100 : 0;

    const baselineMP = baselineWeekMetrics[idx]?.byWeek[baselineWeek]?.stdMP ?? 0;
    const deltaMP = stdMP - baselineMP;

    totalWeightedST += weightedST;
    totalExactMP += exactMP;
    totalStdMP += stdMP;
    totalManHours += manHoursRequired;
    baselineTotalMP += baselineMP;

    return {
      station,
      weightedST,
      exactMP,
      stdMP,
      baselineMP,
      deltaMP,
      manHoursRequired,
      utilizationPct,
      dominantModel,
    };
  });

  const totalWithBufferMP = Math.ceil(totalStdMP * (1 + absenteeismBufferPct / 100));

  return {
    totalVolume,
    mixRatios,
    uph,
    taktTimeSec,
    lineHoursNeeded,
    shiftsNeeded8Hr,
    daysNeededAt2Shifts,
    totalWeightedST,
    totalExactMP,
    totalStdMP,
    totalWithBufferMP,
    totalManHours,
    baselineTotalMP,
    deltaTotalMP: totalStdMP - baselineTotalMP,
    stations: stationResults,
  };
}

// ============================================================================
// 12-MONTH MP TREND MODEL (1月 - 12月 / ม.ค. - ธ.ค.)
// ============================================================================
export type MonthKey =
  | 'M01'
  | 'M02'
  | 'M03'
  | 'M04'
  | 'M05'
  | 'M06'
  | 'M07'
  | 'M08'
  | 'M09'
  | 'M10'
  | 'M11'
  | 'M12';

export interface MonthMetadata {
  key: MonthKey;
  index: number;
  shortThai: string;
  fullThai: string;
  cnName: string;
  enName: string;
}

export const MONTHS: MonthMetadata[] = [
  { key: 'M01', index: 1, shortThai: 'ม.ค.', fullThai: 'มกราคม', cnName: '1月', enName: 'Jan' },
  { key: 'M02', index: 2, shortThai: 'ก.พ.', fullThai: 'กุมภาพันธ์', cnName: '2月', enName: 'Feb' },
  { key: 'M03', index: 3, shortThai: 'มี.ค.', fullThai: 'มีนาคม', cnName: '3月', enName: 'Mar' },
  { key: 'M04', index: 4, shortThai: 'เม.ย.', fullThai: 'เมษายน', cnName: '4月', enName: 'Apr' },
  { key: 'M05', index: 5, shortThai: 'พ.ค.', fullThai: 'พฤษภาคม', cnName: '5月', enName: 'May' },
  { key: 'M06', index: 6, shortThai: 'มิ.ย.', fullThai: 'มิถุนายน', cnName: '6月', enName: 'Jun' },
  { key: 'M07', index: 7, shortThai: 'ก.ค.', fullThai: 'กรกฎาคม', cnName: '7月', enName: 'Jul' },
  { key: 'M08', index: 8, shortThai: 'ส.ค.', fullThai: 'สิงหาคม', cnName: '8月', enName: 'Aug' },
  { key: 'M09', index: 9, shortThai: 'ก.ย.', fullThai: 'กันยายน (9月)', cnName: '9月', enName: 'Sep' },
  { key: 'M10', index: 10, shortThai: 'ต.ค.', fullThai: 'ตุลาคม', cnName: '10月', enName: 'Oct' },
  { key: 'M11', index: 11, shortThai: 'พ.ย.', fullThai: 'พฤศจิกายน', cnName: '11月', enName: 'Nov' },
  { key: 'M12', index: 12, shortThai: 'ธ.ค.', fullThai: 'ธันวาคม', cnName: '12月', enName: 'Dec' },
];

export type MonthlyPlanByLine = Record<
  LineKey,
  {
    volumes: Record<ModelSeries, Record<MonthKey, number>>;
    uphByMonth: Record<MonthKey, number>;
    workingHoursByMonth: Record<MonthKey, number>;
    manualTotalMP?: Partial<Record<MonthKey, number | null>>;
  }
>;

// LineB 12-Month Default Volumes (M09 September matches 1W+2W+3W+4W = 50,333 units)
export const INITIAL_LINE_B_MONTHLY_VOLUMES: Record<ModelSeries, Record<MonthKey, number>> = {
  'TM19/21': {
    M01: 18500,
    M02: 19200,
    M03: 22400,
    M04: 20800,
    M05: 21600,
    M06: 19800,
    M07: 19000,
    M08: 20500,
    M09: 21428, // 3788 + 5880 + 5880 + 5880
    M10: 22800,
    M11: 24200,
    M12: 23100,
  },
  TM14: {
    M01: 5400,
    M02: 5600,
    M03: 6500,
    M04: 6100,
    M05: 6300,
    M06: 5800,
    M07: 5500,
    M08: 6000,
    M09: 6229, // 1189 + 1680 + 1680 + 1680
    M10: 6600,
    M11: 7100,
    M12: 6800,
  },
  'BM TD': {
    M01: 3600,
    M02: 3800,
    M03: 4600,
    M04: 4200,
    M05: 4500,
    M06: 4000,
    M07: 3900,
    M08: 4200,
    M09: 4425, // 645 + 1260 + 1260 + 1260
    M10: 4800,
    M11: 5200,
    M12: 4900,
  },
  BM: {
    M01: 6800,
    M02: 7100,
    M03: 8600,
    M04: 7900,
    M05: 8300,
    M06: 7600,
    M07: 7200,
    M08: 7800,
    M09: 8156, // 2106 + 2100 + 1850 + 2100
    M10: 8700,
    M11: 9400,
    M12: 8900,
  },
  'T-Door': {
    M01: 1600,
    M02: 1750,
    M03: 2300,
    M04: 2100,
    M05: 2250,
    M06: 1900,
    M07: 1800,
    M08: 1950,
    M09: 2047, // 443 + 840 + 81 + 683
    M10: 2400,
    M11: 2750,
    M12: 2500,
  },
  SBS: {
    M01: 5500,
    M02: 5900,
    M03: 7400,
    M04: 6800,
    M05: 7100,
    M06: 6300,
    M07: 6000,
    M08: 6600,
    M09: 6988, // 1352 + 1680 + 2439 + 1517
    M10: 7600,
    M11: 8400,
    M12: 7900,
  },
  'T-Door ice': {
    M01: 0,
    M02: 120,
    M03: 350,
    M04: 280,
    M05: 320,
    M06: 150,
    M07: 100,
    M08: 180,
    M09: 0, // Matches 0 in September sheet
    M10: 420,
    M11: 650,
    M12: 500,
  },
};

// LineA 12-Month Default Volumes (M09 September matches LineA 1W+2W+3W+4W = 50,140 units)
export const INITIAL_LINE_A_MONTHLY_VOLUMES: Record<ModelSeries, Record<MonthKey, number>> = {
  'TM19/21': {
    M01: 18200,
    M02: 18900,
    M03: 21800,
    M04: 20400,
    M05: 21100,
    M06: 19500,
    M07: 18800,
    M08: 20100,
    M09: 20800, // 4200 + 5600 + 5600 + 5400
    M10: 22100,
    M11: 23500,
    M12: 22600,
  },
  TM14: {
    M01: 6200,
    M02: 6500,
    M03: 7400,
    M04: 7000,
    M05: 7300,
    M06: 6800,
    M07: 6500,
    M08: 6900,
    M09: 7220, // 1500 + 1960 + 1960 + 1800
    M10: 7600,
    M11: 8100,
    M12: 7800,
  },
  'BM TD': {
    M01: 3500,
    M02: 3700,
    M03: 4300,
    M04: 4000,
    M05: 4200,
    M06: 3800,
    M07: 3700,
    M08: 3950,
    M09: 4140, // 800 + 1120 + 1120 + 1100
    M10: 4450,
    M11: 4800,
    M12: 4600,
  },
  BM: {
    M01: 7200,
    M02: 7500,
    M03: 8900,
    M04: 8200,
    M05: 8600,
    M06: 7900,
    M07: 7600,
    M08: 8100,
    M09: 8490, // 1950 + 2240 + 2100 + 2200
    M10: 8950,
    M11: 9600,
    M12: 9100,
  },
  'T-Door': {
    M01: 1800,
    M02: 1900,
    M03: 2450,
    M04: 2200,
    M05: 2350,
    M06: 2050,
    M07: 1950,
    M08: 2100,
    M09: 2240, // 520 + 700 + 420 + 600
    M10: 2550,
    M11: 2850,
    M12: 2650,
  },
  SBS: {
    M01: 5100,
    M02: 5400,
    M03: 6600,
    M04: 6100,
    M05: 6400,
    M06: 5800,
    M07: 5500,
    M08: 5900,
    M09: 6110, // 1150 + 1540 + 1820 + 1600
    M10: 6700,
    M11: 7300,
    M12: 6900,
  },
  'T-Door ice': {
    M01: 850,
    M02: 920,
    M03: 1250,
    M04: 1100,
    M05: 1200,
    M06: 1000,
    M07: 950,
    M08: 1050,
    M09: 1140, // 280 + 280 + 280 + 300
    M10: 1300,
    M11: 1500,
    M12: 1380,
  },
};

export const INITIAL_MONTHLY_UPH: Record<MonthKey, number> = {
  M01: 122,
  M02: 126,
  M03: 148,
  M04: 138,
  M05: 144,
  M06: 130,
  M07: 125,
  M08: 135,
  M09: 140, // Baseline September UPH = 140
  M10: 148,
  M11: 158,
  M12: 150,
};

export const INITIAL_MONTHLY_WORKING_HOURS: Record<MonthKey, number> = {
  M01: 340,
  M02: 344,
  M03: 352,
  M04: 340,
  M05: 350,
  M06: 350,
  M07: 348,
  M08: 350,
  M09: 359, // ~50,333 / 140 = 359.5 hrs
  M10: 356,
  M11: 365,
  M12: 364,
};

export const INITIAL_MONTHLY_PLAN_BY_LINE: MonthlyPlanByLine = {
  LineA: {
    volumes: JSON.parse(JSON.stringify(INITIAL_LINE_A_MONTHLY_VOLUMES)),
    uphByMonth: { ...INITIAL_MONTHLY_UPH },
    workingHoursByMonth: { ...INITIAL_MONTHLY_WORKING_HOURS },
    manualTotalMP: {},
  },
  LineB: {
    volumes: JSON.parse(JSON.stringify(INITIAL_LINE_B_MONTHLY_VOLUMES)),
    uphByMonth: { ...INITIAL_MONTHLY_UPH },
    workingHoursByMonth: { ...INITIAL_MONTHLY_WORKING_HOURS },
    manualTotalMP: {},
  },
};

export interface MonthlyStationMetric {
  station: StationConfig;
  byMonth: Record<
    MonthKey,
    {
      weightedST: number;
      uph: number;
      exactMP: number;
      stdMP: number;
      manHours: number;
    }
  >;
  avgMP: number;
  minMP: number;
  maxMP: number;
}

export interface YearlyTrendMetrics {
  totalVolumeByMonth: Record<MonthKey, number>;
  mixRatiosByMonth: Record<MonthKey, Record<ModelSeries, number>>;
  effectiveUphByMonth: Record<MonthKey, number>;
  workingHoursByMonth: Record<MonthKey, number>;
  totalWeightedSTByMonth: Record<MonthKey, number>;
  totalExactMPByMonth: Record<MonthKey, number>;
  totalStdMPByMonth: Record<MonthKey, number>;
  cabStdMPByMonth: Record<MonthKey, number>;
  fgStdMPByMonth: Record<MonthKey, number>;
  lineHoursRequiredByMonth: Record<MonthKey, number>;
  stationRows: MonthlyStationMetric[];
  yearlyAvgMP: number;
  yearlyMinMP: number;
  yearlyMaxMP: number;
  peakMonth: MonthKey;
  lowMonth: MonthKey;
  totalAnnualVolume: number;
}

export function calculateYearlyMPTrend(
  allLineStations: StationConfig[],
  activeSheet: SheetKey,
  linePlan: MonthlyPlanByLine[LineKey],
  useDynamicVolumeUph: boolean = false
): YearlyTrendMetrics {
  const cabStations = allLineStations.filter((s) => s.subArea === 'CAB');
  const fgStations = allLineStations.filter((s) => s.subArea === 'FG');
  const targetStations =
    activeSheet === 'CAB'
      ? cabStations
      : activeSheet === 'FG'
      ? fgStations
      : allLineStations;

  const totalVolumeByMonth = {} as Record<MonthKey, number>;
  const mixRatiosByMonth = {} as Record<MonthKey, Record<ModelSeries, number>>;
  const effectiveUphByMonth = {} as Record<MonthKey, number>;
  const workingHoursByMonth = {} as Record<MonthKey, number>;

  let totalAnnualVolume = 0;

  for (const mMeta of MONTHS) {
    const mk = mMeta.key;
    let sumVol = 0;
    for (const model of INITIAL_MODELS) {
      sumVol += Math.max(0, linePlan.volumes[model.id]?.[mk] || 0);
    }
    totalVolumeByMonth[mk] = sumVol;
    totalAnnualVolume += sumVol;

    mixRatiosByMonth[mk] = {} as Record<ModelSeries, number>;
    for (const model of INITIAL_MODELS) {
      const v = Math.max(0, linePlan.volumes[model.id]?.[mk] || 0);
      mixRatiosByMonth[mk][model.id] = sumVol > 0 ? v / sumVol : 0;
    }

    const workHrs = Math.max(1, linePlan.workingHoursByMonth?.[mk] || 359);
    workingHoursByMonth[mk] = workHrs;

    if (useDynamicVolumeUph) {
      effectiveUphByMonth[mk] = sumVol > 0 ? Math.round((sumVol / workHrs) * 10) / 10 : 0;
    } else {
      effectiveUphByMonth[mk] = Math.max(1, linePlan.uphByMonth?.[mk] || 140);
    }
  }

  const computeStationMonth = (station: StationConfig, mk: MonthKey) => {
    const vol = totalVolumeByMonth[mk];
    const uph = effectiveUphByMonth[mk];
    let weightedST = 0;
    for (const model of INITIAL_MODELS) {
      const st = station.standardTimes[model.id] || 0;
      weightedST += st * (mixRatiosByMonth[mk][model.id] || 0);
    }
    const safeEff = Math.max(0.05, station.efficiency || 0.8);
    const exactMP = vol > 0 ? (weightedST * uph) / (3600 * safeEff) : 0;
    const stdMP = Math.round(exactMP);
    const manHours = (weightedST * vol) / (3600 * safeEff);
    return {
      weightedST,
      uph,
      exactMP,
      stdMP,
      manHours,
    };
  };

  const stationRows: MonthlyStationMetric[] = targetStations.map((station) => {
    const byMonth = {} as MonthlyStationMetric['byMonth'];
    const mpValues: number[] = [];
    for (const mMeta of MONTHS) {
      const mk = mMeta.key;
      const res = computeStationMonth(station, mk);
      byMonth[mk] = res;
      mpValues.push(res.stdMP);
    }
    const sumMP = mpValues.reduce((a, b) => a + b, 0);
    return {
      station,
      byMonth,
      avgMP: Math.round(sumMP / MONTHS.length),
      minMP: Math.min(...mpValues),
      maxMP: Math.max(...mpValues),
    };
  });

  const cabStdMPByMonth = {} as Record<MonthKey, number>;
  const fgStdMPByMonth = {} as Record<MonthKey, number>;
  const totalWeightedSTByMonth = {} as Record<MonthKey, number>;
  const totalExactMPByMonth = {} as Record<MonthKey, number>;
  const totalStdMPByMonth = {} as Record<MonthKey, number>;
  const lineHoursRequiredByMonth = {} as Record<MonthKey, number>;

  for (const mMeta of MONTHS) {
    const mk = mMeta.key;
    let cabMP = 0;
    for (const st of cabStations) {
      cabMP += computeStationMonth(st, mk).stdMP;
    }
    let fgMP = 0;
    for (const st of fgStations) {
      fgMP += computeStationMonth(st, mk).stdMP;
    }
    cabStdMPByMonth[mk] = cabMP;
    fgStdMPByMonth[mk] = fgMP;

    let sumWST = 0;
    let sumExact = 0;
    let sumStd = 0;
    for (const row of stationRows) {
      sumWST += row.byMonth[mk].weightedST;
      sumExact += row.byMonth[mk].exactMP;
      sumStd += row.byMonth[mk].stdMP;
    }

    const manualOverride = linePlan.manualTotalMP?.[mk];
    totalWeightedSTByMonth[mk] = sumWST;
    totalExactMPByMonth[mk] = sumExact;
    totalStdMPByMonth[mk] =
      manualOverride !== undefined && manualOverride !== null ? manualOverride : sumStd;
    lineHoursRequiredByMonth[mk] =
      effectiveUphByMonth[mk] > 0
        ? totalVolumeByMonth[mk] / effectiveUphByMonth[mk]
        : 0;
  }

  const allMonthlyMPs = MONTHS.map((m) => totalStdMPByMonth[m.key]);
  const yearlyAvgMP = Math.round(
    allMonthlyMPs.reduce((a, b) => a + b, 0) / MONTHS.length
  );
  const yearlyMinMP = Math.min(...allMonthlyMPs);
  const yearlyMaxMP = Math.max(...allMonthlyMPs);

  let peakMonth: MonthKey = 'M09';
  let lowMonth: MonthKey = 'M01';
  let maxVal = -Infinity;
  let minVal = Infinity;
  for (const mMeta of MONTHS) {
    const val = totalStdMPByMonth[mMeta.key];
    if (val > maxVal) {
      maxVal = val;
      peakMonth = mMeta.key;
    }
    if (val < minVal) {
      minVal = val;
      lowMonth = mMeta.key;
    }
  }

  return {
    totalVolumeByMonth,
    mixRatiosByMonth,
    effectiveUphByMonth,
    workingHoursByMonth,
    totalWeightedSTByMonth,
    totalExactMPByMonth,
    totalStdMPByMonth,
    cabStdMPByMonth,
    fgStdMPByMonth,
    lineHoursRequiredByMonth,
    stationRows,
    yearlyAvgMP,
    yearlyMinMP,
    yearlyMaxMP,
    peakMonth,
    lowMonth,
    totalAnnualVolume,
  };
}

