import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  INITIAL_MODELS,
  INITIAL_STATIONS,
  INITIAL_VOLUMES_BY_LINE,
  INITIAL_MONTHLY_PLAN_BY_LINE,
  MONTHS,
  WEEKS,
  ModelMetadata,
  StationConfig,
  ModelSeries,
  WeekKey,
  MonthKey,
  LineKey,
  SheetKey,
  MonthlyPlanByLine,
  calculateFactoryModel,
  calculateYearlyMPTrend,
} from './data/mpModelData';
import { DashboardOverview } from './components/DashboardOverview';
import { VolumeForecaster } from './components/VolumeForecaster';
import { MasterSpreadsheetView } from './components/MasterSpreadsheetView';
import { FormulaAndModelAnalysis } from './components/FormulaAndModelAnalysis';
import { MonthlyMPTrendView } from './components/MonthlyMPTrendView';
import { ManpowerReductionPlanView } from './components/ManpowerReductionPlanView';
import { LineComparisonSheetView } from './components/LineComparisonSheetView';
import { useAppPreferences, PageLanguageSwitchBar } from './context/AppPreferencesContext';
import {
  Layers,
  Save,
  Download,
  Upload,
  FolderOpen,
  Trash2,
  Check,
  X,
  Copy,
  TrendingUp,
  TrendingDown,
  Globe,
  Sun,
  Moon,
  Cpu,
  Scale,
} from 'lucide-react';

type ActiveTab =
  | 'dashboard'
  | 'monthly_trend'
  | 'forecaster'
  | 'reduction_plan'
  | 'line_compare'
  | 'master'
  | 'formulas';

const STORAGE_KEY_STATIONS = 'factory_linea_lineb_stations_v5';
const STORAGE_KEY_VOLUMES_BY_LINE = 'factory_linea_lineb_volumes_v5';
const STORAGE_KEY_MODELS = 'factory_linea_lineb_models_v5';
const STORAGE_KEY_MONTHLY_PLAN = 'factory_linea_lineb_monthly_plan_v1';
const STORAGE_KEY_SNAPSHOTS = 'factory_linea_lineb_snapshots_v5';

interface SavedSnapshot {
  id: string;
  name: string;
  savedAt: string;
  models: ModelMetadata[];
  stations: StationConfig[];
  volumesByLine: Record<LineKey, Record<ModelSeries, Record<WeekKey, number>>>;
  monthlyPlanByLine?: MonthlyPlanByLine;
}

export default function App() {
  const { language, setLanguage, theme, setTheme, t } = useAppPreferences();
  const [activeTab, setActiveTab] = useState<ActiveTab>('reduction_plan');
  const [activeLine, setActiveLine] = useState<LineKey>('LineB');
  const [activeSheet, setActiveSheet] = useState<SheetKey>('ALL');
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>('1W');
  const [forecasterPresetWeek, setForecasterPresetWeek] = useState<WeekKey>('1W');
  const [useDynamicVolumeUph, setUseDynamicVolumeUph] = useState<boolean>(true);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [snapshotNameInput, setSnapshotNameInput] = useState<string>('');
  const [saveBannerMessage, setSaveBannerMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [models, setModels] = useState<ModelMetadata[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MODELS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(INITIAL_MODELS));
  });

  const [stations, setStations] = useState<StationConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(INITIAL_STATIONS));
  });

  const [volumesByLine, setVolumesByLine] = useState<
    Record<LineKey, Record<ModelSeries, Record<WeekKey, number>>>
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VOLUMES_BY_LINE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(INITIAL_VOLUMES_BY_LINE));
  });

  const [monthlyPlanByLine, setMonthlyPlanByLine] = useState<MonthlyPlanByLine>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MONTHLY_PLAN);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return JSON.parse(JSON.stringify(INITIAL_MONTHLY_PLAN_BY_LINE));
  });

  const [snapshots, setSnapshots] = useState<SavedSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(models));
    } catch {
      // ignore
    }
  }, [models]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(stations));
    } catch {
      // ignore
    }
  }, [stations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VOLUMES_BY_LINE, JSON.stringify(volumesByLine));
    } catch {
      // ignore
    }
  }, [volumesByLine]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_MONTHLY_PLAN,
        JSON.stringify(monthlyPlanByLine)
      );
    } catch {
      // ignore
    }
  }, [monthlyPlanByLine]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots));
    } catch {
      // ignore
    }
  }, [snapshots]);

  const showToast = (msg: string) => {
    setSaveBannerMessage(msg);
    setTimeout(() => setSaveBannerMessage(null), 2500);
  };

  const activeWeeklyVolumes = volumesByLine[activeLine];

  // Distinct Stations for Line A and Line B
  const lineAStations = useMemo(
    () => stations.filter((s) => s.area === 'LineA'),
    [stations]
  );
  const lineBStations = useMemo(
    () => stations.filter((s) => s.area === 'LineB'),
    [stations]
  );

  // Filter stations by activeLine ('LineA' | 'LineB') and activeSheet ('CAB' | 'FG' | 'ALL')
  const lineStations = useMemo(
    () => stations.filter((s) => s.area === activeLine),
    [stations, activeLine]
  );
  const cabStations = useMemo(
    () => lineStations.filter((s) => s.subArea === 'CAB'),
    [lineStations]
  );
  const fgStations = useMemo(
    () => lineStations.filter((s) => s.subArea === 'FG'),
    [lineStations]
  );
  const activeStations = useMemo(() => {
    if (activeSheet === 'CAB') return cabStations;
    if (activeSheet === 'FG') return fgStations;
    return lineStations;
  }, [activeSheet, cabStations, fgStations, lineStations]);

  // Weekly Summary Metrics
  const lineATotalMetrics = useMemo(
    () =>
      calculateFactoryModel(
        stations.filter((s) => s.area === 'LineA'),
        volumesByLine.LineA,
        undefined,
        'ALL'
      ),
    [stations, volumesByLine.LineA]
  );
  const lineBTotalMetrics = useMemo(
    () =>
      calculateFactoryModel(
        stations.filter((s) => s.area === 'LineB'),
        volumesByLine.LineB,
        undefined,
        'ALL'
      ),
    [stations, volumesByLine.LineB]
  );

  const lineACabMetrics = useMemo(
    () =>
      calculateFactoryModel(
        stations.filter((s) => s.area === 'LineA' && s.subArea === 'CAB'),
        volumesByLine.LineA,
        undefined,
        'CAB'
      ),
    [stations, volumesByLine.LineA]
  );
  const lineAFgMetrics = useMemo(
    () =>
      calculateFactoryModel(
        stations.filter((s) => s.area === 'LineA' && s.subArea === 'FG'),
        volumesByLine.LineA,
        undefined,
        'FG'
      ),
    [stations, volumesByLine.LineA]
  );
  const lineBCabMetrics = useMemo(
    () =>
      calculateFactoryModel(
        stations.filter((s) => s.area === 'LineB' && s.subArea === 'CAB'),
        volumesByLine.LineB,
        undefined,
        'CAB'
      ),
    [stations, volumesByLine.LineB]
  );
  const lineBFgMetrics = useMemo(
    () =>
      calculateFactoryModel(
        stations.filter((s) => s.area === 'LineB' && s.subArea === 'FG'),
        volumesByLine.LineB,
        undefined,
        'FG'
      ),
    [stations, volumesByLine.LineB]
  );

  const cabMetrics = activeLine === 'LineA' ? lineACabMetrics : lineBCabMetrics;
  const fgMetrics = activeLine === 'LineA' ? lineAFgMetrics : lineBFgMetrics;
  const activeMetrics = useMemo(
    () =>
      calculateFactoryModel(
        activeStations,
        activeWeeklyVolumes,
        undefined,
        activeSheet
      ),
    [activeStations, activeWeeklyVolumes, activeSheet]
  );

  // 12-Month Trend Metrics
  const activeMonthlyTrend = useMemo(
    () =>
      calculateYearlyMPTrend(
        lineStations,
        activeSheet,
        monthlyPlanByLine[activeLine],
        useDynamicVolumeUph
      ),
    [lineStations, activeSheet, monthlyPlanByLine, activeLine, useDynamicVolumeUph]
  );

  const lineATotalMonthlyTrend = useMemo(
    () =>
      calculateYearlyMPTrend(
        stations.filter((s) => s.area === 'LineA'),
        'ALL',
        monthlyPlanByLine.LineA,
        useDynamicVolumeUph
      ),
    [stations, monthlyPlanByLine.LineA, useDynamicVolumeUph]
  );

  const lineBTotalMonthlyTrend = useMemo(
    () =>
      calculateYearlyMPTrend(
        stations.filter((s) => s.area === 'LineB'),
        'ALL',
        monthlyPlanByLine.LineB,
        useDynamicVolumeUph
      ),
    [stations, monthlyPlanByLine.LineB, useDynamicVolumeUph]
  );

  const handleUpdateStandardTime = (
    stationId: string,
    model: ModelSeries,
    newTime: number
  ) => {
    setStations((prev) =>
      prev.map((s) =>
        s.id === stationId
          ? {
              ...s,
              standardTimes: {
                ...s.standardTimes,
                [model]: newTime,
              },
            }
          : s
      )
    );
  };

  const handleUpdateStationField = (
    stationId: string,
    patch: Partial<StationConfig>
  ) => {
    setStations((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, ...patch } : s))
    );
  };

  const handleUpdateModelMeta = (
    modelId: ModelSeries,
    patch: Partial<ModelMetadata>
  ) => {
    setModels((prev) =>
      prev.map((m) => (m.id === modelId ? { ...m, ...patch } : m))
    );
  };

  const handleUpdateWeeklyVolume = (
    model: ModelSeries,
    week: WeekKey,
    newVol: number
  ) => {
    setVolumesByLine((prev) => {
      const updatedLineVols = {
        ...prev[activeLine],
        [model]: {
          ...prev[activeLine][model],
          [week]: newVol,
        },
      };
      // Also keep M09 (September) in 12-month plan synchronized with 1W-4W sum
      const sum4W = WEEKS.reduce(
        (acc, w) => acc + (updatedLineVols[model]?.[w] || 0),
        0
      );
      setMonthlyPlanByLine((prevMonthly) => ({
        ...prevMonthly,
        [activeLine]: {
          ...prevMonthly[activeLine],
          volumes: {
            ...prevMonthly[activeLine].volumes,
            [model]: {
              ...prevMonthly[activeLine].volumes[model],
              M09: sum4W,
            },
          },
        },
      }));
      return {
        ...prev,
        [activeLine]: updatedLineVols,
      };
    });
  };

  // 12-Month Plan Handlers
  const handleUpdateMonthlyVolume = (
    line: LineKey,
    model: ModelSeries,
    month: MonthKey,
    val: number
  ) => {
    setMonthlyPlanByLine((prev) => ({
      ...prev,
      [line]: {
        ...prev[line],
        volumes: {
          ...prev[line].volumes,
          [model]: {
            ...prev[line].volumes[model],
            [month]: val,
          },
        },
      },
    }));
  };

  const handleScaleMonthTotalVolume = (
    line: LineKey,
    month: MonthKey,
    newTotal: number
  ) => {
    setMonthlyPlanByLine((prev) => {
      const currentVols = prev[line].volumes;
      let oldTotal = 0;
      for (const m of models) {
        oldTotal += currentVols[m.id]?.[month] || 0;
      }
      const nextVolumes = { ...currentVols };
      if (oldTotal <= 0) {
        const perModel = Math.round(newTotal / models.length);
        for (const m of models) {
          nextVolumes[m.id] = {
            ...nextVolumes[m.id],
            [month]: perModel,
          };
        }
      } else {
        const factor = newTotal / oldTotal;
        for (const m of models) {
          nextVolumes[m.id] = {
            ...nextVolumes[m.id],
            [month]: Math.round((currentVols[m.id]?.[month] || 0) * factor),
          };
        }
      }
      return {
        ...prev,
        [line]: {
          ...prev[line],
          volumes: nextVolumes,
        },
      };
    });
  };

  const handleUpdateMonthlyUph = (
    line: LineKey,
    month: MonthKey,
    val: number
  ) => {
    setMonthlyPlanByLine((prev) => ({
      ...prev,
      [line]: {
        ...prev[line],
        uphByMonth: {
          ...prev[line].uphByMonth,
          [month]: val,
        },
      },
    }));
  };

  const handleUpdateMonthlyWorkingHours = (
    line: LineKey,
    month: MonthKey,
    val: number
  ) => {
    setMonthlyPlanByLine((prev) => ({
      ...prev,
      [line]: {
        ...prev[line],
        workingHoursByMonth: {
          ...prev[line].workingHoursByMonth,
          [month]: val,
        },
      },
    }));
  };

  const handleUpdateManualMonthlyMP = (
    line: LineKey,
    month: MonthKey,
    val: number | null
  ) => {
    setMonthlyPlanByLine((prev) => ({
      ...prev,
      [line]: {
        ...prev[line],
        manualTotalMP: {
          ...(prev[line].manualTotalMP || {}),
          [month]: val,
        },
      },
    }));
  };

  const handleSyncSeptemberFromWeekly = () => {
    setMonthlyPlanByLine((prev) => {
      const nextLineVolumes = { ...prev[activeLine].volumes };
      for (const m of models) {
        const sum4W = WEEKS.reduce(
          (acc, w) => acc + (volumesByLine[activeLine][m.id]?.[w] || 0),
          0
        );
        nextLineVolumes[m.id] = {
          ...nextLineVolumes[m.id],
          M09: sum4W,
        };
      }
      return {
        ...prev,
        [activeLine]: {
          ...prev[activeLine],
          volumes: nextLineVolumes,
        },
      };
    });
    showToast(
      `ซิงค์ยอดผลิตเดือนกันยายน (9月) ของ ${activeLine} จากผลรวมสัปดาห์ 1W–4W เรียบร้อยแล้ว`
    );
  };

  const handleResetMonthlyPlan = () => {
    setMonthlyPlanByLine(JSON.parse(JSON.stringify(INITIAL_MONTHLY_PLAN_BY_LINE)));
    try {
      localStorage.removeItem(STORAGE_KEY_MONTHLY_PLAN);
    } catch {
      // ignore
    }
    showToast('คืนค่าข้อมูลแผน 12 เดือน (ม.ค.–ธ.ค.) เริ่มต้นเรียบร้อยแล้ว');
  };

  const handleCopyVolumesFromOtherLine = () => {
    const sourceLine: LineKey = activeLine === 'LineA' ? 'LineB' : 'LineA';
    setVolumesByLine((prev) => ({
      ...prev,
      [activeLine]: JSON.parse(JSON.stringify(prev[sourceLine])),
    }));
    showToast(`คัดลอกยอดคำสั่งผลิต (1W–4W) จาก ${sourceLine} มาที่ ${activeLine} เรียบร้อยแล้ว`);
  };

  const handleSaveForecastToWeek = (
    week: WeekKey,
    volumes: Record<ModelSeries, number>
  ) => {
    setVolumesByLine((prev) => {
      const nextLineVols = { ...prev[activeLine] };
      for (const m of models) {
        nextLineVols[m.id] = {
          ...nextLineVols[m.id],
          [week]: Math.max(0, volumes[m.id] || 0),
        };
      }
      // Keep September (M09) in 12-Month Trend synchronized with the updated 1W-4W sum
      setMonthlyPlanByLine((prevMonthly) => {
        const nextMonthlyVols = { ...prevMonthly[activeLine].volumes };
        for (const m of models) {
          const sum4W = WEEKS.reduce(
            (acc, w) => acc + (nextLineVols[m.id]?.[w] || 0),
            0
          );
          nextMonthlyVols[m.id] = {
            ...nextMonthlyVols[m.id],
            M09: sum4W,
          };
        }
        return {
          ...prevMonthly,
          [activeLine]: {
            ...prevMonthly[activeLine],
            volumes: nextMonthlyVols,
          },
        };
      });
      return {
        ...prev,
        [activeLine]: nextLineVols,
      };
    });
  };

  const handleApplyForecastToMonth = (
    month: MonthKey,
    volumes: Record<ModelSeries, number>,
    uph: number
  ) => {
    setMonthlyPlanByLine((prev) => {
      const nextVolumes = { ...prev[activeLine].volumes };
      for (const m of models) {
        nextVolumes[m.id] = {
          ...nextVolumes[m.id],
          [month]: Math.max(0, volumes[m.id] || 0),
        };
      }
      return {
        ...prev,
        [activeLine]: {
          ...prev[activeLine],
          volumes: nextVolumes,
          uphByMonth: {
            ...prev[activeLine].uphByMonth,
            [month]: Math.max(1, uph || 140),
          },
        },
      };
    });
  };

  const handleAddStation = () => {
    const targetSubArea = activeSheet === 'FG' ? 'FG' : 'CAB';
    const countInSub =
      lineStations.filter((s) => s.subArea === targetSubArea).length + 1;
    const prefix = activeLine === 'LineA' ? 'A' : 'B';
    const newStation: StationConfig = {
      id: `custom_${activeLine.toLowerCase()}_${targetSubArea.toLowerCase()}_${Date.now()}`,
      code: `${prefix}-${targetSubArea}-${String(countInSub).padStart(2, '0')}`,
      name: `New ${targetSubArea} Station ${countInSub}`,
      thaiName: `สถานีงานใหม่ ${activeLine} ${targetSubArea} ${countInSub}`,
      area: activeLine,
      subArea: targetSubArea,
      uph: 140,
      uphByWeek: { '1W': 140, '2W': 140, '3W': 140, '4W': 140 },
      efficiency: targetSubArea === 'FG' ? 0.70 : 0.80,
      standardTimes: {
        'TM19/21': 120.0,
        'TM14': 120.0,
        'BM TD': 120.0,
        'BM': 120.0,
        'T-Door': 120.0,
        'SBS': 120.0,
        'T-Door ice': 120.0,
      },
    };
    setStations((prev) => [...prev, newStation]);
  };

  const handleDeleteStation = (stationId: string) => {
    if (lineStations.length <= 1) return;
    setStations((prev) => prev.filter((s) => s.id !== stationId));
  };

  const handleResetAll = () => {
    setModels(JSON.parse(JSON.stringify(INITIAL_MODELS)));
    setStations(JSON.parse(JSON.stringify(INITIAL_STATIONS)));
    setVolumesByLine(JSON.parse(JSON.stringify(INITIAL_VOLUMES_BY_LINE)));
    setMonthlyPlanByLine(JSON.parse(JSON.stringify(INITIAL_MONTHLY_PLAN_BY_LINE)));
    try {
      localStorage.removeItem(STORAGE_KEY_MODELS);
      localStorage.removeItem(STORAGE_KEY_STATIONS);
      localStorage.removeItem(STORAGE_KEY_VOLUMES_BY_LINE);
      localStorage.removeItem(STORAGE_KEY_MONTHLY_PLAN);
    } catch {
      // ignore
    }
    showToast('คืนค่าข้อมูลมาตรฐานเริ่มต้นของทั้ง LineA และ LineB (รายสัปดาห์ & 12 เดือน) เรียบร้อยแล้ว');
  };

  const handleSaveSnapshot = () => {
    const label =
      snapshotNameInput.trim() ||
      `แผนผลิต LineA & LineB — ${new Date().toLocaleString('th-TH')}`;
    const newSnap: SavedSnapshot = {
      id: `snap_${Date.now()}`,
      name: label,
      savedAt: new Date().toLocaleString('th-TH'),
      models: JSON.parse(JSON.stringify(models)),
      stations: JSON.parse(JSON.stringify(stations)),
      volumesByLine: JSON.parse(JSON.stringify(volumesByLine)),
      monthlyPlanByLine: JSON.parse(JSON.stringify(monthlyPlanByLine)),
    };
    setSnapshots((prev) => [newSnap, ...prev]);
    setSnapshotNameInput('');
    showToast(`บันทึกชุดข้อมูล "${label}" ลงในระบบเรียบร้อยแล้ว`);
  };

  const handleLoadSnapshot = (snap: SavedSnapshot) => {
    setModels(JSON.parse(JSON.stringify(snap.models)));
    setStations(JSON.parse(JSON.stringify(snap.stations)));
    if (snap.volumesByLine) {
      setVolumesByLine(JSON.parse(JSON.stringify(snap.volumesByLine)));
    }
    if (snap.monthlyPlanByLine) {
      setMonthlyPlanByLine(JSON.parse(JSON.stringify(snap.monthlyPlanByLine)));
    }
    setIsStorageModalOpen(false);
    showToast(`โหลดข้อมูล "${snap.name}" สำเร็จ`);
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleExportProjectJSON = () => {
    const payload = {
      version: '5.0',
      exportedAt: new Date().toISOString(),
      models,
      stations,
      volumesByLine,
      monthlyPlanByLine,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factory_LineA_LineB_MP_Data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์ข้อมูล (.json) ทั้ง LineA และ LineB เรียบร้อยแล้ว');
  };

  const handleImportProjectJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        if (parsed.models && parsed.stations) {
          setModels(parsed.models);
          setStations(parsed.stations);
          if (parsed.volumesByLine) {
            setVolumesByLine(parsed.volumesByLine);
          } else if (parsed.weeklyVolumes) {
            setVolumesByLine({
              LineA: parsed.weeklyVolumes,
              LineB: parsed.weeklyVolumes,
            });
          }
          if (parsed.monthlyPlanByLine) {
            setMonthlyPlanByLine(parsed.monthlyPlanByLine);
          }
          setIsStorageModalOpen(false);
          showToast(`นำเข้าข้อมูลจากไฟล์ "${file.name}" สำเร็จ`);
        }
      } catch {
        showToast('รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ .json ที่ส่งออกจากระบบ');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleNavigateToForecaster = (presetWeek: WeekKey) => {
    setForecasterPresetWeek(presetWeek);
    setActiveTab('forecaster');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 Zones (Brand Wordmark | Navigation Links | Primary Actions) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          LineA & LineB · Standard MP
        </a>

        {/* Zone 2: Clean Text Navigation Links */}
        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            ภาพรวมประสิทธิภาพ
          </button>
          <button
            onClick={() => setActiveTab('monthly_trend')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'monthly_trend'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>กราฟแนวโน้ม MP 12 เดือน</span>
          </button>
          <button
            onClick={() => setActiveTab('forecaster')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'forecaster'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            คาดการณ์กำลังคน MP
          </button>
          <button
            onClick={() => setActiveTab('reduction_plan')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'reduction_plan'
                ? 'border-rose-600 text-rose-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>แผนลดกำลังคน & ต้นทุน</span>
          </button>
          <button
            onClick={() => setActiveTab('line_compare')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'line_compare'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>แยกไลน์ Line A vs Line B (ST & กำลังคน)</span>
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'master'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            ตารางข้อมูลหลัก
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'formulas'
                ? 'border-blue-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            สูตรคำนวณ & เวลารายรุ่น
          </button>
        </nav>

        {/* Zone 3: Language Switcher, Theme Switcher & Primary Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Language Switcher (TH | 中文 | EN) */}
          <div
            className="flex items-center gap-0.5 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono"
            title={t(
              'เปลี่ยนภาษาแสดงผล (ไทย / จีน / อังกฤษ)',
              '切换显示语言 (泰语 / 中文 / 英语)',
              'Switch Display Language (TH / ZH / EN)'
            )}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 mx-1" />
            <button
              onClick={() => setLanguage('th')}
              className={`px-2 py-1 rounded font-bold transition-colors cursor-pointer ${
                language === 'th'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ไทย
            </button>
            <button
              onClick={() => setLanguage('zh')}
              className={`px-2 py-1 rounded font-bold transition-colors cursor-pointer ${
                language === 'zh'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded font-bold transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Mode Switcher (Light | Dark | Industrial) */}
          <div
            className="flex items-center gap-0.5 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs"
            title={t(
              'เปลี่ยนโหมดธีมสี (สว่าง / มืด / โรงงาน)',
              '切换主题模式 (浅色 / 深色 / 工业蓝)',
              'Switch Theme Mode (Light / Dark / Industrial)'
            )}
          >
            <button
              onClick={() => setTheme('light')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-amber-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('สว่าง', '浅色', 'Light')}</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-900 text-indigo-300 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('มืด', '深色', 'Dark')}</span>
            </button>
            <button
              onClick={() => setTheme('industrial')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                theme === 'industrial'
                  ? 'bg-sky-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('โรงงาน', '工业蓝', 'Factory')}</span>
            </button>
          </div>

          <button
            onClick={() => setIsStorageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>บันทึก / จัดเก็บข้อมูล ({snapshots.length})</span>
          </button>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {saveBannerMessage && (
        <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-medium flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveBannerMessage}</span>
        </div>
      )}

      {/* Dual-Level Selector Bar: 1. Select Production Line (LineA vs LineB) | 2. Select Sheet (CAB, FG, ALL, 12-Month Trend) */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Production Line Selector (LineA vs LineB) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mr-1">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>สายการผลิต (区域):</span>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setActiveLine('LineA')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap font-mono ${
                  activeLine === 'LineA'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                LineA (CAB+FG: {lineATotalMetrics.totalStdMP[selectedWeek]} MP ·{' '}
                {lineATotalMetrics.totalVolume[selectedWeek].toLocaleString()} คัน)
              </button>

              <button
                onClick={() => setActiveLine('LineB')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap font-mono ${
                  activeLine === 'LineB'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                LineB (CAB+FG: {lineBTotalMetrics.totalStdMP[selectedWeek]} MP ·{' '}
                {lineBTotalMetrics.totalVolume[selectedWeek].toLocaleString()} คัน)
              </button>
            </div>

            <button
              onClick={handleCopyVolumesFromOtherLine}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              title={`คัดลอกยอดสั่งผลิต 1W-4W จาก ${
                activeLine === 'LineA' ? 'LineB' : 'LineA'
              } มาใช้ที่ ${activeLine}`}
            >
              <Copy className="w-3 h-3" />
              <span>
                ใช้ยอดผลิตเดียวกับ {activeLine === 'LineA' ? 'LineB' : 'LineA'}
              </span>
            </button>
          </div>

          {/* Right: Sheet Selector within Active Line (CAB, FG, ALL, + 12-Month Trend Sheet) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              เลือก Sheet ของ {activeLine}:
            </span>
            <button
              onClick={() => setActiveSheet('CAB')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap font-mono ${
                activeSheet === 'CAB'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {activeLine} — Sheet CAB ({cabStations.length} สถานี · {selectedWeek}=
              {cabMetrics.totalStdMP[selectedWeek]} MP)
            </button>

            <button
              onClick={() => setActiveSheet('FG')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap font-mono ${
                activeSheet === 'FG'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {activeLine} — Sheet FG ({fgStations.length} สถานี · {selectedWeek}=
              {fgMetrics.totalStdMP[selectedWeek]} MP)
            </button>

            <button
              onClick={() => setActiveSheet('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap font-mono ${
                activeSheet === 'ALL'
                  ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              รวม {activeLine} CAB + FG ({lineStations.length} สถานี · {selectedWeek}=
              {cabMetrics.totalStdMP[selectedWeek] + fgMetrics.totalStdMP[selectedWeek]} MP)
            </button>

            <button
              onClick={() => setActiveTab('forecaster')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'forecaster'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span>⚡ Sheet ปรับเพิ่ม-ลด Volume → MP</span>
            </button>

            <button
              onClick={() => setActiveTab('reduction_plan')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'reduction_plan'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Sheet แผนลดกำลังคน & ลดต้นทุน</span>
            </button>

            <button
              onClick={() => setActiveTab('line_compare')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'line_compare'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                  : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Sheet เปรียบเทียบ Line A vs Line B (ST & กำลังคน)</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly_trend')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'monthly_trend'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-bold'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Sheet กราฟแนวโน้ม 12 เดือน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            activeLine={activeLine}
            activeSheet={activeSheet}
            models={models}
            metrics={activeMetrics}
            lineACabMetrics={lineACabMetrics}
            lineAFgMetrics={lineAFgMetrics}
            lineBCabMetrics={lineBCabMetrics}
            lineBFgMetrics={lineBFgMetrics}
            weeklyVolumes={activeWeeklyVolumes}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            onSelectLineAndSheet={(line, sheet) => {
              setActiveLine(line);
              setActiveSheet(sheet);
            }}
            onNavigateToForecaster={handleNavigateToForecaster}
            onNavigateToMaster={() => setActiveTab('master')}
            onNavigateToLineCompare={() => setActiveTab('line_compare')}
            onUpdateStandardTime={handleUpdateStandardTime}
            onUpdateWeeklyVolume={handleUpdateWeeklyVolume}
            onUpdateStationField={handleUpdateStationField}
            onUpdateModelMeta={handleUpdateModelMeta}
            onAddStation={handleAddStation}
          />
        )}

        {activeTab === 'monthly_trend' && (
          <MonthlyMPTrendView
            activeLine={activeLine}
            activeSheet={activeSheet}
            models={models}
            stations={activeStations}
            linePlan={monthlyPlanByLine[activeLine]}
            activeTrend={activeMonthlyTrend}
            lineATotalTrend={lineATotalMonthlyTrend}
            lineBTotalTrend={lineBTotalMonthlyTrend}
            useDynamicVolumeUph={useDynamicVolumeUph}
            onToggleDynamicUph={setUseDynamicVolumeUph}
            onSelectLineAndSheet={(line, sheet) => {
              setActiveLine(line);
              setActiveSheet(sheet);
            }}
            onUpdateMonthlyVolume={handleUpdateMonthlyVolume}
            onScaleMonthTotalVolume={handleScaleMonthTotalVolume}
            onUpdateMonthlyUph={handleUpdateMonthlyUph}
            onUpdateMonthlyWorkingHours={handleUpdateMonthlyWorkingHours}
            onUpdateManualMonthlyMP={handleUpdateManualMonthlyMP}
            onSyncSeptemberFromWeekly={handleSyncSeptemberFromWeekly}
            onResetMonthlyPlan={handleResetMonthlyPlan}
            onUpdateStationField={handleUpdateStationField}
          />
        )}

        {activeTab === 'forecaster' && (
          <VolumeForecaster
            key={`${forecasterPresetWeek}-${activeLine}`}
            activeLine={activeLine}
            activeSheet={activeSheet}
            models={models}
            stations={activeStations}
            allLineStations={lineStations}
            weeklyVolumes={activeWeeklyVolumes}
            baselineMetrics={activeMetrics}
            initialPresetWeek={forecasterPresetWeek}
            onSelectLineAndSheet={(line, sheet) => {
              setActiveLine(line);
              setActiveSheet(sheet);
            }}
            onUpdateStationField={handleUpdateStationField}
            onUpdateStandardTime={handleUpdateStandardTime}
            onUpdateModelMeta={handleUpdateModelMeta}
            onSaveForecastToWeek={handleSaveForecastToWeek}
            onApplyToMonth={handleApplyForecastToMonth}
          />
        )}

        {activeTab === 'reduction_plan' && (
          <ManpowerReductionPlanView
            activeLine={activeLine}
            activeSheet={activeSheet}
            models={models}
            stations={activeStations}
            allLineStations={lineStations}
            weeklyVolumes={activeWeeklyVolumes}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            onSelectLineAndSheet={(line, sheet) => {
              setActiveLine(line);
              setActiveSheet(sheet);
            }}
            onSaveForecastToWeek={handleSaveForecastToWeek}
            onApplyToMonth={handleApplyForecastToMonth}
          />
        )}

        {activeTab === 'line_compare' && (
          <LineComparisonSheetView
            models={models}
            stations={stations}
            lineAStations={lineAStations}
            lineBStations={lineBStations}
            volumesByLine={volumesByLine}
            lineACabMetrics={lineACabMetrics}
            lineAFgMetrics={lineAFgMetrics}
            lineATotalMetrics={lineATotalMetrics}
            lineBCabMetrics={lineBCabMetrics}
            lineBFgMetrics={lineBFgMetrics}
            lineBTotalMetrics={lineBTotalMetrics}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            onNavigateToLine={(line, sheet) => {
              setActiveLine(line);
              if (sheet) setActiveSheet(sheet);
              setActiveTab('master');
            }}
            onUpdateStandardTime={handleUpdateStandardTime}
            onUpdateStationField={handleUpdateStationField}
          />
        )}

        {activeTab === 'master' && (
          <MasterSpreadsheetView
            activeLine={activeLine}
            activeSheet={activeSheet}
            models={models}
            stations={activeStations}
            weeklyVolumes={activeWeeklyVolumes}
            metrics={activeMetrics}
            onUpdateStandardTime={handleUpdateStandardTime}
            onUpdateWeeklyVolume={handleUpdateWeeklyVolume}
            onUpdateStationField={handleUpdateStationField}
            onUpdateModelMeta={handleUpdateModelMeta}
            onAddStation={handleAddStation}
            onDeleteStation={handleDeleteStation}
            onResetAll={handleResetAll}
          />
        )}

        {activeTab === 'formulas' && (
          <FormulaAndModelAnalysis
            models={models}
            stations={activeStations}
            onUpdateStandardTime={handleUpdateStandardTime}
            onUpdateStationField={handleUpdateStationField}
            onUpdateModelMeta={handleUpdateModelMeta}
            onAddStation={handleAddStation}
          />
        )}
      </main>

      {/* Data Save & Version Manager Modal */}
      {isStorageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-xl">
            <PageLanguageSwitchBar pageLabel="บันทึก / จัดเก็บข้อมูล (Save / Backup Data)" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  ระบบบันทึกและจัดเก็บข้อมูลตารางคำนวณ (LineA & LineB — รายสัปดาห์ & 12 เดือน)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  บันทึกเวอร์ชันข้อมูลทั้ง LineA และ LineB ไว้บนเว็บเบราว์เซอร์ หรือดาวน์โหลดเป็นไฟล์สำรอง (.json)
                </p>
              </div>
              <button
                onClick={() => setIsStorageModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create New Snapshot */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="text-xs font-bold text-slate-800">
                1. บันทึกข้อมูลปัจจุบันเก็บไว้ในรายการบนเว็บ (Save Snapshot)
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={snapshotNameInput}
                  onChange={(e) => setSnapshotNameInput(e.target.value)}
                  placeholder="ตั้งชื่อชุดข้อมูล เช่น แผนผลิต 12 เดือน (LineA + LineB)..."
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <button
                  onClick={handleSaveSnapshot}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกเวอร์ชันนี้</span>
                </button>
              </div>
            </div>

            {/* Saved Snapshots List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">
                2. รายการเวอร์ชันที่บันทึกไว้ ({snapshots.length} รายการ)
              </div>
              {snapshots.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  ยังไม่มีเวอร์ชันที่บันทึกแยกไว้ (ข้อมูลปัจจุบันถูกบันทึกอัตโนมัติในเบราว์เซอร์อยู่แล้ว)
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {snap.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          บันทึกเมื่อ: {snap.savedAt} · {snap.stations.length} สถานีรวม
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleLoadSnapshot(snap)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>เรียกใช้</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export / Import File Backup */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportProjectJSON}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดไฟล์ข้อมูล (.json)</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>นำเข้าไฟล์ข้อมูล (.json)</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportProjectJSON}
                  className="hidden"
                />
              </div>

              <button
                onClick={handleResetAll}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
              >
                คืนค่าข้อมูลเริ่มต้นโรงงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 mt-8">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            泰国工厂标准定编测算模型 · ระบบคำนวณและคาดการณ์อัตรากำลังคนมาตรฐาน (LineA & LineB — Sheet CAB, Sheet FG & กราฟแนวโน้ม 12 เดือน)
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsStorageModalOpen(true)}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              จัดการเวอร์ชันข้อมูลที่บันทึกไว้
            </button>
            <button
              onClick={handleResetAll}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              คืนค่าข้อมูลมาตรฐานเริ่มต้นทั้ง LineA และ LineB
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
