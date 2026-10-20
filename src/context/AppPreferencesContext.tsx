import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { MonthKey, MONTHS } from '../data/mpModelData';
import { Globe, Sun, Moon, Cpu } from 'lucide-react';

export type Language = 'th' | 'zh' | 'en';
export type ThemeMode = 'light' | 'dark' | 'industrial';

interface AppPreferencesContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  t: (th: string, zh: string, en: string) => string;
  localizeStationDesc: (stationName: string, fallbackThai: string) => string;
  localizeModelDesc: (modelId: string, fallbackThai: string) => string;
  localizeMonth: (monthKey: MonthKey) => { short: string; full: string; sub: string };
}

const STORAGE_KEY_LANG = 'factory_mp_app_lang_v1';
const STORAGE_KEY_THEME = 'factory_mp_app_theme_v1';

const STATION_TRANSLATIONS: Record<string, { zh: string; en: string }> = {
  Rooling: {
    zh: '箱体辊轧折弯线 (Cabinet Rolling)',
    en: 'Cabinet Rolling & Bending Line',
  },
  'Inner Box2': {
    zh: '内胆预装线 2 (TM14 / 多门 / 对开门)',
    en: 'Inner Box Sub-Assembly 2 (TM14 / Multi-Door / SBS)',
  },
  'Inner Box 1': {
    zh: '内胆预装线 1 (TM19/21 / BM TD / BM)',
    en: 'Inner Box Sub-Assembly 1 (TM19/21 / BM TD / BM)',
  },
  'Cab per2': {
    zh: '箱体预装线 2 (TM14 / 多门 / 对开门)',
    en: 'Cabinet Pre-Assembly 2 (TM14 / Multi-Door / SBS)',
  },
  'Cab per1': {
    zh: '箱体预装线 1 (TM19/21 / BM TD / BM)',
    en: 'Cabinet Pre-Assembly 1 (TM19/21 / BM TD / BM)',
  },
  'เตรียม Compressor': {
    zh: '压缩机预装线 (Compressor Prep)',
    en: 'Compressor Preparation & Sub-Assembly',
  },
  'PU FOAM (Pre-System)': {
    zh: '箱体发泡预装线 (PU Foam Pre-System)',
    en: 'PU Foam Pre-System Preparation',
  },
  'A (SBS/TD Foam)': {
    zh: 'A线发泡后整理 (对开门 / 多门)',
    en: 'Line A Post-Foaming (SBS / Multi-Door)',
  },
  'A (TM/BM Foam)': {
    zh: 'A线发泡后整理 (顶冷 / 底冷机型)',
    en: 'Line A Post-Foaming (Top / Bottom Mount)',
  },
  FG1: {
    zh: '总装 1 段 (管路焊接、抽真空与充注)',
    en: 'Final Assembly 1 (Piping, Vacuum & Refrigerant Charging)',
  },
  FG2: {
    zh: '总装 2 段 (门体安装、内饰件与终检包装)',
    en: 'Final Assembly 2 (Door Mounting, Interior & Final Packing)',
  },
  'A (SBS/TD Final)': {
    zh: 'A段主装配线 (对开门 / 多门冰箱)',
    en: 'Line A Final Assembly (SBS / Multi-Door)',
  },
  'เตรียม Evaporator': {
    zh: '蒸发器预装线 (Evaporator Prep)',
    en: 'Evaporator Preparation & Sub-Assembly',
  },
  'งานเตรียมประตู': {
    zh: '门体预装与门发泡线 (Door Prep & Foam)',
    en: 'Door Preparation & Door Foaming Line',
  },
  'B (SBS/TD Final)': {
    zh: 'B段商检与包装线 (对开门 / 多门)',
    en: 'Line B Inspection, Testing & Packing (SBS / Multi-Door)',
  },
  'B (TM/BM Final)': {
    zh: 'B段商检与包装线 (顶冷 / 底冷机型)',
    en: 'Line B Inspection, Testing & Packing (TM / BM)',
  },
};

const MODEL_TRANSLATIONS: Record<string, { zh: string; en: string }> = {
  'TM19/21': {
    zh: '双门顶冷冰箱 (Top Mount 19/21Q)',
    en: '2-Door Top Mount Refrigerator (19/21Q)',
  },
  TM14: {
    zh: '双门顶冷冰箱 (Top Mount 14Q)',
    en: '2-Door Top Mount Refrigerator (14Q)',
  },
  'BM TD': {
    zh: '三门底冷冰箱 (Bottom Mount TD)',
    en: '3-Door Bottom Mount Refrigerator (BM TD)',
  },
  BM: {
    zh: '双门底冷冰箱 (Bottom Mount)',
    en: '2-Door Bottom Mount Refrigerator (BM)',
  },
  'T-Door': {
    zh: '三门精致冰箱 (Three-Door)',
    en: '3-Door Multi-Door Refrigerator (T-Door)',
  },
  SBS: {
    zh: '对开门大冰箱 (Side-by-Side)',
    en: 'Side-by-Side Large Refrigerator (SBS)',
  },
  'T-Door ice': {
    zh: '三门制冰款冰箱 (T-Door Ice Maker)',
    en: '3-Door Ice Maker Refrigerator (T-Door Ice)',
  },
};

// Comprehensive trilingual dictionary (Thai, Chinese, English) across all 6 pages + modals
const RAW_PHRASE_DICTIONARY: Array<[string, string, string]> = [
  // Line A & Line B Separation & Comparison Sheet
  ['แยกไลน์ Line A vs Line B (ST & กำลังคน)', '分线对比 LineA 与 LineB (工时与定编)', 'Separate Line A vs Line B (ST & MP)'],
  ['Sheet เปรียบเทียบ Line A vs Line B (ST & กำลังคน)', 'LineA 与 LineB 工时与定编对比工作表', 'Line A vs Line B Comparison Sheet (ST & MP)'],
  ['Sheet เปรียบเทียบ Line A vs Line B', 'LineA 与 LineB 综合对比工作表', 'Line A vs Line B Comparison Sheet'],
  ['เปรียบเทียบ Line A vs Line B', 'LineA 与 LineB 对比', 'Compare Line A vs Line B'],
  ['แยกไลน์ LineA , Line B', '分离 LineA 与 LineB 产线', 'Separate Line A & Line B'],
  ['เปรียบเทียบเวลามาตรฐานรายรุ่น & กำลังคนที่ใช้จริง', '对比各型号标准工时与实际所需定编', 'Compare Standard Times by Model & Actual MP Requirements'],
  ['เวลามาตรฐานแต่ละรุ่นไม่เท่ากัน ใช้กำลังคนแตกต่างกัน', '各机型标准工时不同，所需工段定编与人员差异明显', 'Standard times differ by model, requiring different manpower allocations'],

  // Station Thai Names (LineB & LineA)
  ['งานม้วนพับตัวถัง (Cabinet Rolling Line A)', '箱体辊轧折弯 (Line A 辊轧)', 'Cabinet Rolling Line A'],
  ['ประกอบกล่องใน 2 (รุ่น TM14 / Multi-Door / SBS Line A)', '内胆预装 2 (TM14 / 多门 / 对开门 Line A)', 'Inner Box Sub-Assy 2 Line A'],
  ['ประกอบกล่องใน 1 (รุ่น TM19/21 / BM TD / BM Line A)', '内胆预装 1 (TM19/21 / BM TD / BM Line A)', 'Inner Box Sub-Assy 1 Line A'],
  ['เตรียมตู้ Cab 2 (รุ่น TM14 / Multi-Door / SBS Line A)', '箱体预装 2 (TM14 / 多门 / 对开门 Line A)', 'Cabinet Pre-Assy 2 Line A'],
  ['เตรียมตู้ Cab 1 (รุ่น TM19/21 / BM TD / BM Line A)', '箱体预装 1 (TM19/21 / BM TD / BM Line A)', 'Cabinet Pre-Assy 1 Line A'],
  ['งานเตรียมคอมเพรสเซอร์ (Compressor Prep Line A)', '压缩机预装 (Line A 压缩机)', 'Compressor Prep Line A'],
  ['เตรียมงานก่อนฉีดโฟม PU (PU Foam Pre-System Line A)', '发泡前预装 (Line A 发泡预装)', 'PU Foam Pre-System Line A'],
  ['ไลน์ฉีดโฟม A (Cabinet Foaming Line A)', 'Line A 发泡线 (Cabinet Foaming)', 'Cabinet Foaming Line A'],
  ['งานประกอบท่อและเชื่อมระบบเย็น (Cooling Pipe & Welding Line A)', '管路焊接与抽真空 (Line A 管路)', 'Cooling Pipe & Welding Line A'],
  ['งานประกอบขั้นสุดท้าย 1 (Final Assembly 1 Line A)', '总装 1 段 (Line A 总装 1)', 'Final Assembly 1 Line A'],
  ['งานประกอบขั้นสุดท้าย 2 (Final Assembly 2 Line A)', '总装 2 段 (Line A 总装 2)', 'Final Assembly 2 Line A'],
  ['งานประกอบบานประตูตู้เย็น (Door Assembly Line A)', '门体装配线 (Line A 门体)', 'Door Assembly Line A'],
  ['งานตรวจสอบการรั่วซึมและแรงดันลม (Air Leak Test Line A)', '气密性检测 (Line A 气密性)', 'Air Leak Test Line A'],
  ['งานทดสอบระบบทำความเย็น (Cooling Performance Test Line A)', '制冷性能检测 (Line A 制冷性能)', 'Cooling Performance Test Line A'],
  ['งานตรวจสอบขั้นสุดท้ายและทำความสะอาด (Final Inspection Line A)', '最终检验与清洁 (Line A 最终检验)', 'Final Inspection Line A'],
  ['งานบรรจุหีบห่อสินค้าสำเร็จรูป (Final Packing Line A)', '成品包装入库 (Line A 包装)', 'Final Packing Line A'],
  ['งานม้วนพับตัวถัง (Cabinet Rolling) — LineA', '箱体辊轧折弯 (Cabinet Rolling) — LineA', 'Cabinet Rolling & Bending — LineA'],
  ['ประกอบกล่องใน 2 (รุ่น TM14 / Multi-Door / SBS) — LineA', '内胆预装 2 (TM14 / 多门 / 对开门) — LineA', 'Inner Box Sub-Assy 2 (TM14 / Multi-Door / SBS) — LineA'],
  ['ประกอบกล่องใน 1 (รุ่น TM19/21 / BM TD / BM) — LineA', '内胆预装 1 (TM19/21 / BM TD / BM) — LineA', 'Inner Box Sub-Assy 1 (TM19/21 / BM TD / BM) — LineA'],
  ['เตรียมตู้ Cab 2 (รุ่น TM14 / Multi-Door / SBS) — LineA', '箱体预装 2 (TM14 / 多门 / 对开门) — LineA', 'Cabinet Pre-Assy 2 (TM14 / Multi-Door / SBS) — LineA'],
  ['เตรียมตู้ Cab 1 (รุ่น TM19/21 / BM TD / BM) — LineA', '箱体预装 1 (TM19/21 / BM TD / BM) — LineA', 'Cabinet Pre-Assy 1 (TM19/21 / BM TD / BM) — LineA'],
  ['งานเตรียมคอมเพรสเซอร์ (Compressor Prep) — LineA', '压缩机预装 (Compressor Prep) — LineA', 'Compressor Preparation — LineA'],
  ['เตรียมงานก่อนฉีดโฟม PU (PU Foam Pre-System) — LineA', '发泡前预装 (PU Foam Pre-System) — LineA', 'PU Foam Pre-System Prep — LineA'],
  ['ไลน์ฉีดโฟม A (เฉพาะรุ่น SBS / T-Door) — LineA', 'A线发泡整理 (对开门 / 多门) — LineA', 'Line A Foaming (SBS / T-Door) — LineA'],
  ['ไลน์ฉีดโฟม A (เฉพาะรุ่น TM / BM) — LineA', 'A线发泡整理 (顶冷 / 底冷) — LineA', 'Line A Foaming (TM / BM) — LineA'],
  ['งานประกอบขั้นสุดท้าย 1 (ระบบท่อ เชื่อม และแวคคั่ม) — LineA', '总装 1 段 (管路焊接与抽真空) — LineA', 'Final Assembly 1 (Piping, Welding & Vacuum) — LineA'],
  ['งานประกอบขั้นสุดท้าย 2 (ประกอบประตู ชั้นวาง และตกแต่ง) — LineA', '总装 2 段 (门体与内饰装配) — LineA', 'Final Assembly 2 (Door & Interior Assembly) — LineA'],
  ['ไลน์ประกอบหลัก A (เฉพาะรุ่น SBS / T-Door) — LineA', 'A段主装配线 (对开门 / 多门) — LineA', 'Main Final Line A (SBS / T-Door) — LineA'],
  ['งานเตรียมชุดคอยล์เย็น (Evaporator Prep) — LineA', '蒸发器预装 (Evaporator Prep) — LineA', 'Evaporator Preparation — LineA'],
  ['งานเตรียมและฉีดโฟมประตู (Door Prep & Foam) — LineA', '门体预装与发泡 (Door Prep & Foam) — LineA', 'Door Preparation & Foaming — LineA'],
  ['ไลน์ทดสอบและแพ็คกิ้ง B (เฉพาะรุ่น SBS / T-Door) — LineA', 'B段检测与包装 (对开门 / 多门) — LineA', 'Testing & Packing Line B (SBS / T-Door) — LineA'],
  ['ไลน์ทดสอบและแพ็คกิ้ง B (เฉพาะรุ่น TM / BM) — LineA', 'B段检测与包装 (顶冷 / 底冷) — LineA', 'Testing & Packing Line B (TM / BM) — LineA'],
  ['งานม้วนพับตัวถัง (Cabinet Rolling)', '箱体辊轧折弯 (Cabinet Rolling)', 'Cabinet Rolling & Bending'],
  ['ประกอบกล่องใน 2 (รุ่น TM14 / Multi-Door / SBS)', '内胆预装 2 (TM14 / 多门 / 对开门)', 'Inner Box Sub-Assy 2 (TM14 / Multi-Door / SBS)'],
  ['ประกอบกล่องใน 1 (รุ่น TM19/21 / BM TD / BM)', '内胆预装 1 (TM19/21 / BM TD / BM)', 'Inner Box Sub-Assy 1 (TM19/21 / BM TD / BM)'],
  ['เตรียมตู้ Cab 2 (รุ่น TM14 / Multi-Door / SBS)', '箱体预装 2 (TM14 / 多门 / 对开门)', 'Cabinet Pre-Assy 2 (TM14 / Multi-Door / SBS)'],
  ['เตรียมตู้ Cab 1 (รุ่น TM19/21 / BM TD / BM)', '箱体预装 1 (TM19/21 / BM TD / BM)', 'Cabinet Pre-Assy 1 (TM19/21 / BM TD / BM)'],
  ['งานเตรียมคอมเพรสเซอร์ (Compressor Prep)', '压缩机预装 (Compressor Prep)', 'Compressor Preparation'],
  ['เตรียมงานก่อนฉีดโฟม PU (PU Foam Pre-System)', '发泡前预装 (PU Foam Pre-System)', 'PU Foam Pre-System Prep'],
  ['ไลน์ฉีดโฟม A (เฉพาะรุ่น SBS / T-Door)', 'A线发泡整理 (对开门 / 多门)', 'Line A Foaming (SBS / T-Door)'],
  ['ไลน์ฉีดโฟม A (เฉพาะรุ่น TM / BM)', 'A线发泡整理 (顶冷 / 底冷)', 'Line A Foaming (TM / BM)'],
  ['งานประกอบขั้นสุดท้าย 1 (ระบบท่อ เชื่อม และแวคคั่ม)', '总装 1 段 (管路焊接与抽真空)', 'Final Assembly 1 (Piping, Welding & Vacuum)'],
  ['งานประกอบขั้นสุดท้าย 2 (ประกอบประตู ชั้นวาง และตกแต่ง)', '总装 2 段 (门体与内饰装配)', 'Final Assembly 2 (Door & Interior Assembly)'],
  ['ไลน์ประกอบหลัก A (เฉพาะรุ่น SBS / T-Door)', 'A段主装配线 (对开门 / 多门)', 'Main Final Line A (SBS / T-Door)'],
  ['งานเตรียมชุดคอยล์เย็น (Evaporator Prep)', '蒸发器预装 (Evaporator Prep)', 'Evaporator Preparation'],
  ['งานเตรียมและฉีดโฟมประตู (Door Prep & Foam)', '门体预装与发泡 (Door Prep & Foam)', 'Door Preparation & Foaming'],
  ['ไลน์ทดสอบและแพ็คกิ้ง B (เฉพาะรุ่น SBS / T-Door)', 'B段检测与包装 (对开门 / 多门)', 'Testing & Packing Line B (SBS / T-Door)'],
  ['ไลน์ทดสอบและแพ็คกิ้ง B (เฉพาะรุ่น TM / BM)', 'B段检测与包装 (顶冷 / 底冷)', 'Testing & Packing Line B (TM / BM)'],
  ['งานเตรียมคอมเพรสเซอร์', '压缩机预装', 'Compressor Preparation'],
  ['งานเตรียมชุดคอยล์เย็น', '蒸发器预装', 'Evaporator Preparation'],
  ['งานเตรียมประตู', '门体预装与发泡', 'Door Prep & Foaming'],
  ['เตรียม Compressor', '压缩机预装 (Compressor Prep)', 'Compressor Prep'],
  ['เตรียม Evaporator', '蒸发器预装 (Evaporator Prep)', 'Evaporator Prep'],

  // Model Thai Names
  ['ตู้เย็น 2 ประตู บน (Top Mount 19/21Q)', '双门顶冷冰箱 (Top Mount 19/21Q)', '2-Door Top Mount (19/21Q)'],
  ['ตู้เย็น 2 ประตู บน (Top Mount 14Q)', '双门顶冷冰箱 (Top Mount 14Q)', '2-Door Top Mount (14Q)'],
  ['ตู้เย็นช่องแข็งล่าง 3 ประตู (Bottom Mount TD)', '三门底冷冰箱 (Bottom Mount TD)', '3-Door Bottom Mount (BM TD)'],
  ['ตู้เย็นช่องแข็งล่าง (Bottom Mount)', '双门底冷冰箱 (Bottom Mount)', 'Bottom Mount (BM)'],
  ['ตู้เย็นมินิมอล 3 ประตู (Three-Door)', '三门冰箱 (Three-Door)', '3-Door Refrigerator (T-Door)'],
  ['ตู้เย็น Side-by-Side 2 ประตูใหญ่', '对开门大冰箱 (Side-by-Side)', 'Side-by-Side Refrigerator (SBS)'],
  ['ตู้เย็น 3 ประตู ระบบทำน้ำแข็ง (T-Door Ice)', '三门制冰冰箱 (T-Door Ice)', '3-Door Ice Maker (T-Door Ice)'],

  // App Header, Footer & Storage Modal
  [
    '泰国工厂标准定编测算模型 · ระบบคำนวณและคาดการณ์อัตรากำลังคนมาตรฐาน (LineA & LineB — Sheet CAB, Sheet FG & กราฟแนวโน้ม 12 เดือน)',
    '泰国工厂标准定编测算模型 · 冰箱产线标准定编与产能动态预测系统 (LineA & LineB — CAB, FG 与 12个月趋势)',
    'Thailand Factory Standard Manpower Model · Dynamic LineA & LineB (CAB, FG & 12-Month Trend)',
  ],
  [
    'ระบบบันทึกและจัดเก็บข้อมูลตารางคำนวณ (LineA & LineB — รายสัปดาห์ & 12 เดือน)',
    '数据保存与版本管理系统 (LineA & LineB — 周计划与 12个月趋势)',
    'Data Save & Version Management System (LineA & LineB — Weekly & 12-Month)',
  ],
  [
    'บันทึกเวอร์ชันข้อมูลทั้ง LineA และ LineB ไว้บนเว็บเบราว์เซอร์ หรือดาวน์โหลดเป็นไฟล์สำรอง (.json)',
    '在浏览器中保存 LineA 与 LineB 数据快照，或导出为备份文件 (.json)',
    'Save LineA & LineB snapshots in browser storage or download as backup (.json)',
  ],
  [
    '1. บันทึกข้อมูลปัจจุบันเก็บไว้ในรายการบนเว็บ (Save Snapshot)',
    '1. 将当前全站数据保存为版本快照 (Save Snapshot)',
    '1. Save Current Web Data as a Snapshot Version',
  ],
  [
    'ตั้งชื่อชุดข้อมูล เช่น แผนผลิต 12 เดือน (LineA + LineB)...',
    '输入版本名称，例如：12个月排产定编方案 (LineA + LineB)...',
    'Enter snapshot name, e.g., 12-Month Production Plan (LineA + LineB)...',
  ],
  ['บันทึกเวอร์ชันนี้', '保存此版本', 'Save Snapshot'],
  ['2. รายการเวอร์ชันที่บันทึกไว้', '2. 已保存的数据版本列表', '2. Saved Snapshot Versions'],
  [
    'ยังไม่มีเวอร์ชันที่บันทึกแยกไว้ (ข้อมูลปัจจุบันถูกบันทึกอัตโนมัติในเบราว์เซอร์อยู่แล้ว)',
    '暂无手动保存的版本快照（当前数据已自动保存在浏览器中）',
    'No manual snapshots saved yet (current data is auto-saved in browser)',
  ],
  ['บันทึกเมื่อ:', '保存时间:', 'Saved at:'],
  ['สถานีรวม', '个工段合计', 'total stations'],
  ['เรียกใช้', '加载使用', 'Load'],
  ['ลบรายการนี้', '删除此版本', 'Delete this snapshot'],
  ['ดาวน์โหลดไฟล์ข้อมูล (.json)', '导出备份文件 (.json)', 'Download Backup (.json)'],
  ['นำเข้าไฟล์ข้อมูล (.json)', '导入备份文件 (.json)', 'Import Backup (.json)'],
  ['คืนค่าข้อมูลเริ่มต้นโรงงาน', '恢复工厂初始默认数据', 'Reset to Factory Defaults'],
  ['จัดการเวอร์ชันข้อมูลที่บันทึกไว้', '管理已保存的数据版本', 'Manage Saved Versions'],
  [
    'คืนค่าข้อมูลมาตรฐานเริ่มต้นทั้ง LineA และ LineB',
    '恢复 LineA 与 LineB 初始标准数据',
    'Reset LineA & LineB to Factory Defaults',
  ],

  // Dashboard Overview Page
  [
    'แดชบอร์ดวิเคราะห์อัตรากำลังคนและประสิทธิภาพการผลิต',
    '标准定编与生产效率分析看板',
    'Standard Manpower & Production Efficiency Dashboard',
  ],
  [
    'สรุปภาพรวมทุก Sheet บนเว็บ',
    '全网各工作表总览',
    'Factory-Wide All-Sheets Summary',
  ],
  [
    'คลิกเลือกดูแต่ละ Sheet ได้ทันที',
    '点击任意卡片即可切换工作表',
    'Click any card to switch sheets immediately',
  ],
  [
    'คลิกตัวเลขในทุกตารางเพื่อแก้ไขได้ทันที',
    '点击表格中任意数字即可直接编辑',
    'Click any number in the tables to edit directly',
  ],
  ['ค่าทศนิยม:', '精确计算值:', 'Exact MP:'],
  ['ยอดคำสั่งผลิตสัปดาห์', '周订单产量', 'Weekly Order Volume'],
  ['เครื่อง (Units)', '台 (Units)', 'Units'],
  ['รวมทั้งเดือน:', '全月合计:', 'Monthly Total:'],
  ['วินาที / เครื่อง', '秒 / 台', 'sec / unit'],
  ['นาที/เครื่อง', '分钟/台', 'min/unit'],
  ['ชั่วโมงเดินสายการผลิตที่ต้องการ', '所需产线运行工时', 'Required Line Operating Hours'],
  ['ชม. เดินไลน์ / สัปดาห์', '开线小时 / 周', 'Line Hrs / Week'],
  ['กะ (8 ชม.)', '班次 (8小时/班)', 'Shifts (8 hrs)'],
  ['คอขวด:', '最高定编工段:', 'Bottleneck:'],
  ['อัตรากำลังคนมาตรฐานรายสถานีงาน', '各工段标准定编人数明细', 'Station-by-Station Standard Manpower'],
  [
    'คลิกเลือกสถานีเพื่อแก้ไขเวลามาตรฐาน (产品工时), UPH, Efficiency หรือชื่อสถานีด้านขวา',
    '点击任意工段可在右侧直接修改标准工时 (产品工时)、UPH、效率或工段名称',
    'Click any station to edit Standard Time, UPH, Efficiency, or Station Name on the right',
  ],
  [
    'แก้ไขข้อมูลและสูตรคำนวณรายสถานี',
    '编辑工段参数与定编计算公式',
    'Edit Station Parameters & MP Formula',
  ],
  ['ค่าจริง:', '精确值:', 'Exact:'],
  [
    '1. แก้ไขเวลามาตรฐาน (产品工时) และยอดผลิต',
    '1. 直接编辑各机型标准工时 (产品工时) 与订单量',
    '1. Edit Model Standard Time & Order Volume',
  ],
  ['ได้โดยตรง:', '（实时生效）:', 'directly:'],
  ['รุ่น (Model)', '机型 (Model)', 'Model'],
  ['เวลามาตรฐาน (s)', '标准工时 (秒)', 'Std Time (s)'],
  ['รวม (SUM)', '合计 (SUM)', 'Total (SUM)'],
  [
    '2. สูตรคำนวณกำลังคนมาตรฐาน (STD MP Formula):',
    '2. 标准定编人数计算公式 (STD MP Formula):',
    '2. Standard Manpower Calculation Formula (STD MP):',
  ],
  [
    'ในไฟล์ภาพต้นฉบับ ช่อง 加权工时 แสดงค่าซ้ำกับแถว Rooling (143, 157, 138, 154) แต่ช่อง STD MP (18, 18, 19, 17) คำนวณจากค่าจริงคือ 381, 378, 390, 352 วินาที',
    '原表图片中 Inner Box2 的“加权工时”误复制了上一行 Rooling 的数值 (143, 157, 138, 154)，但其标准定编 STD MP (18, 18, 19, 17) 实际按真实加权工时 (381, 378, 390, 352 秒) 计算得出',
    'In the original sheet, Inner Box2 displayed Rooling weighted ST (143, 157, 138, 154), while STD MP (18, 18, 19, 17) was calculated from true weighted ST (381, 378, 390, 352s)',
  ],
  [
    'สัดส่วนการผลิตรายรุ่น (9月份产量占比 — แก้ไขชื่อรุ่นและยอด',
    '各机型产量占比 (9月份产量占比 — 可直接编辑机型与产量',
    'Production Mix by Model (Editable model name & volume',
  ],
  ['ดูตารางเต็ม', '查看完整主表', 'Full Master Table'],
  [
    'ตารางสรุปอัตรากำลังคนมาตรฐานทุกสถานี',
    '全工段标准定编汇总表',
    'All-Stations Standard Manpower Summary Table',
  ],
  ['แก้ไขได้ทุกช่อง', '所有单元格均可编辑', 'All cells editable'],
  [
    'พิมพ์แก้ไขชื่อสถานี, UPH, Efficiency, เวลาถ่วงน้ำหนัก หรือ STD MP รายสัปดาห์ได้โดยตรง',
    '可直接修改工段名称、UPH、平衡率、加权工时或各周标准定编 STD MP',
    'Directly edit station name, UPH, Efficiency, Weighted ST, or weekly STD MP',
  ],
  ['ซิงค์ข้อมูลทุก Sheet อัตโนมัติ', '全网所有工作表实时自动同步', 'Auto-synced across all sheets'],
  ['รวมจริง', '实际总计', 'Actual Total'],
  ['ค่าบรรทัดรวมตามไฟล์ต้นฉบับ', '原表底部合计参考值', 'Original Sheet Footer Reference'],

  // Master Spreadsheet View Page
  [
    'คลิกแก้ไขตัวเลขและข้อความได้ทุกช่อง',
    '所有数字与文本单元格均可点击编辑',
    'Click any number or text cell to edit directly',
  ],
  [
    'ตารางฐานข้อมูลเวลามาตรฐานและการจัดสรรบุคลากรตามมาตรฐาน',
    '标准工时与产线标准定编测算主数据表',
    'Master Standard Time & Workforce Allocation Spreadsheet',
  ],
  [
    'คำนวณตามสูตรจริง (IE Accurate)',
    '按 IE 真实公式计算 (IE Accurate)',
    'IE Accurate Formula Mode',
  ],
  [
    'แสดงตามไฟล์ภาพต้นฉบับ',
    '按原表显示数值模式',
    'Original Sheet Display Mode',
  ],
  ['คืนค่าเริ่มต้น', '重置默认值', 'Reset Defaults'],
  ['ทุกสถานีในมุมมองนี้', '当前视图全部工段', 'All Stations in View'],
  ['ค้นหาชื่อสถานี...', '搜索工段名称...', 'Search station name...'],
  [
    '* คลิกที่ช่องตัวเลขเพื่อพิมพ์แก้ไขได้ทันที (产品工时, 9月订单量, 加权工时, UPH, 标准定编 STD MP)',
    '* 点击任意数字单元格即可直接修改 (产品工时, 9月订单量, 加权工时, UPH, 标准定编 STD MP)',
    '* Click any cell to edit directly (Standard Time, Order Volume, Weighted ST, UPH, STD MP)',
  ],
  ['พื้นที่', '区域 (Area)', 'Area'],
  ['สถานีงาน & Efficiency', '工段名称与效率', 'Station & Efficiency'],
  ['รุ่นสินค้า', '机型系列', 'Model Series'],
  ['เวลามาตรฐาน(s)', '标准工时(秒)', 'Std Time (s)'],
  ['9月订单量 (ยอดคำสั่งผลิต)', '9月订单量 (周订单产量)', 'Order Volume (1W–4W)'],
  ['9月份产量占比 (สัดส่วนการผลิต %)', '9月份产量占比 (排产占比 %)', 'Production Mix Ratio (%)'],
  [
    '标准定编 การจัดสรรบุคลากรตามมาตรฐาน (STD MP)',
    '标准定编 标准配置定编人数 (STD MP)',
    'Standard Manpower Allocation (STD MP)',
  ],

  // Formula & Model Analysis Page
  [
    'โครงสร้างสูตรวิศวกรรมอุตสาหการ (IE Standard Time & Manpower Formulas)',
    '工业工程 (IE) 标准工时与定编计算公式体系',
    'Industrial Engineering (IE) Standard Time & Manpower Formulas',
  ],
  [
    'คลิกแก้ไขเวลามาตรฐานรายรุ่นและพารามิเตอร์ทุกช่องได้ทันที',
    '可直接点击编辑各机型标准工时与产线参数',
    'Click any cell to edit model standard times and line parameters directly',
  ],
  [
    'คู่มือสูตรคำนวณกำลังคน MP และแก้ไขเวลามาตรฐานราย Model',
    '标准定编 MP 计算手册与各机型标准工时维护表',
    'Standard MP Formula Guide & Editable Model Standard Time Matrix',
  ],
  [
    'ตารางแก้ไขเวลามาตรฐานรายรุ่น (Editable Standard Time Matrix)',
    '各机型标准工时可编辑矩阵表 (Editable Standard Time Matrix)',
    'Editable Model Standard Time Matrix',
  ],
  [
    'ตารางเวลามาตรฐาน (产品工时: วินาที), UPH และ Efficiency ของแต่ละสถานี — แก้ไขได้ทุกช่อง',
    '各工段标准工时 (产品工时: 秒)、UPH 与产线效率表 — 全部可编辑',
    'Station Standard Time (sec), UPH & Efficiency Matrix — All Cells Editable',
  ],
  [
    'เมื่อแก้ไขค่าในตารางนี้ ผลลัพธ์ในหน้าแดชบอร์ดและหน้าคาดการณ์ MP จะอัปเดตทันที',
    '修改此表中的工时或参数后，看板与所有预测表将立即自动更新',
    'Editing values in this table immediately updates the Dashboard and all MP Forecast sheets',
  ],
  [
    'เวลามาตรฐานรวมต่อเครื่อง (Total Standard Time / Unit)',
    '单台合计总标准工时 (Total Standard Time / Unit)',
    'Total Standard Time per Unit (All Stations)',
  ],
  [
    'กำลังคนรวมหากเดินรุ่นเดียว 100% (Single-Model Dedicated MP)',
    '单一机型 100% 满负荷排产所需总定编 (Single-Model MP)',
    'Total Dedicated MP if Running 100% Single Model',
  ],
  [
    'ขั้นตอนที่ 1 · สัดส่วนการผลิตรายรุ่น (Production Mix Ratio / 产量占比)',
    '步骤 1 · 机型排产占比计算 (Production Mix Ratio / 产量占比)',
    'Step 1 · Production Mix Ratio Calculation (产量占比)',
  ],
  [
    'คำนวณสัดส่วนของแต่ละ Model เทียบกับยอดรวมรายสัปดาห์',
    '计算各机型周产量占当周总产量的百分比',
    'Calculate each model share relative to total weekly production volume',
  ],
  [
    'Mix Ratio (รุ่น i) = Volume(รุ่น i) ÷ Σ Volume(ทุกรุ่นในสัปดาห์นั้น)',
    'Mix Ratio (机型 i) = 订单量(机型 i) ÷ Σ 当周全部机型总产量',
    'Mix Ratio (Model i) = Volume(i) ÷ Σ Total Weekly Volume',
  ],
  [
    'ตัวอย่างสัปดาห์ 1W: รุ่น',
    '1W 周次示例：机型',
    'Example (Week 1W): Model',
  ],
  ['มียอดสั่งผลิต', '订单量为', 'has order volume'],
  ['คัน จากยอดรวมทั้งสัปดาห์', '台，当周总产量为', 'units out of weekly total'],
  ['คัน คิดเป็นสัดส่วน', '台，占比为', 'units, giving a mix ratio of'],
  ['(แสดงผล 40%)', '（表中显示 40%）', '(displayed as 40%)'],
  [
    'ขั้นตอนที่ 2 · เวลามาตรฐานถ่วงน้ำหนัก (Weighted Standard Time / 加权工时)',
    '步骤 2 · 加权标准工时计算 (Weighted Standard Time / 加权工时)',
    'Step 2 · Weighted Standard Time Calculation (加权工时)',
  ],
  [
    'นำเวลามาตรฐานแต่ละรุ่นคูณสัดส่วนการผลิตแล้วนำมารวมกันรายสถานี',
    '将各机型的标准工时乘以其排产占比后求和，得出该工段的平均加权工时',
    'Multiply each model standard time by its production mix ratio and sum per station',
  ],
  [
    'สะท้อนภาระงานเฉลี่ยจริงต่อตู้เย็น 1 เครื่องบนสายการผลิตแบบผสมรุ่น (Mixed-Model Line)',
    '真实反映混流生产线 (Mixed-Model Line) 每台冰箱在该工段的平均作业工时负荷',
    'Reflects the true average work content per refrigerator on a mixed-model assembly line',
  ],
  ['เช่น สถานี', '例如工段', 'e.g., Station'],
  ['ในสัปดาห์ 1W มีเวลาถ่วงน้ำหนักเท่ากับ', '在 1W 周次的加权工时为', 'in Week 1W has a weighted ST of'],
  ['วินาที/เครื่อง', '秒/台', 'sec/unit'],
  [
    'ขั้นตอนที่ 3 · รอบเวลาการผลิตและประสิทธิภาพสมดุลไลน์ (Takt Time & Line Efficiency)',
    '步骤 3 · 产线节拍与线平衡效率 (Takt Time & Line Efficiency η)',
    'Step 3 · Takt Time & Line Balance Efficiency (η)',
  ],
  [
    'แปลงความเร็วสายการผลิต (UPH) เป็นรอบเวลาต่อชิ้น (Takt Time)',
    '将产线小时产量 (UPH) 转换为单台节拍时间 (Takt Time)',
    'Convert Line Speed (UPH) into cycle Takt Time per unit',
  ],
  [
    'Takt Time (TT) = 3,600 วินาที ÷ UPH (140) = 25.714 วินาที/คัน',
    'Takt Time (节拍 TT) = 3,600 秒 ÷ UPH (140) = 25.714 秒/台',
    'Takt Time (TT) = 3,600 sec ÷ UPH (140) = 25.714 sec/unit',
  ],
  [
    'เมื่อคิดค่าสมดุลสายการผลิตและเวลาผ่อนผัน (Line Balance Efficiency η = 70%–81% ตามความซับซ้อนของสถานี)',
    '结合产线平衡率与宽放系数 (Line Balance Efficiency η = 70%–81%，依工段复杂度而定)',
    'Accounting for line balance efficiency and allowance (η = 70%–81% by station complexity)',
  ],
  [
    'จะได้เวลามาตรฐานสุทธิที่พนักงาน 1 คนรับผิดชอบได้ต่อรอบการผลิต',
    '即可得出每位员工在单台节拍内可承担的有效标准工时',
    'determines the net standard work time 1 operator can handle per cycle',
  ],
  [
    'ขั้นตอนที่ 4 · อัตรากำลังคนมาตรฐาน (Standard Manpower / 标准定编 STD MP)',
    '步骤 4 · 标准定编人数计算 (Standard Manpower / 标准定编 STD MP)',
    'Step 4 · Standard Manpower Calculation (标准定编 STD MP)',
  ],
  [
    'คำนวณจำนวนคนประจำสถานีงานเพื่อให้ทันความเร็ว UPH ที่กำหนด',
    '计算满足目标线速 UPH 所需的工段标准定编人数',
    'Calculate required operators at each station to meet target UPH speed',
  ],
  ['ตัวอย่างสถานี', '工段计算示例', 'Example Station'],
  ['คน → ปัดเป็น', '人 → 四舍五入为', 'operators → rounded to'],
  ['ตรงตามตัวเลขในตารางต้นฉบับทุกประการ', '与原表测算结果完全一致', 'matching the master spreadsheet exactly'],
  [
    'บันทึกการตรวจสอบความถูกต้องของสูตรจากไฟล์ Excel ต้นฉบับ (Formula Audit Log)',
    '原 Excel 测算表公式校验与核对说明 (Formula Audit Log)',
    'Original Excel Spreadsheet Formula Audit & Verification Log',
  ],
  [
    '1. จุดสังเกตที่สถานี Inner Box2 (ช่อง 加权工时 ในไฟล์ภาพ)',
    '1. Inner Box2 工段“加权工时”显示值说明',
    '1. Audit Note on Inner Box2 (Weighted ST Display in Original Sheet)',
  ],
  [
    '2. จุดสังเกตบรรทัดรวมท้ายตาราง (合计 Total Row)',
    '2. 底部“合计”行汇总数值校验说明',
    '2. Audit Note on Bottom Grand Total Row (合计)',
  ],
  ['เมื่อนำค่า', '将表中全部 9 个工段的', 'Summing the'],
  ['ทั้ง 9 สถานีในตารางมาบวกรวมกันจริง (', '实际相加汇总（', 'across all 9 stations ('],
  ['จะได้ผลรวม', '实际总和为', 'yields the true total:'],

  // Volume Forecaster & 12-Month Trend & Reduction Plan Pages
  [
    'ระบบจำลองปรับเพิ่ม-ลด Volume การผลิต เพื่อคาดการณ์อัตรากำลังคน (Dynamic Volume ↔ Manpower Sheet)',
    '产量增减动态定编测算与预测表 (Dynamic Volume ↔ Manpower Sheet)',
    'Dynamic Production Volume ↔ Manpower Forecasting Sheet',
  ],
  [
    'เพิ่มหรือลด Volume รุ่นใดก็ได้ จำนวนคน MP จะปรับขึ้น-ลงและเชื่อมโยงกับทุกหน้าบน Web ทันที',
    '增减任意机型的订单产量，标准定编人数 (MP) 将实时联动更新至全网所有工作表',
    'Increase or decrease any model volume to immediately forecast MP and sync across all sheets',
  ],
  [
    'Sheet ปรับเพิ่ม-ลด Volume → คาดการณ์ MP ทันที',
    '产量增减动态测算 MP 表',
    'Dynamic Volume → MP Sheet',
  ],
  [
    'กราฟวิเคราะห์แนวโน้มอัตรากำลังคนมาตรฐานรายเดือน',
    '12个月标准定编人数 (STD MP) 趋势分析图',
    '12-Month Standard Manpower (STD MP) Trend Analysis',
  ],
  [
    'คลิกจุดบนกราฟหรือแก้ไขตัวเลขในตารางทั้ง 12 เดือนได้ทันที',
    '点击图表节点或直接修改 12个月表格中的任意数值',
    'Click any month point on chart or edit numbers across all 12 months directly',
  ],
  [
    'ปรับเพิ่ม-ลด Volume รวมทั้งสายการผลิต',
    '调整整线总订单产量 (Total Volume)',
    'Adjust Total Production Line Volume',
  ],
  [
    'กดปุ่ม % หรือเลื่อนแถบเพื่อเพิ่ม/ลด Volume ทั้ง 7 รุ่นตามสัดส่วนพร้อมกัน',
    '点击百分比按钮或拖动滑块，按比例同步增减 7 款机型产量',
    'Click % buttons or drag the slider to scale all 7 models proportionally',
  ],
  [
    'ลากปรับหรือพิมพ์ยอดผลิตรวม (คัน):',
    '拖动或输入总产量 (台):',
    'Drag or enter total volume (units):',
  ],
  [
    'โหมดคำนวณความเร็วไลน์และเวลาทำงาน',
    '线速 (UPH) 与工作时间计算模式',
    'Line Speed (UPH) & Working Time Mode',
  ],
  ['แปรผันตาม Volume', '随产量动态联动', 'Volume-Driven MP'],
  ['ล็อก UPH คงที่', '固定 UPH 模式', 'Fixed UPH Mode'],
  ['ชั่วโมงเดินไลน์ต่อสัปดาห์ (ชม.)', '每周开线工时 (小时/周)', 'Weekly Line Hours (hrs/wk)'],
  ['ล็อกค่า UPH คงที่ (คัน/ชม.)', '固定目标 UPH (台/小时)', 'Fixed Target UPH (units/hr)'],
  ['เผื่ออัตราลางาน Buffer (%)', '考勤缺勤缓冲率 Buffer (%)', 'Absenteeism Buffer (%)'],
  [
    'ปรับเพิ่ม-ลด Volume แยกรายรุ่น (7 Models)',
    '分机型增减订单产量 (7 款机型)',
    'Adjust Volume by Individual Model (7 Models)',
  ],
  [
    'แสดงผลกระทบกำลังคน (±MP) รายรุ่นทันที',
    '实时显示各机型对定编人数 (±MP) 的影响',
    'Shows real-time ±MP impact per model',
  ],
  [
    'ส่งค่า Volume & MP ที่จำลองไปยังสัปดาห์อื่น หรือ Sheet 12 เดือน:',
    '将测算产量与 MP 同步至其他周次或 12个月趋势表:',
    'Apply simulated Volume & MP to another week or 12-Month Sheet:',
  ],
  [
    'กราฟความสัมพันธ์เมื่อเพิ่ม-ลด Volume (-40% ถึง +50%) ต่อกำลังคน MP',
    '产量增减 (-40% 至 +50%) 对标准定编 MP 敏感度曲线',
    'Volume Sensitivity Curve (-40% to +50%) vs. Required MP',
  ],
  [
    'คลิกที่แท่งหรือจุดใดก็ได้บนกราฟเพื่อปรับ Volume ไปยังระดับนั้นและคำนวณ MP ทันที',
    '点击柱状图任意档位即可立即切换至该产量并测算定编人数',
    'Click any bar on the chart to jump to that volume level and calculate MP immediately',
  ],
  [
    'ตารางอัตรากำลังคนรายสถานีที่คาดการณ์ทันที',
    '各工段实时预测定编人数明细表',
    'Real-Time Station-by-Station Manpower Forecast Table',
  ],
  ['เปรียบเทียบกำลังคนตั้งต้น', '对比基准定编人数', 'Compare baseline MP'],
  [
    'กับกำลังคนที่ต้องใช้จริงเมื่อปรับ Volume (คลิกแถวเพื่อดู/แก้ไขเวลามาตรฐานรายรุ่น)',
    '与调整产量后的预测定编人数（点击行可展开编辑各机型标准工时）',
    'vs. forecasted MP after volume adjustment (click row to edit model standard times)',
  ],
  [
    'แก้ไขเวลามาตรฐานรายรุ่น (วินาที) ของสถานี',
    '编辑该工段各机型标准工时 (秒) —',
    'Edit model standard times (sec) for station',
  ],
  [
    'กราฟแนวโน้มกำลังคนมาตรฐาน (STD MP) รายเดือน ทั้ง 12 เดือน (ม.ค. – ธ.ค.)',
    '全年12个月标准定编人数 (STD MP) 趋势图 (1月–12月)',
    '12-Month Standard Manpower (STD MP) Trend Chart (Jan–Dec)',
  ],
  [
    'คลิกที่จุดเดือนใดก็ได้บนกราฟเพื่อดูการกระจายกำลังคนรายสถานีของเดือนนั้น · ปรับเปลี่ยนโหมดกราฟและสูตร UPH ได้ด้านขวา',
    '点击图表上任意月份查看工段明细 · 右侧可切换图表对比模式与 UPH 公式',
    'Click any month on the chart to inspect station breakdown · Switch chart & UPH modes on the right',
  ],
  [
    'ตารางแผนยอดการผลิต (`订单量`) และตัวแปรคำนวณ MP ทั้ง 12 เดือน',
    '全年12个月订单量与定编测算参数表',
    '12-Month Order Volume & MP Calculation Parameters Table',
  ],
  [
    'พิมพ์แก้ไขยอดผลิตรายรุ่น, ยอดผลิตรวมรายเดือน, ค่า UPH หรือตัวเลข STD MP รายเดือนได้โดยตรง กราฟด้านบนจะอัปเดตทันที',
    '可直接修改各机型月产量、月度总产量、UPH 或月度 STD MP，上方趋势图将实时更新',
    'Directly edit monthly model volumes, total volume, UPH, or STD MP — the trend chart updates immediately',
  ],
  [
    'เดือน 9月 (ก.ย.) อ้างอิงยอดจากตาราง 1W–4W',
    '9月 (Sep) 基准产量联动自 1W–4W 周表',
    'Sep (9月) baseline linked with 1W–4W weekly table',
  ],
  ['รุ่นสินค้า / ตัวแปร', '机型系列 / 测算参数', 'Model Series / Parameter'],
  ['รวม/เฉลี่ยปี', '全年合计/平均', 'Annual Sum/Avg'],
  [
    'คำนวณอัตโนมัติจาก Volume ÷ ชม.ทำงาน',
    '按 月产量 ÷ 月工时 自动计算',
    'Auto-calculated from Volume ÷ Working Hrs',
  ],
  ['แก้ไขค่า UPH รายเดือนได้โดยตรง', '可直接编辑各月目标 UPH', 'Edit monthly target UPH directly'],
  ['ใช้คำนวณ Dynamic UPH & ชั่วโมงแรงงาน', '用于计算动态 UPH 与总工时负荷', 'Used for Dynamic UPH & Man-Hours'],
  ['วินาทีรวมต่อเครื่อง', '单台合计加权秒数', 'Total weighted sec/unit'],
  [
    'คำนวณตามสูตร IE (คลิกเพื่อกำหนดค่าเองได้)',
    '按 IE 公式计算（点击可手动覆盖）',
    'IE Formula Calculated (click to override manually)',
  ],
  [
    'แสดงจำนวนคน `STD MP` ของแต่ละสถานีงานตั้งแต่ ม.ค. (1月) ถึง ธ.ค. (12月) พร้อมค่าเฉลี่ย (AVG), ต่ำสุด (MIN), สูงสุด (MAX)',
    '显示 1月至 12月各工段标准定编人数 (STD MP) 及全年平均值 (AVG)、最小值 (MIN)、最大值 (MAX)',
    'Displays station STD MP from Jan (1月) to Dec (12月) with annual AVG, MIN, and MAX',
  ],
  ['รวมอัตรากำลังคนมาตรฐาน', '标准定编人数总计', 'Total Standard Manpower'],

  // Manpower & Cost Reduction Option Sheet
  [
    'Sheet Option: แผนลดกำลังพนักงาน & ลดต้นทุนแรงงาน',
    '减员与人工降本方案表 (Manpower & Cost Reduction Option Sheet)',
    'Option Sheet: Workforce & Labor Cost Reduction Plan',
  ],
  [
    'ระบบจำลองทางเลือกแผนลดกำลังพนักงานและต้นทุน (Workforce & Cost Reduction Option Sheet)',
    '机型减产/停产减员与人工成本测算方案表 (Workforce & Cost Reduction Option Sheet)',
    'Workforce & Labor Cost Reduction Option Simulator Sheet',
  ],
  [
    'วิเคราะห์การปรับลดคนและยุบสถานีงานเมื่อบาง Model ลดลงหรือยกเลิกการผลิต',
    '基于部分机型减产或停产，自动测算可精简定编人数、可关停工段与人工降本金额',
    'Analyze workforce reduction, station consolidation & labor cost savings from model phase-out',
  ],
  ['แผนลดกำลังคน & ต้นทุน', '减员与降本方案', 'MP Reduction Plan'],
  ['Sheet แผนลดกำลังคน & ลดต้นทุน', '减员与降本方案表', 'MP & Cost Reduction Sheet'],
  ['อ้างอิงฐานสัปดาห์:', '基准周次:', 'Ref Week:'],
  ['นำแผนนี้ไปใช้กับตารางเว็บ', '将此方案应用至全网周表', 'Apply Plan to Web Table'],
  ['คืนค่าผลิตปกติ 100%', '恢复 100% 正常排产', 'Restore 100% Normal Plan'],
  ['Export แผนลดคน (CSV)', '导出减员方案 (CSV)', 'Export Reduction Plan (CSV)'],
  [
    'เลือก Option แผนลด/ยกเลิกรุ่นการผลิต (คลิกเลือกแผนมาตรฐาน หรือปรับเปอร์เซ็นต์รายรุ่นด้านล่าง):',
    '选择减产/停产预设方案（点击下方方案卡片，或在表格中按机型单独调整比例）：',
    'Select a Model Reduction / Phase-Out Option Preset (or customize per model below):',
  ],
  ['รุ่นที่ยกเลิกการผลิตในแผนนี้:', '当前方案停产机型数:', 'Canceled Models in Plan:'],
  [
    'Option 1: ยกเลิกกลุ่ม Multi-Door & SBS',
    '方案 1：停产多门与对开门系列 (Multi-Door & SBS)',
    'Option 1: Cancel Multi-Door & SBS Series',
  ],
  [
    'ยกเลิก `T-Door`, `SBS`, `T-Door ice` (0%) · ปิดสถานีเฉพาะทาง SBS/TD ได้ทันที 3 สถานี',
    '停产 T-Door, SBS, T-Door ice (0%) · 可立即关停 3 个多门/对开门专用工段',
    'Cancel T-Door, SBS, T-Door ice (0%) · Shut down 3 dedicated SBS/TD stations immediately',
  ],
  [
    'Option 2: ตัดรุ่นกินแรงงานสูง (BM & TD)',
    '方案 2：停产高工时机型 (BM & T-Door)',
    'Option 2: Phase Out High-Labor Models (BM & TD)',
  ],
  [
    'ยกเลิก `BM`, `BM TD`, `T-Door` (0%) และลด `SBS` ลง -50% เพื่อเซฟชั่วโมงคนสูงสุด',
    '停产 BM, BM TD, T-Door (0%) 并将 SBS 减产 -50%，最大化精简工时与定编',
    'Cancel BM, BM TD, T-Door (0%) and cut SBS by -50% for maximum labor hour savings',
  ],
  [
    'Option 3: ตัดรุ่นย่อย Volume น้อย',
    '方案 3：砍掉小批量机型 (BM TD / T-Door / Ice)',
    'Option 3: Eliminate Low-Volume Minor Models',
  ],
  [
    'ยกเลิก `BM TD`, `T-Door`, `T-Door ice` · คงรุ่นหลัก `TM19/21`, `TM14`, `BM`, `SBS`',
    '停产小批量 BM TD, T-Door, T-Door ice · 保留主力机型 TM19/21, TM14, BM, SBS',
    'Cancel minor BM TD, T-Door, T-Door ice · Retain core TM19/21, TM14, BM, SBS',
  ],
  [
    'Option 4: เดินเฉพาะ Top Mount ล้วน',
    '方案 4：仅保留顶冷主力机型 (Top Mount Only)',
    'Option 4: Focus on Top Mount Models Only',
  ],
  [
    'คงเฉพาะ `TM19/21` และ `TM14` (100%) · ยกเลิกตระกูล `BM` และ `Multi-Door` ทั้งหมด',
    '仅保留 TM19/21 与 TM14 (100%) · 全面停产底冷 BM 与多门对开门系列',
    'Keep only TM19/21 & TM14 (100%) · Cancel all BM and Multi-Door / SBS series',
  ],
  [
    'Option 5: ลดกำลังผลิตบางส่วน (-20% / -50%)',
    '方案 5：按比例缩减产量 (-20% / -50%)',
    'Option 5: Proportional Volume Reduction (-20% / -50%)',
  ],
  [
    'ลดรุ่น `TM` ลง -20% และลดรุ่น `BM / SBS / T-Door` ลง -50% โดยไม่ปิดสายการผลิต',
    '顶冷 TM 减产 -20%，底冷与多门 BM/SBS/T-Door 减产 -50%，保留全系产线运行',
    'Reduce TM by -20% and BM / SBS / T-Door by -50% without shutting down sub-lines',
  ],
  ['1. จำนวนพนักงานที่ลดได้', '1. 可精简定编总人数', '1. Total Workforce Reduced'],
  ['กำลังคนก่อนลด → หลังลด:', '减员前定编 → 减员后定编:', 'Before → After Reduction:'],
  ['2. แยกจำนวนคนที่ลดได้ (CAB vs FG)', '2. 分部门减员人数 (CAB vs FG)', '2. MP Reduction by Dept (CAB vs FG)'],
  ['รวมลดทั้งสาย', '整线合计减员', 'Combined Line Saved'],
  ['3. ต้นทุนพนักงานที่ประหยัดได้ / เดือน', '3. 每月节省人工成本', '3. Monthly Labor Cost Saved'],
  ['ฐานต้นทุนต่อคน (แก้ได้):', '人均月度人工成本 (可编辑):', 'Cost per MP/Mo (Editable):'],
  ['4. ประหยัดต้นทุนรวมต่อปี (12 เดือน)', '4. 全年累计节省人工成本 (12个月)', '4. Annual Labor Cost Savings (12 Months)'],
  ['สถานีเฉพาะทางที่ยุบ/ปิดได้ 100%:', '可 100% 关停合并的专用工段:', 'Dedicated Stations 100% Shut Down:'],
  [
    'ตารางปรับลดหรือยกเลิกแผนการผลิตราย Model',
    '各机型减产/停产计划与减员降本明细表',
    'Model-by-Model Volume Reduction & Phase-Out Matrix',
  ],
  [
    'กดปุ่ม ยกเลิกรุ่น (0%) หรือเลือก % ลดยอดผลิต เพื่อดูจำนวนพนักงานและต้นทุนที่ลดได้ของแต่ละรุ่นทันที',
    '点击“停产 0%”或选择减产比例，实时查看各机型可减少的定编人数与月度降本金额',
    'Click Cancel (0%) or select a reduction % to see real-time MP and cost savings per model',
  ],
  ['กดปุ่ม ', '点击 ', 'Click '],
  ['ยกเลิกรุ่น (0%)', '停产机型 (0%)', 'Cancel Model (0%)'],
  [
    ' หรือเลือก % ลดยอดผลิต เพื่อดูจำนวนพนักงานและต้นทุนที่ลดได้ของแต่ละรุ่นทันที',
    ' 或选择减产比例，立即查看各机型可精简人数与节省成本',
    ' or choose reduction % to view workforce & cost savings per model',
  ],
  ['ยอดผลิตรวม:', '总订单产量:', 'Total Volume:'],
  ['รุ่นตู้เย็น (Model)', '冰箱机型 (Model)', 'Refrigerator Model'],
  ['เวลารวม/คัน (CAB+FG)', '单台总工时 (CAB+FG)', 'Total ST/Unit (CAB+FG)'],
  ['แผนเดิม', '原计划产量', 'Baseline Plan'],
  ['กำหนดแผนลด / ยกเลิกรุ่น', '设定减产比例 / 停产', 'Set Reduction % / Cancel'],
  ['แผนผลิตใหม่ (คัน)', '调整后产量 (台)', 'New Volume (Units)'],
  ['คนที่ลดได้ (-MP)', '可减人数 (-MP)', 'MP Saved (-MP)'],
  ['ประหยัด/เดือน (฿)', '月省成本 (฿)', 'Monthly Saved (฿)'],
  ['ยกเลิกผลิต', '已停产', 'Canceled'],
  ['ยกเลิก 0%', '停产 0%', 'Cancel 0%'],
  ['ปกติ', '正常 100%', 'Normal 100%'],
  ['รวมผลกระทบจากการลด/ยกเลิกรุ่น', '机型减产/停产减员降本总计', 'Total Impact of Model Reduction / Phase-Out'],
  [
    'หลักการคิดคำนวณการลดกำลังคน (IE Manpower Reduction Methodology)',
    'IE 减员与降本测算原理说明 (IE Methodology)',
    'IE Workforce & Cost Reduction Calculation Methodology',
  ],
  [
    'อ้างอิงจากเวลามาตรฐาน (`产品工时`) และประสิทธิภาพ (`η`) ของแต่ละสถานีบนเว็บโดยตรง',
    '直接基于全网各工段标准工时 (`产品工时`) 与线平衡效率 (`η`) 进行工程测算',
    'Directly based on each station Standard Time (产品工时) and Efficiency (η) on the web',
  ],
  [
    '1. สูตรคำนวณชั่วโมงแรงงานที่ลดลงตามรุ่นที่ตัดออก (Workload Reduction)',
    '1. 按减产/停产机型测算可削减工时负荷 (Workload Reduction)',
    '1. Workload Man-Hours Reduction Formula by Canceled/Reduced Model',
  ],
  [
    'ตู้เย็นแต่ละรุ่นมีเวลามาตรฐานในแต่ละสถานีไม่เท่ากัน เมื่อลดหรือยกเลิกการผลิตรุ่น',
    '不同冰箱机型在各工段的标准工时不同。当减产或停产机型',
    'Each refrigerator model has different standard times per station. Reducing model',
  ],
  ['ชั่วโมงแรงงานสุทธิในสถานี', '台时，工段', 'units immediately reduces net man-hours in station'],
  ['จะลดลงทันที:', '的净工时负荷将立即减少：', 'by:'],
  [
    '2. การแยกสถานีงานเฉพาะกลุ่มรุ่น (Dedicated Line Shutdown)',
    '2. 专用工段整线关停与共用工段重平衡 (Dedicated vs. Shared Stations)',
    '2. Dedicated Sub-Line Shutdown vs. Shared Station Rebalancing',
  ],
  [
    'จากตารางข้อมูลการผลิตบนเว็บ สถานีงานถูกแบ่งเป็น 2 ประเภท:',
    '根据工厂主数据表，产线工段分为以下两类：',
    'Based on the factory master data, stations are divided into 2 categories:',
  ],
  ['สถานีเฉพาะกลุ่มรุ่น (Dedicated Stations)', '机型专用工段 (Dedicated Stations)', 'Dedicated Model Stations'],
  ['มีเวลามาตรฐานเฉพาะรุ่น', '仅包含特定机型工时', 'only process'],
  ['เท่านั้น หากยกเลิก 3 รุ่นนี้ สามารถ', '。若停产这 3 款机型，可', 'models. Canceling these 3 models allows '],
  ['ปิดสถานีและลดคนเป็น 0 MP ได้ทันที', '立即 100% 关停该工段并将定编减至 0 MP', 'immediate 100% station shutdown (0 MP)'],
  ['สถานีงานร่วม (Shared Stations)', '全机型共用工段 (Shared Stations)', 'Shared Multi-Model Stations'],
  ['จะลดคนตามสัดส่วนความเร็วไลน์ที่ลดลง (', '将随有效线速下降按比例精简人员（', 'reduce MP proportionally with effective line speed ('],
  ['และเวลามาตรฐานถ่วงน้ำหนักใหม่', '）及最新加权标准工时重新平衡工位', 'and the new weighted standard time'],
  [
    '3. การคำนวณผลประหยัดต้นทุนพนักงานสุทธิ (Net Labor Cost Saving)',
    '3. 净节省人工成本计算公式 (Net Labor Cost Saving)',
    '3. Net Labor Cost Savings Calculation',
  ],
  ['• กำลังคนที่ลดได้รวม =', '• 合计可精简定编人数 =', '• Total Workforce Reduced ='],
  ['• ประหยัดต่อเดือน =', '• 每月节省人工成本 =', '• Monthly Cost Savings ='],
  ['• ประหยัดต่อปี (12 เดือน) =', '• 全年节省人工成本 (12个月) =', '• Annual Cost Savings (12 Months) ='],
  [
    'ตารางแผนลดกำลังพนักงานรายสถานีงาน (Station-by-Station Workforce Reduction Plan)',
    '各工段减员与产线重组执行方案表 (Station-by-Station Plan)',
    'Station-by-Station Workforce Reduction & Line Rebalancing Plan',
  ],
  [
    'แสดงจำนวนพนักงานก่อนลด, หลังลด, จำนวนคนที่ตัดออกได้จริง, ต้นทุนที่ประหยัดได้ และคำแนะนำการยุบจุดงานรายสถานี',
    '展示各工段减员前定编、减员后定编、实际可减人数、月度降本金额及 IE 产线重组建议',
    'Shows baseline MP, new MP, net operators saved, monthly cost savings & IE action plan per station',
  ],
  ['รุ่นที่ใช้สถานีนี้ (Active Models)', '途经该工段的机型 (Active Models)', 'Models Using This Station'],
  ['เวลาถ่วงน้ำหนัก (เดิม → ใหม่)', '加权工时 (原 → 新)', 'Weighted ST (Base → New)'],
  ['MP เดิม', '原定编 MP', 'Base MP'],
  ['MP ใหม่', '新定编 MP', 'New MP'],
  ['ลดคนได้ (-MP)', '可减人数 (-MP)', 'Saved (-MP)'],
  [
    'แนวทางปรับลดกำลังคน (IE Action Plan)',
    'IE 产线调整建议 (Action Plan)',
    'IE Line Action Recommendation',
  ],
  [
    'ปิดสถานี / ยุบจุดงาน 100% (ยกเลิกรุ่นที่เดินในสถานีนี้ทั้งหมด)',
    '100% 关停该工段（该工段对应机型已全部停产）',
    '100% Station Shutdown (All models on this sub-line canceled)',
  ],
  ['จัดสมดุลงานใหม่ (Line Rebalancing)', '重排工位平衡 (Line Rebalancing)', 'Rebalance Station Workload'],
  ['ลดคนออก', '精简减员', 'Reduce by'],
  ['คงอัตรากำลังคนเดิม', '维持原定编人数', 'Maintain Current MP'],
  ['รวมผลลัพธ์แผนลดกำลังคน', '减员与降本方案总计', 'Total Workforce Reduction Plan'],
  ['ประหยัดรายปี', '全年累计节省', 'Annual Savings'],

  // Monthly Trend & Common Terms
  [
    'ตารางอัตรากำลังคนมาตรฐานรายสถานี (Station-by-Station 12-Month MP)',
    '全年12个月各工段标准定编明细表 (Station-by-Station 12-Month MP)',
    'Station-by-Station 12-Month Standard Manpower Table',
  ],
  [
    'ซิงค์เดือน ก.ย. (9月) จากตาราง 1W–4W',
    '从 1W–4W 周表同步 9月产量',
    'Sync Sep (9月) from 1W–4W Table',
  ],
  ['คืนค่าเริ่มต้น 12 เดือน', '重置 12个月默认数据', 'Reset 12-Month Defaults'],
  ['กำลังคนเฉลี่ยทั้งปี', '全年平均定编人数', 'Yearly Average MP'],
  ['กรอบอัตรากำลังคนทั้งปี:', '全年定编人数区间:', 'Annual MP Range:'],
  ['เดือนที่ใช้ MP สูงสุด (Peak Season)', '最高定编月份 (旺季 Peak)', 'Peak Manpower Month'],
  ['ยอดผลิตเดือนพีค:', '旺季当月产量:', 'Peak Month Volume:'],
  ['เดือนที่ใช้ MP ต่ำสุด (Low Season)', '最低定编月份 (淡季 Low)', 'Lowest Manpower Month'],
  ['ส่วนต่าง Peak - Low:', '旺淡季定编差值:', 'Peak - Low Spread:'],
  ['ยอดการผลิตรวมทั้งปี', '全年累计总产量', 'Total Annual Production Volume'],
  ['เฉลี่ยต่อเดือน:', '月均产量:', 'Monthly Average:'],
  ['แยกแผนก CAB vs FG', 'CAB 与 FG 分部门对比', 'Split by CAB vs FG'],
  ['เปรียบเทียบ LineA vs LineB', 'LineA 与 LineB 跨线对比', 'Compare LineA vs LineB'],
  ['MP คู่กับ ยอดผลิต (Volume)', '定编 MP 与产量双轴对比', 'MP vs. Production Volume'],
  ['ใช้ UPH เป้าหมายรายเดือน', '按月度目标 UPH 计算', 'Use Target Monthly UPH'],
  ['คำนวณ UPH ตาม Volume ÷ ชม.ทำงาน', '按产量 ÷ 月工时动态计算 UPH', 'Dynamic UPH (Volume ÷ Working Hrs)'],
  ['กำลังคนที่เลือก', '当前选中定编', 'Selected MP'],
  ['เส้นอัตรากำลังคนมาตรฐาน STD MP', '标准定编人数曲线 STD MP', 'Standard Manpower Curve (STD MP)'],
  [
    'แท่งยอดการผลิตรายเดือน (Volume คัน/เดือน — แกนขวา)',
    '月度订单产量柱状图 (台/月 — 右轴)',
    'Monthly Order Volume Bars (Units/Mo — Right Axis)',
  ],
  ['เดือนที่เลือกตรวจสอบ:', '当前选中查看月份:', 'Selected Inspected Month:'],
  ['รวมยอดผลิตรายเดือน (คัน)', '月度订单总量合计 (台)', 'Total Monthly Volume (Units)'],
  ['คลิกแก้เพื่อปรับสเกลทั้ง 7 รุ่นอัตโนมัติ', '修改此项可按比例自动缩放全部 7 款机型', 'Edit to proportionally scale all 7 models'],
  ['ความเร็วสายการผลิต UPH (คัน/ชม.)', '生产线速度 UPH (台/小时)', 'Line Speed UPH (Units/Hr)'],
  ['ชั่วโมงเดินไลน์ต่อเดือน (ชม./เดือน)', '月度开线工时 (小时/月)', 'Monthly Line Working Hours (Hrs/Mo)'],
  ['เวลามาตรฐานถ่วงน้ำหนักรวม (加权工时)', '加权标准工时合计 (加权工时)', 'Total Weighted Standard Time (sec)'],
  ['อัตรากำลังคนรวม STD MP', '标准定编人数合计 STD MP', 'Total Standard Manpower (STD MP)'],
  ['ภาพรวมประสิทธิภาพ', '效率与定编总览', 'Dashboard Overview'],
  ['กราฟแนวโน้ม MP 12 เดือน', '12个月 MP 趋势图', '12-Month MP Trend'],
  ['Sheet กราฟแนวโน้ม 12 เดือน', '12个月 MP 趋势表', '12-Month MP Trend Sheet'],
  ['คาดการณ์กำลังคน MP', '产量动态测算 MP', 'Volume ↔ MP Forecaster'],
  ['ตารางข้อมูลหลัก', '主数据测算表', 'Master Spreadsheet'],
  ['สูตรคำนวณ & เวลารายรุ่น', '测算公式与机型工时', 'IE Formulas & Model ST'],
  ['บันทึก / จัดเก็บข้อมูล', '保存 / 数据版本管理', 'Save / Backup Data'],
  ['คำนวณ MP จาก Volume', '按产量测算 MP', 'Forecast MP by Volume'],
  ['สายการผลิต (区域):', '生产线 (区域):', 'Production Line:'],
  ['สายการผลิต', '生产线', 'Production Line'],
  ['ใช้ยอดผลิตเดียวกับ', '复制订单量自', 'Copy Volumes from'],
  ['เลือก Sheet ของ', '选择工作表 —', 'Select Sheet of'],
  ['เชื่อมโยงสัปดาห์:', '联动周次:', 'Linked Week:'],
  ['ซิงค์ข้อมูลสดกับเว็บ', '实时同步全网数据', 'Live Web Sync'],
  ['โหมดทดลองแยก (Sandbox)', '独立沙盒模拟模式', 'Sandbox Mode'],
  ['คืนค่า Volume ต้นฉบับ', '恢复初始基准产量', 'Reset Baseline Volume'],
  ['1. ยอดการผลิตรวมที่ปรับ', '1. 调整后总订单产量', '1. Adjusted Total Volume'],
  ['2. กำลังคนแผนก CAB', '2. CAB 箱体线定编人数', '2. CAB Department MP'],
  ['3. กำลังคนแผนก FG', '3. FG 总装线定编人数', '3. FG Department MP'],
  ['4. รวมกำลังคนทั้งสาย', '4. 整线合计总定编', '4. Combined Line Total MP'],
  ['คลิกดูเฉพาะ CAB', '点击仅看 CAB', 'Click for CAB Only'],
  ['คลิกดูเฉพาะ FG', '点击仅看 FG', 'Click for FG Only'],
  ['เทียบค่าตั้งต้น CAB:', '对比 CAB 基准:', 'vs. CAB Baseline:'],
  ['เทียบค่าตั้งต้น FG:', '对比 FG 基准:', 'vs. FG Baseline:'],
  ['ความเร็วเดินไลน์ (Effective UPH):', '有效线速 (Effective UPH):', 'Effective Line UPH:'],
  ['ยอดตั้งต้น', '初始基准产量', 'Baseline Volume'],
  ['เวลาถ่วงน้ำหนัก:', '加权工时:', 'Weighted ST:'],
  ['เวลาถ่วงน้ำหนัก', '加权工时', 'Weighted ST'],
  ['เวลารวม:', '合计工时:', 'Total ST:'],
  ['รวมทั้งโรงงาน', '全厂合计', 'Factory Total'],
  ['รวมทั้งสายการผลิต', '整线合计', 'Total Production Line'],
  ['รวมทั้งสิ้น', '总计', 'Grand Total'],
  ['สถานีงาน (线段 / Station)', '工段名称 (线段 / Station)', 'Station Name (线段)'],
  ['สถานีงาน (线段)', '工段名称 (线段)', 'Station Name (线段)'],
  ['สถานีงาน (Station)', '工段名称 (线段)', 'Station Name'],
  ['สถานีงาน', '工段', 'Station'],
  ['ชม.งานรวม', '总工时', 'Man-Hours'],
  ['MP ตั้งต้น', '基准 MP', 'Baseline MP'],
  ['MP คาดการณ์ใหม่', '预测定编 MP', 'Forecast MP'],
  ['ส่วนต่าง (±MP)', '定编差值 (±MP)', 'Delta (±MP)'],
  ['อัปเดตลงกราฟ 12 เดือน', '同步更新至 12个月趋势图', 'Update 12-Month Trend'],
  ['บันทึกลง', '保存至', 'Save to'],
  ['อัตราใช้คน:', '每千台定编:', 'MP Rate:'],
  ['MP / 1,000 คัน', 'MP / 1,000 台', 'MP / 1,000 units'],
  ['MP/1k คัน', 'MP/千台', 'MP/1k units'],
  ['สัดส่วน:', '占比:', 'Mix:'],
  ['สัดส่วน', '占比', 'Mix'],
  ['ใช้คน ~', '需定编 ~', 'Uses ~'],
  ['ตั้งต้น:', '基准:', 'Base:'],
  ['ตั้งต้น 0%', '基准 0%', 'Base 0%'],
  ['ตั้งต้น', '基准', 'Base'],
  ['เท่าเดิม (0)', '不变 (0)', 'No Change (0)'],
  ['จำลองปรับ Volume', '模拟调整产量', 'Simulate Volume'],
  ['กำลังคนมาตรฐานรวม', '标准定编人数合计', 'Total Standard Manpower'],
  ['ยอดคำสั่งผลิต', '订单产量', 'Order Volume'],
  ['สถานีคอขวดสูงสุด', '最高定编瓶颈工段', 'Top Bottleneck Station'],
  ['เพิ่มสถานีงาน', '新增工段', 'Add Station'],
  ['คืนค่าเริ่มต้นโรงงาน', '恢复工厂初始数据', 'Reset Factory Defaults'],
  ['รวม CAB + FG', '合计 CAB + FG', 'Combined CAB + FG'],
  ['รวม CAB+FG', '合计 CAB+FG', 'Combined CAB+FG'],
  ['รวม LineA', '合计 LineA', 'Combined LineA'],
  ['รวม LineB', '合计 LineB', 'Combined LineB'],
  ['แผนก', '部门', 'Dept'],
  ['สัปดาห์', '周次', 'Week'],
  ['สถานี', '个工段', 'Stations'],
  ['รายการ', '项', 'items'],
  ['คัน/ชม.', '台/小时', 'units/hr'],
  ['คัน/เดือน', '台/月', 'units/mo'],
  ['คัน / ปี', '台/年', 'units/yr'],
  ['MP / เดือน', 'MP / 月', 'MP / mo'],
  ['/ เดือน', '/ 月', '/ mo'],
  ['/ ปี', '/ 年', '/ yr'],
  ['ลดลง', '减少', 'Reduced'],
  ['เฉลี่ย', '平均', 'Avg'],
  ['วินาที', '秒', 'sec'],
  ['นาที', '分钟', 'min'],
  ['รุ่น', '款机型', 'models'],
  ['คน', '人', 'MP'],
  ['คัน', '台', 'units'],
  ['ชม.', '小时', 'hrs'],

  // Month Full & Short Names
  ['มกราคม', '1月 (一月)', 'January'],
  ['กุมภาพันธ์', '2月 (二月)', 'February'],
  ['มีนาคม', '3月 (三月)', 'March'],
  ['เมษายน', '4月 (四月)', 'April'],
  ['พฤษภาคม', '5月 (五月)', 'May'],
  ['มิถุนายน', '6月 (六月)', 'June'],
  ['กรกฎาคม', '7月 (七月)', 'July'],
  ['สิงหาคม', '8月 (八月)', 'August'],
  ['กันยายน', '9月 (九月)', 'September'],
  ['ตุลาคม', '10月 (十月)', 'October'],
  ['พฤศจิกายน', '11月 (十一月)', 'November'],
  ['ธันวาคม', '12月 (十二月)', 'December'],
  ['ม.ค.', '1月', 'Jan'],
  ['ก.พ.', '2月', 'Feb'],
  ['มี.ค.', '3月', 'Mar'],
  ['เม.ย.', '4月', 'Apr'],
  ['พ.ค.', '5月', 'May'],
  ['มิ.ย.', '6月', 'Jun'],
  ['ก.ค.', '7月', 'Jul'],
  ['ส.ค.', '8月', 'Aug'],
  ['ก.ย.', '9月', 'Sep'],
  ['ต.ค.', '10月', 'Oct'],
  ['พ.ย.', '11月', 'Nov'],
  ['ธ.ค.', '12月', 'Dec'],
];

// Sort longest Thai phrases first so longer sentences always match before individual words
const PHRASE_DICTIONARY: Array<[string, string, string]> = [
  ...RAW_PHRASE_DICTIONARY,
].sort((a, b) => b[0].length - a[0].length);

const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/;

export function translateString(input: string, lang: Language): string {
  if (lang === 'th' || !input) return input;
  let out = input;
  const targetIdx = lang === 'zh' ? 1 : 2;
  for (const entry of PHRASE_DICTIONARY) {
    const thPhrase = entry[0];
    if (out.includes(thPhrase)) {
      out = out.split(thPhrase).join(entry[targetIdx]);
    }
  }
  return out;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(
  undefined
);

export const AppPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG) as Language | null;
      if (saved === 'th' || saved === 'zh' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'th';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'industrial') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LANG, language);
    } catch {
      // ignore
    }
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-industrial');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  // Automatic DOM Text, Attribute & Input Value Localizer across all pages & modals
  useEffect(() => {
    const rootEl = containerRef.current;
    if (!rootEl) return;

    let isApplying = false;

    const processDOM = () => {
      if (isApplying) return;
      isApplying = true;
      try {
        // 1. Translate all Text Nodes
        const walker = document.createTreeWalker(
          rootEl,
          NodeFilter.SHOW_TEXT,
          null
        );
        let node = walker.nextNode() as (Text & {
          __origTh?: string;
          __lastOut?: string;
        }) | null;

        while (node) {
          const currentVal = node.nodeValue || '';
          if (currentVal.trim().length > 0) {
            if (node.__origTh === undefined) {
              node.__origTh = currentVal;
            } else if (
              currentVal !== node.__lastOut &&
              THAI_CHAR_REGEX.test(currentVal)
            ) {
              // React updated the text node with a new Thai string
              node.__origTh = currentVal;
            } else if (language === 'th' && currentVal !== node.__lastOut) {
              node.__origTh = currentVal;
            }

            const targetText =
              language === 'th'
                ? node.__origTh
                : translateString(node.__origTh, language);

            if (node.nodeValue !== targetText) {
              node.nodeValue = targetText;
            }
            node.__lastOut = targetText;
          }
          node = walker.nextNode() as (Text & {
            __origTh?: string;
            __lastOut?: string;
          }) | null;
        }

        // 2. Translate [placeholder] and [title] attributes across all elements
        const attrElements = rootEl.querySelectorAll('[placeholder], [title]');
        attrElements.forEach((el) => {
          const anyEl = el as HTMLElement & {
            __origPlaceholder?: string;
            __origTitle?: string;
          };

          const ph = anyEl.getAttribute('placeholder');
          if (ph) {
            if (anyEl.__origPlaceholder === undefined || THAI_CHAR_REGEX.test(ph)) {
              anyEl.__origPlaceholder = ph;
            }
            const nextPh =
              language === 'th'
                ? anyEl.__origPlaceholder
                : translateString(anyEl.__origPlaceholder, language);
            if (ph !== nextPh) {
              anyEl.setAttribute('placeholder', nextPh);
            }
          }

          const ttl = anyEl.getAttribute('title');
          if (ttl) {
            if (anyEl.__origTitle === undefined || THAI_CHAR_REGEX.test(ttl)) {
              anyEl.__origTitle = ttl;
            }
            const nextTtl =
              language === 'th'
                ? anyEl.__origTitle
                : translateString(anyEl.__origTitle, language);
            if (ttl !== nextTtl) {
              anyEl.setAttribute('title', nextTtl);
            }
          }
        });

        // 3. Translate unfocused <input type="text"> fields that hold Thai descriptions (e.g. station.thaiName / model.thaiDesc)
        const textInputs = rootEl.querySelectorAll('input[type="text"]');
        textInputs.forEach((inp) => {
          const inputEl = inp as HTMLInputElement & {
            __origThVal?: string;
            __lastOutVal?: string;
          };
          if (document.activeElement === inputEl) return;

          const curVal = inputEl.value || '';
          if (THAI_CHAR_REGEX.test(curVal)) {
            inputEl.__origThVal = curVal;
          }
          if (inputEl.__origThVal) {
            const targetVal =
              language === 'th'
                ? inputEl.__origThVal
                : translateString(inputEl.__origThVal, language);
            if (inputEl.value !== targetVal) {
              inputEl.value = targetVal;
              inputEl.__lastOutVal = targetVal;
            }
          }
        });
      } finally {
        isApplying = false;
      }
    };

    processDOM();

    const observer = new MutationObserver(() => {
      if (!isApplying) {
        processDOM();
      }
    });

    observer.observe(rootEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  const t = (th: string, zh: string, en: string): string => {
    if (language === 'zh') return zh;
    if (language === 'en') return en;
    return th;
  };

  const localizeStationDesc = (stationName: string, fallbackThai: string): string => {
    if (language === 'th') return fallbackThai;
    const entry = STATION_TRANSLATIONS[stationName];
    if (!entry) return translateString(fallbackThai, language);
    return language === 'zh' ? entry.zh : entry.en;
  };

  const localizeModelDesc = (modelId: string, fallbackThai: string): string => {
    if (language === 'th') return fallbackThai;
    const entry = MODEL_TRANSLATIONS[modelId];
    if (!entry) return translateString(fallbackThai, language);
    return language === 'zh' ? entry.zh : entry.en;
  };

  const localizeMonth = (monthKey: MonthKey) => {
    const meta = MONTHS.find((m) => m.key === monthKey) || MONTHS[0];
    if (language === 'zh') {
      return {
        short: meta.cnName,
        full: `${meta.cnName}`,
        sub: meta.enName,
      };
    }
    if (language === 'en') {
      return {
        short: meta.enName,
        full: `${meta.enName} (${meta.cnName})`,
        sub: meta.cnName,
      };
    }
    return {
      short: meta.shortThai,
      full: `${meta.fullThai} (${meta.cnName})`,
      sub: meta.cnName,
    };
  };

  return (
    <AppPreferencesContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        setTheme,
        t,
        localizeStationDesc,
        localizeModelDesc,
        localizeMonth,
      }}
    >
      <div ref={containerRef} className="min-h-screen flex flex-col">
        {children}
      </div>
    </AppPreferencesContext.Provider>
  );
};

export function useAppPreferences(): AppPreferencesContextValue {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  }
  return ctx;
}

/**
 * Reusable Page-Level Language & Theme Switcher Bar
 * Rendered directly inside the top header of EVERY page/sheet on the Web so users
 * can switch between ไทย (TH), จีน (中文), and อังกฤษ (EN) on any screen immediately.
 */
export const PageLanguageSwitchBar: React.FC<{ pageLabel?: string }> = ({
  pageLabel,
}) => {
  const { language, setLanguage, theme, setTheme, t } = useAppPreferences();

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Globe className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="font-bold text-slate-800">
          {t(
            'โหมดเปลี่ยนภาษาประจำหน้า (ไทย / จีน / อังกฤษ):',
            '页面语言切换模式 (泰语 / 中文 / 英语):',
            'Page Language Mode (Thai / Chinese / English):'
          )}
        </span>
        {pageLabel && (
          <span className="text-slate-500 hidden sm:inline">· {pageLabel}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Language Buttons: ไทย | 中文 | English */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono">
          <button
            type="button"
            onClick={() => setLanguage('th')}
            className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
              language === 'th'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            🇹🇭 ภาษาไทย (TH)
          </button>
          <button
            type="button"
            onClick={() => setLanguage('zh')}
            className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
              language === 'zh'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            🇨🇳 中文 (ZH)
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
              language === 'en'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            🇬🇧 English (EN)
          </button>
        </div>

        {/* Theme Mode Quick Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-amber-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{t('สว่าง', '浅色', 'Light')}</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 text-indigo-300 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>{t('มืด', '深色', 'Dark')}</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('industrial')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              theme === 'industrial'
                ? 'bg-sky-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t('โรงงาน', '工业蓝', 'Factory')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
