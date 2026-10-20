import React, { useState, useMemo, useEffect } from 'react';
import {
  WEEKS,
  MONTHS,
  WeekKey,
  MonthKey,
  LineKey,
  SheetKey,
  ModelSeries,
  ModelMetadata,
  StationConfig,
  INITIAL_VOLUMES_BY_LINE,
  simulateVolumeForecast,
} from '../data/mpModelData';
import {
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Download,
  BookOpen,
  Layers,
  XCircle,
  Sliders,
  Check,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { PageLanguageSwitchBar } from '../context/AppPreferencesContext';

interface ManpowerReductionPlanViewProps {
  activeLine: LineKey;
  activeSheet: SheetKey;
  models: ModelMetadata[];
  stations: StationConfig[];
  allLineStations: StationConfig[];
  weeklyVolumes: Record<ModelSeries, Record<WeekKey, number>>;
  selectedWeek: WeekKey;
  onSelectWeek: (w: WeekKey) => void;
  onSelectLineAndSheet: (line: LineKey, sheet: SheetKey) => void;
  onSaveForecastToWeek: (week: WeekKey, volumes: Record<ModelSeries, number>) => void;
  onApplyToMonth?: (
    month: MonthKey,
    volumes: Record<ModelSeries, number>,
    uph: number
  ) => void;
}

type ReductionOptionPreset =
  | 'cancel_multidoor_sbs'
  | 'cancel_high_labor_bm'
  | 'cancel_low_volume'
  | 'focus_top_mount_only'
  | 'proportional_25_cut'
  | 'custom';

export const ManpowerReductionPlanView: React.FC<ManpowerReductionPlanViewProps> = ({
  activeLine,
  activeSheet,
  models,
  stations,
  allLineStations,
  weeklyVolumes,
  selectedWeek,
  onSelectWeek,
  onSelectLineAndSheet,
  onSaveForecastToWeek,
  onApplyToMonth,
}) => {
  const [activePreset, setActivePreset] = useState<ReductionOptionPreset>(
    'cancel_multidoor_sbs'
  );
  const [costPerMpPerMonth, setCostPerMpPerMonth] = useState<number>(18500);
  const [severanceMonths, setSeveranceMonths] = useState<number>(1);
  const [targetMonth, setTargetMonth] = useState<MonthKey>('M09');
  const [isLiveSyncToWeb, setIsLiveSyncToWeb] = useState<boolean>(false);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

  // Original Factory Baseline Volumes for the selected Line & Week
  const baselineVolumes = useMemo(() => {
    const ref = INITIAL_VOLUMES_BY_LINE[activeLine];
    const out = {} as Record<ModelSeries, number>;
    for (const m of models) {
      out[m.id] = ref[m.id]?.[selectedWeek] || 0;
    }
    return out;
  }, [activeLine, selectedWeek, models]);

  const baselineTotalVolume = useMemo(
    () => models.reduce((acc, m) => acc + (baselineVolumes[m.id] || 0), 0),
    [models, baselineVolumes]
  );

  // Standard working hours per week at baseline 140 UPH
  const standardWeeklyHours = useMemo(
    () => (baselineTotalVolume > 0 ? baselineTotalVolume / 140 : 96),
    [baselineTotalVolume]
  );

  // Retention percentage (0% = Canceled, 100% = Normal) per model
  const [modelRetentionPct, setModelRetentionPct] = useState<
    Record<ModelSeries, number>
  >(() => ({
    'TM19/21': 100,
    TM14: 100,
    'BM TD': 100,
    BM: 100,
    'T-Door': 0,
    SBS: 0,
    'T-Door ice': 0,
  }));

  // Apply Option Preset
  const handleSelectOptionPreset = (preset: ReductionOptionPreset) => {
    setActivePreset(preset);
    let nextPct: Record<ModelSeries, number> = {
      'TM19/21': 100,
      TM14: 100,
      'BM TD': 100,
      BM: 100,
      'T-Door': 100,
      SBS: 100,
      'T-Door ice': 100,
    };

    if (preset === 'cancel_multidoor_sbs') {
      // Option 1: Cancel Multi-Door & SBS (T-Door, SBS, T-Door ice = 0%)
      nextPct = {
        'TM19/21': 100,
        TM14: 100,
        'BM TD': 100,
        BM: 100,
        'T-Door': 0,
        SBS: 0,
        'T-Door ice': 0,
      };
    } else if (preset === 'cancel_high_labor_bm') {
      // Option 2: Cancel high-labor BM & T-Door, reduce SBS by 50%
      nextPct = {
        'TM19/21': 100,
        TM14: 100,
        'BM TD': 0,
        BM: 0,
        'T-Door': 0,
        SBS: 50,
        'T-Door ice': 0,
      };
    } else if (preset === 'cancel_low_volume') {
      // Option 3: Cancel minor/low-volume models (BM TD, T-Door, T-Door ice)
      nextPct = {
        'TM19/21': 100,
        TM14: 100,
        'BM TD': 0,
        BM: 100,
        'T-Door': 0,
        SBS: 100,
        'T-Door ice': 0,
      };
    } else if (preset === 'focus_top_mount_only') {
      // Option 4: Run ONLY Top Mount (TM19/21 & TM14), cancel all BM & Multi-Door
      nextPct = {
        'TM19/21': 100,
        TM14: 100,
        'BM TD': 0,
        BM: 0,
        'T-Door': 0,
        SBS: 0,
        'T-Door ice': 0,
      };
    } else if (preset === 'proportional_25_cut') {
      // Option 5: Reduce BM & Multi-Door by 50%, Top Mount by 20%
      nextPct = {
        'TM19/21': 80,
        TM14: 80,
        'BM TD': 50,
        BM: 50,
        'T-Door': 50,
        SBS: 50,
        'T-Door ice': 0,
      };
    }

    setModelRetentionPct(nextPct);
    if (isLiveSyncToWeb) {
      const nextVols = {} as Record<ModelSeries, number>;
      for (const m of models) {
        nextVols[m.id] = Math.round(
          ((baselineVolumes[m.id] || 0) * nextPct[m.id]) / 100
        );
      }
      onSaveForecastToWeek(selectedWeek, nextVols);
    }
  };

  // Reduced Volumes calculated from Retention %
  const reducedVolumes = useMemo(() => {
    const out = {} as Record<ModelSeries, number>;
    for (const m of models) {
      out[m.id] = Math.round(
        ((baselineVolumes[m.id] || 0) * (modelRetentionPct[m.id] ?? 100)) / 100
      );
    }
    return out;
  }, [models, baselineVolumes, modelRetentionPct]);

  const reducedTotalVolume = useMemo(
    () => models.reduce((acc, m) => acc + (reducedVolumes[m.id] || 0), 0),
    [models, reducedVolumes]
  );

  // Effective UPH after volume reduction (maintaining standard weekly working hours)
  const reducedEffectiveUph = useMemo(
    () =>
      reducedTotalVolume > 0
        ? Math.round((reducedTotalVolume / Math.max(1, standardWeeklyHours)) * 10) /
          10
        : 0,
    [reducedTotalVolume, standardWeeklyHours]
  );

  const handleUpdateModelPct = (model: ModelSeries, pct: number) => {
    const clamped = Math.max(0, Math.min(150, Math.round(pct)));
    const nextMap = {
      ...modelRetentionPct,
      [model]: clamped,
    };
    setActivePreset('custom');
    setModelRetentionPct(nextMap);

    if (isLiveSyncToWeb) {
      const nextVols = {} as Record<ModelSeries, number>;
      for (const m of models) {
        nextVols[m.id] = Math.round(
          ((baselineVolumes[m.id] || 0) * (nextMap[m.id] ?? 100)) / 100
        );
      }
      onSaveForecastToWeek(selectedWeek, nextVols);
    }
  };

  const handleUpdateModelDirectVolume = (model: ModelSeries, newVol: number) => {
    const base = baselineVolumes[model] || 0;
    const cleanVol = Math.max(0, Math.round(newVol));
    const pct = base > 0 ? Math.round((cleanVol / base) * 100) : 0;
    handleUpdateModelPct(model, pct);
  };

  // Separate CAB and FG stations for department-level breakdown
  const cabStations = useMemo(
    () => allLineStations.filter((s) => s.subArea === 'CAB'),
    [allLineStations]
  );
  const fgStations = useMemo(
    () => allLineStations.filter((s) => s.subArea === 'FG'),
    [allLineStations]
  );

  // Baseline vs Reduced Calculations for CAB, FG, and Active Sheet
  const baselineCab = useMemo(
    () =>
      simulateVolumeForecast(cabStations, baselineVolumes, 140, 0, [], selectedWeek),
    [cabStations, baselineVolumes, selectedWeek]
  );
  const reducedCab = useMemo(
    () =>
      simulateVolumeForecast(
        cabStations,
        reducedVolumes,
        reducedEffectiveUph,
        0,
        [],
        selectedWeek
      ),
    [cabStations, reducedVolumes, reducedEffectiveUph, selectedWeek]
  );

  const baselineFg = useMemo(
    () =>
      simulateVolumeForecast(fgStations, baselineVolumes, 140, 0, [], selectedWeek),
    [fgStations, baselineVolumes, selectedWeek]
  );
  const reducedFg = useMemo(
    () =>
      simulateVolumeForecast(
        fgStations,
        reducedVolumes,
        reducedEffectiveUph,
        0,
        [],
        selectedWeek
      ),
    [fgStations, reducedVolumes, reducedEffectiveUph, selectedWeek]
  );

  const baselineActive = useMemo(
    () =>
      simulateVolumeForecast(stations, baselineVolumes, 140, 0, [], selectedWeek),
    [stations, baselineVolumes, selectedWeek]
  );
  const reducedActive = useMemo(
    () =>
      simulateVolumeForecast(
        stations,
        reducedVolumes,
        reducedEffectiveUph,
        0,
        [],
        selectedWeek
      ),
    [stations, reducedVolumes, reducedEffectiveUph, selectedWeek]
  );

  // Per-Model Labor Intensity & MP Reduction Breakdown
  const modelAnalysisRows = useMemo(() => {
    const safeHrs = Math.max(1, standardWeeklyHours);
    return models.map((m) => {
      let cabStdSec = 0;
      let fgStdSec = 0;
      let effectiveManHrPerUnit = 0;

      for (const st of allLineStations) {
        const sec = st.standardTimes[m.id] || 0;
        const eff = Math.max(0.05, st.efficiency || 0.8);
        if (st.subArea === 'CAB') cabStdSec += sec;
        else fgStdSec += sec;

        // Only include stations in activeSheet for the active MP calculation
        if (activeSheet === 'ALL' || st.subArea === activeSheet) {
          effectiveManHrPerUnit += sec / (3600 * eff);
        }
      }

      const mpPerUnit = effectiveManHrPerUnit / safeHrs;
      const baseVol = baselineVolumes[m.id] || 0;
      const redVol = reducedVolumes[m.id] || 0;
      const cutVol = baseVol - redVol;

      const baseModelMP = mpPerUnit * baseVol;
      const newModelMP = mpPerUnit * redVol;
      const savedModelMP = baseModelMP - newModelMP;
      const monthlyCostSaved = Math.round(savedModelMP) * costPerMpPerMonth;

      return {
        model: m,
        cabStdSec,
        fgStdSec,
        totalStdSec: cabStdSec + fgStdSec,
        mpPer1000Units: mpPerUnit * 1000,
        baseVol,
        redVol,
        cutVol,
        retentionPct: modelRetentionPct[m.id] ?? 100,
        baseModelMP,
        newModelMP,
        savedModelMP,
        monthlyCostSaved,
      };
    });
  }, [
    models,
    allLineStations,
    activeSheet,
    standardWeeklyHours,
    baselineVolumes,
    reducedVolumes,
    modelRetentionPct,
    costPerMpPerMonth,
  ]);

  // Station-by-Station Workforce Reduction Analysis
  const stationReductionRows = useMemo(() => {
    return stations.map((st, idx) => {
      const baseSt = baselineActive.stations[idx];
      const redSt = reducedActive.stations[idx];
      const baseMP = baseSt?.stdMP ?? 0;
      const newMP = redSt?.stdMP ?? 0;
      const mpSaved = Math.max(0, baseMP - newMP);
      const monthlySavings = mpSaved * costPerMpPerMonth;

      // Identify which models use this station (ST > 0)
      const supportedModels = models.filter(
        (m) => (st.standardTimes[m.id] || 0) > 0
      );
      const activeModelsRemaining = supportedModels.filter(
        (m) => (reducedVolumes[m.id] || 0) > 0
      );

      let actionStatus: 'shutdown' | 'rebalance' | 'unchanged' = 'unchanged';
      let actionLabel = 'คงอัตรากำลังคนเดิม';
      if (baseMP > 0 && newMP === 0) {
        actionStatus = 'shutdown';
        actionLabel =
          'ปิดสถานี / ยุบจุดงาน 100% (ยกเลิกรุ่นที่เดินในสถานีนี้ทั้งหมด)';
      } else if (mpSaved > 0) {
        actionStatus = 'rebalance';
        actionLabel = `ลดคนออก ${mpSaved} MP · จัดสมดุลงานใหม่ (Line Rebalancing)`;
      }

      return {
        station: st,
        supportedModels,
        activeModelsRemaining,
        baseWeightedST: baseSt?.weightedST ?? 0,
        newWeightedST: redSt?.weightedST ?? 0,
        baseMP,
        newMP,
        exactNewMP: redSt?.exactMP ?? 0,
        mpSaved,
        monthlySavings,
        actionStatus,
        actionLabel,
      };
    });
  }, [
    stations,
    baselineActive,
    reducedActive,
    models,
    reducedVolumes,
    costPerMpPerMonth,
  ]);

  // Summary Totals for Active Sheet & Combined Line
  const totalBaseMP = baselineActive.totalStdMP;
  const totalNewMP = reducedActive.totalStdMP;
  const totalSavedMP = Math.max(0, totalBaseMP - totalNewMP);
  const savedMpPct = totalBaseMP > 0 ? (totalSavedMP / totalBaseMP) * 100 : 0;

  const cabSavedMP = Math.max(0, baselineCab.totalStdMP - reducedCab.totalStdMP);
  const fgSavedMP = Math.max(0, baselineFg.totalStdMP - reducedFg.totalStdMP);
  const fullLineSavedMP = cabSavedMP + fgSavedMP;

  const monthlyCostSaving = totalSavedMP * costPerMpPerMonth;
  const annualCostSaving = monthlyCostSaving * 12;
  const oneTimeTransitionCost = totalSavedMP * costPerMpPerMonth * severanceMonths;

  const shutdownStationsCount = stationReductionRows.filter(
    (r) => r.actionStatus === 'shutdown'
  ).length;
  const canceledModelsList = models.filter(
    (m) => (modelRetentionPct[m.id] ?? 100) === 0
  );

  const handleApplyPlanToWebWeek = () => {
    onSaveForecastToWeek(selectedWeek, reducedVolumes);
    setNoticeBanner(
      `นำแผนลดกำลังคนไปอัปเดตที่ตารางหลัก ${activeLine} สัปดาห์ ${selectedWeek} เรียบร้อยแล้ว (ลดลง ${totalSavedMP} MP)`
    );
    setTimeout(() => setNoticeBanner(null), 3000);
  };

  const handleApplyPlanToMonth = () => {
    if (!onApplyToMonth) return;
    const monthVols = {} as Record<ModelSeries, number>;
    for (const m of models) {
      monthVols[m.id] = Math.round((reducedVolumes[m.id] || 0) * 4);
    }
    onApplyToMonth(targetMonth, monthVols, Math.round(reducedEffectiveUph));
    const mMeta = MONTHS.find((mo) => mo.key === targetMonth);
    setNoticeBanner(
      `นำแผนลดรุ่น/ยกเลิกรุ่นไปอัปเดตที่ Sheet กราฟ 12 เดือน (${
        mMeta?.fullThai || targetMonth
      }) เรียบร้อยแล้ว`
    );
    setTimeout(() => setNoticeBanner(null), 3000);
  };

  const handleResetPlan = () => {
    setActivePreset('custom');
    const resetPct: Record<ModelSeries, number> = {
      'TM19/21': 100,
      TM14: 100,
      'BM TD': 100,
      BM: 100,
      'T-Door': 100,
      SBS: 100,
      'T-Door ice': 100,
    };
    setModelRetentionPct(resetPct);
    if (isLiveSyncToWeb) {
      onSaveForecastToWeek(selectedWeek, baselineVolumes);
    }
    setNoticeBanner('คืนค่าแผนการผลิตกลับสู่ระดับปกติ 100% ทุกรุ่นเรียบร้อยแล้ว');
    setTimeout(() => setNoticeBanner(null), 2500);
  };

  const handleExportReductionCSV = () => {
    const headers = [
      'Line',
      'Department',
      'Station Code',
      'Station Name',
      'Thai Description',
      'Baseline MP',
      'New Reduced MP',
      'MP Saved (Persons)',
      'Monthly Cost Saved (THB)',
      'Annual Cost Saved (THB)',
      'Action Plan',
    ];
    const rows = stationReductionRows.map((r) => [
      r.station.area,
      r.station.subArea,
      r.station.code,
      `"${r.station.name}"`,
      `"${r.station.thaiName}"`,
      r.baseMP,
      r.newMP,
      r.mpSaved,
      r.monthlySavings,
      r.monthlySavings * 12,
      `"${r.actionLabel}"`,
    ]);
    rows.push([
      activeLine,
      activeSheet,
      'TOTAL',
      '"Total Workforce Reduction"',
      '"รวมผลการลดกำลังคนและต้นทุน"',
      totalBaseMP,
      totalNewMP,
      totalSavedMP,
      monthlyCostSaving,
      annualCostSaving,
      `"ลดกำลังคนรวม ${totalSavedMP} คน (${savedMpPct.toFixed(1)}%)"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLine}_${activeSheet}_Manpower_Reduction_Plan_${selectedWeek}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageLanguageSwitchBar pageLabel="Sheet แผนลดกำลังคน & ลดต้นทุน" />
      {/* Header & Global Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 font-bold bg-rose-600 text-white rounded-md">
              Sheet Option: แผนลดกำลังพนักงาน & ลดต้นทุนแรงงาน
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-slate-800">
              {activeLine} ({activeSheet === 'ALL' ? 'รวม CAB + FG' : `Sheet ${activeSheet}`})
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-rose-700 font-semibold">
              วิเคราะห์การปรับลดคนและยุบสถานีงานเมื่อบาง Model ลดลงหรือยกเลิกการผลิต
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1.5 tracking-tight">
            ระบบจำลองทางเลือกแผนลดกำลังพนักงานและต้นทุน (Workforce & Cost Reduction Option Sheet)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Reference Week Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-2">
              อ้างอิงฐานสัปดาห์:
            </span>
            {WEEKS.map((w) => (
              <button
                key={w}
                onClick={() => onSelectWeek(w)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer font-mono ${
                  selectedWeek === w
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          <button
            onClick={handleApplyPlanToWebWeek}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>นำแผนนี้ไปใช้กับตารางเว็บ ({selectedWeek})</span>
          </button>

          <button
            onClick={handleResetPlan}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าผลิตปกติ 100%</span>
          </button>

          <button
            onClick={handleExportReductionCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export แผนลดคน (CSV)</span>
          </button>
        </div>
      </div>

      {noticeBanner && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{noticeBanner}</span>
        </div>
      )}

      {/* 5 Strategic Option Presets Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-rose-600" />
            <span>
              เลือก Option แผนลด/ยกเลิกรุ่นการผลิต (คลิกเลือกแผนมาตรฐาน หรือปรับเปอร์เซ็นต์รายรุ่นด้านล่าง):
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            รุ่นที่ยกเลิกการผลิตในแผนนี้: {canceledModelsList.length} รุ่น
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <button
            onClick={() => handleSelectOptionPreset('cancel_multidoor_sbs')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activePreset === 'cancel_multidoor_sbs'
                ? 'bg-rose-50/80 border-rose-600 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-900">
              Option 1: ยกเลิกกลุ่ม Multi-Door & SBS
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              ยกเลิก `T-Door`, `SBS`, `T-Door ice` (0%) · ปิดสถานีเฉพาะทาง SBS/TD ได้ทันที 3 สถานี
            </p>
          </button>

          <button
            onClick={() => handleSelectOptionPreset('cancel_high_labor_bm')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activePreset === 'cancel_high_labor_bm'
                ? 'bg-rose-50/80 border-rose-600 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-900">
              Option 2: ตัดรุ่นกินแรงงานสูง (BM & TD)
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              ยกเลิก `BM`, `BM TD`, `T-Door` (0%) และลด `SBS` ลง -50% เพื่อเซฟชั่วโมงคนสูงสุด
            </p>
          </button>

          <button
            onClick={() => handleSelectOptionPreset('cancel_low_volume')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activePreset === 'cancel_low_volume'
                ? 'bg-rose-50/80 border-rose-600 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-900">
              Option 3: ตัดรุ่นย่อย Volume น้อย
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              ยกเลิก `BM TD`, `T-Door`, `T-Door ice` · คงรุ่นหลัก `TM19/21`, `TM14`, `BM`, `SBS`
            </p>
          </button>

          <button
            onClick={() => handleSelectOptionPreset('focus_top_mount_only')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activePreset === 'focus_top_mount_only'
                ? 'bg-rose-50/80 border-rose-600 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-900">
              Option 4: เดินเฉพาะ Top Mount ล้วน
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              คงเฉพาะ `TM19/21` และ `TM14` (100%) · ยกเลิกตระกูล `BM` และ `Multi-Door` ทั้งหมด
            </p>
          </button>

          <button
            onClick={() => handleSelectOptionPreset('proportional_25_cut')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activePreset === 'proportional_25_cut'
                ? 'bg-rose-50/80 border-rose-600 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-900">
              Option 5: ลดกำลังผลิตบางส่วน (-20% / -50%)
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              ลดรุ่น `TM` ลง -20% และลดรุ่น `BM / SBS / T-Door` ลง -50% โดยไม่ปิดสายการผลิต
            </p>
          </button>
        </div>
      </div>

      {/* 4 Executive Cost & Manpower Reduction KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Manpower Reduced */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              1. จำนวนพนักงานที่ลดได้ ({activeLine} · {activeSheet})
            </span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-3xl font-bold text-emerald-600">
                -{totalSavedMP}
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-1.5">
                คน (MP)
              </span>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
              ลดลง {savedMpPct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>กำลังคนก่อนลด → หลังลด:</span>
            <span className="font-bold text-slate-900">
              {totalBaseMP} MP → {totalNewMP} MP
            </span>
          </div>
        </div>

        {/* Card 2: Department Breakdown (CAB vs FG Saved MP) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              2. แยกจำนวนคนที่ลดได้ (CAB vs FG)
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono tabular-nums">
            <div
              onClick={() => onSelectLineAndSheet(activeLine, 'CAB')}
              className="p-2 rounded-lg bg-blue-50/70 border border-blue-200 cursor-pointer"
            >
              <div className="text-[10px] text-blue-800 font-bold">Sheet CAB</div>
              <div className="text-lg font-bold text-blue-700">-{cabSavedMP} MP</div>
              <div className="text-[10px] text-slate-500">
                {baselineCab.totalStdMP} → {reducedCab.totalStdMP}
              </div>
            </div>
            <div
              onClick={() => onSelectLineAndSheet(activeLine, 'FG')}
              className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 cursor-pointer"
            >
              <div className="text-[10px] text-emerald-800 font-bold">Sheet FG</div>
              <div className="text-lg font-bold text-emerald-700">-{fgSavedMP} MP</div>
              <div className="text-[10px] text-slate-500">
                {baselineFg.totalStdMP} → {reducedFg.totalStdMP}
              </div>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>รวมลดทั้งสาย {activeLine} (CAB+FG):</span>
            <span className="font-bold text-emerald-700">-{fullLineSavedMP} คน</span>
          </div>
        </div>

        {/* Card 3: Monthly Labor Cost Saved */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              3. ต้นทุนพนักงานที่ประหยัดได้ / เดือน
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-2xl font-bold text-emerald-700">
              ฿{monthlyCostSaving.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">/ เดือน</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>ฐานต้นทุนต่อคน (แก้ได้):</span>
            <div className="flex items-center gap-1 font-mono">
              <span>฿</span>
              <input
                type="number"
                min={5000}
                step={500}
                value={costPerMpPerMonth}
                onChange={(e) =>
                  setCostPerMpPerMonth(Math.max(1000, Number(e.target.value) || 18500))
                }
                className="w-20 px-1.5 py-0.5 text-right font-bold bg-slate-50 border border-slate-300 rounded text-xs"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Annual Cost Saving & Dedicated Station Shutdowns */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold text-white">
              4. ประหยัดต้นทุนรวมต่อปี (12 เดือน)
            </span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-2xl font-bold text-amber-300">
              ฿{annualCostSaving.toLocaleString()}
            </span>
            <span className="text-xs text-slate-300">/ ปี</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono">
            <span>สถานีเฉพาะทางที่ยุบ/ปิดได้ 100%:</span>
            <span className="font-bold text-amber-300">
              {shutdownStationsCount} สถานี
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Section: Model Reduction Controls (Left) + IE Calculation Methodology (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Interactive Model-by-Model Reduction & Cancellation Matrix */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ตารางปรับลดหรือยกเลิกแผนการผลิตราย Model (7 รุ่น — {activeLine})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กดปุ่ม <strong className="text-rose-600">ยกเลิกรุ่น (0%)</strong> หรือเลือก % ลดยอดผลิต เพื่อดูจำนวนพนักงานและต้นทุนที่ลดได้ของแต่ละรุ่นทันที
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              ยอดผลิตรวม: <strong>{baselineTotalVolume.toLocaleString()}</strong> →{' '}
              <strong className="text-blue-700">
                {reducedTotalVolume.toLocaleString()} คัน
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-mono">
                  <th className="py-2.5 px-3 text-left font-semibold">
                    รุ่นตู้เย็น (Model)
                  </th>
                  <th className="py-2.5 px-2 text-right font-semibold">
                    เวลารวม/คัน (CAB+FG)
                  </th>
                  <th className="py-2.5 px-2 text-right font-semibold">
                    แผนเดิม ({selectedWeek})
                  </th>
                  <th className="py-2.5 px-3 text-center font-semibold min-w-[210px]">
                    กำหนดแผนลด / ยกเลิกรุ่น
                  </th>
                  <th className="py-2.5 px-2 text-right font-semibold">
                    แผนผลิตใหม่ (คัน)
                  </th>
                  <th className="py-2.5 px-2.5 text-right font-bold bg-emerald-50 text-emerald-900">
                    คนที่ลดได้ (-MP)
                  </th>
                  <th className="py-2.5 px-3 text-right font-bold bg-emerald-50 text-emerald-900">
                    ประหยัด/เดือน (฿)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {modelAnalysisRows.map((row) => {
                  const isCanceled = row.retentionPct === 0 && row.baseVol > 0;
                  const isReduced =
                    row.retentionPct > 0 && row.retentionPct < 100 && row.baseVol > 0;

                  return (
                    <tr
                      key={row.model.id}
                      className={
                        isCanceled
                          ? 'bg-rose-50/40'
                          : isReduced
                          ? 'bg-amber-50/30'
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: row.model.color }}
                          />
                          <div>
                            <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                              <span>{row.model.name}</span>
                              {isCanceled && (
                                <span className="px-1.5 py-0.2 text-[9px] font-sans font-bold bg-rose-600 text-white rounded">
                                  ยกเลิกผลิต
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {row.model.thaiDesc}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-right text-slate-700">
                        <div className="font-semibold">
                          {Math.round(row.totalStdSec).toLocaleString()}s
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {row.mpPer1000Units.toFixed(1)} MP/1k คัน
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-right text-slate-600 font-semibold">
                        {row.baseVol.toLocaleString()}
                      </td>

                      {/* Quick Action Buttons: 100%, -25%, -50%, Cancel 0% */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {[
                            { label: 'ปกติ', pct: 100 },
                            { label: '-25%', pct: 75 },
                            { label: '-50%', pct: 50 },
                            { label: 'ยกเลิก 0%', pct: 0 },
                          ].map((btn) => {
                            const active = row.retentionPct === btn.pct;
                            return (
                              <button
                                key={btn.pct}
                                onClick={() =>
                                  handleUpdateModelPct(row.model.id, btn.pct)
                                }
                                className={`px-2 py-1 text-[10px] font-sans font-bold rounded border transition-colors cursor-pointer ${
                                  active
                                    ? btn.pct === 0
                                      ? 'bg-rose-600 text-white border-rose-600'
                                      : btn.pct < 100
                                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                                      : 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={row.redVol}
                          onChange={(e) =>
                            handleUpdateModelDirectVolume(
                              row.model.id,
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-20 px-1.5 py-1 text-right font-mono font-bold text-xs bg-white border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-2.5 text-right font-bold bg-emerald-50/40 text-emerald-700">
                        {row.savedModelMP >= 0.1
                          ? `-${row.savedModelMP.toFixed(1)} MP`
                          : '0.0 MP'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/40 text-emerald-800">
                        ฿{Math.max(0, row.monthlyCostSaved).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-mono font-bold">
                  <td colSpan={2} className="py-3 px-3 font-sans">
                    รวมผลกระทบจากการลด/ยกเลิกรุ่น ({activeLine} · {activeSheet})
                  </td>
                  <td className="py-3 px-2 text-right">
                    {baselineTotalVolume.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center text-amber-300">
                    ลดลง{' '}
                    {(baselineTotalVolume - reducedTotalVolume).toLocaleString()}{' '}
                    คัน
                  </td>
                  <td className="py-3 px-2 text-right text-amber-300">
                    {reducedTotalVolume.toLocaleString()}
                  </td>
                  <td className="py-3 px-2.5 text-right text-emerald-300">
                    -{totalSavedMP} MP
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-300">
                    ฿{monthlyCostSaving.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right 5 Cols: Engineering Calculation Methodology & Formula Breakdown */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                หลักการคิดคำนวณการลดกำลังคน (IE Manpower Reduction Methodology)
              </h2>
              <p className="text-[11px] text-slate-500">
                อ้างอิงจากเวลามาตรฐาน (`产品工时`) และประสิทธิภาพ (`η`) ของแต่ละสถานีบนเว็บโดยตรง
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            {/* Principle Step 1 */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900">
                1. สูตรคำนวณชั่วโมงแรงงานที่ลดลงตามรุ่นที่ตัดออก (Workload Reduction)
              </div>
              <p className="text-[11px] text-slate-600">
                ตู้เย็นแต่ละรุ่นมีเวลามาตรฐานในแต่ละสถานีไม่เท่ากัน เมื่อลดหรือยกเลิกการผลิตรุ่น{' '}
                <span className="font-mono font-semibold">m</span> จำนวน{' '}
                <span className="font-mono font-semibold">ΔV_m</span> คัน ชั่วโมงแรงงานสุทธิในสถานี{' '}
                <span className="font-mono font-semibold">i</span> จะลดลงทันที:
              </p>
              <div className="p-2 bg-white border border-slate-200 rounded font-mono text-[11px] text-blue-900">
                ΔMan-Hours(i) = Σ [ ΔVolume(m) × ST(i,m) ] ÷ [ 3600 × η(i) ]
              </div>
            </div>

            {/* Principle Step 2 */}
            <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200 space-y-1.5">
              <div className="font-bold text-rose-950">
                2. การแยกสถานีงานเฉพาะกลุ่มรุ่น (Dedicated Line Shutdown)
              </div>
              <p className="text-[11px] text-slate-700">
                จากตารางข้อมูลการผลิตบนเว็บ สถานีงานถูกแบ่งเป็น 2 ประเภท:
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-1">
                <li>
                  <strong>สถานีเฉพาะกลุ่มรุ่น (Dedicated Stations)</strong>: เช่น{' '}
                  <span className="font-mono">A (SBS/TD Foam)</span>,{' '}
                  <span className="font-mono">A (SBS/TD Final)</span>,{' '}
                  <span className="font-mono">B (SBS/TD Final)</span> มีเวลามาตรฐานเฉพาะรุ่น{' '}
                  <span className="font-mono">T-Door / SBS / T-Door ice</span> เท่านั้น หากยกเลิก 3 รุ่นนี้ สามารถ<strong>ปิดสถานีและลดคนเป็น 0 MP ได้ทันที</strong>
                </li>
                <li>
                  <strong>สถานีงานร่วม (Shared Stations)</strong>: เช่น{' '}
                  <span className="font-mono">Rooling</span>,{' '}
                  <span className="font-mono">FG1</span>,{' '}
                  <span className="font-mono">FG2</span> จะลดคนตามสัดส่วนความเร็วไลน์ที่ลดลง (
                  <span className="font-mono">
                    UPH 140 → {reducedEffectiveUph} คัน/ชม.
                  </span>
                  ) และเวลามาตรฐานถ่วงน้ำหนักใหม่
                </li>
              </ul>
            </div>

            {/* Principle Step 3 */}
            <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1.5">
              <div className="font-bold text-emerald-950">
                3. การคำนวณผลประหยัดต้นทุนพนักงานสุทธิ (Net Labor Cost Saving)
              </div>
              <div className="p-2 bg-white border border-emerald-200 rounded font-mono text-[11px] text-emerald-900 space-y-1">
                <div>
                  • กำลังคนที่ลดได้รวม = {totalBaseMP} - {totalNewMP} ={' '}
                  <strong>{totalSavedMP} คน (MP)</strong>
                </div>
                <div>
                  • ประหยัดต่อเดือน = {totalSavedMP} คน × ฿
                  {costPerMpPerMonth.toLocaleString()} ={' '}
                  <strong>฿{monthlyCostSaving.toLocaleString()} / เดือน</strong>
                </div>
                <div>
                  • ประหยัดต่อปี (12 เดือน) ={' '}
                  <strong>฿{annualCostSaving.toLocaleString()} / ปี</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Station-by-Station Workforce Reduction Action Plan Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ตารางแผนลดกำลังพนักงานรายสถานีงาน (Station-by-Station Workforce Reduction Plan) —{' '}
              {activeLine} ({activeSheet})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงจำนวนพนักงานก่อนลด, หลังลด, จำนวนคนที่ตัดออกได้จริง, ต้นทุนที่ประหยัดได้ และคำแนะนำการยุบจุดงานรายสถานี
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectLineAndSheet(activeLine, 'CAB')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                activeSheet === 'CAB'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Sheet CAB (-{cabSavedMP} MP)
            </button>
            <button
              onClick={() => onSelectLineAndSheet(activeLine, 'FG')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                activeSheet === 'FG'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Sheet FG (-{fgSavedMP} MP)
            </button>
            <button
              onClick={() => onSelectLineAndSheet(activeLine, 'ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                activeSheet === 'ALL'
                  ? 'bg-slate-900 text-amber-300 border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              รวม CAB+FG (-{fullLineSavedMP} MP)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-mono">
                <th className="py-2.5 px-3 text-left font-semibold">
                  สถานีงาน (Station)
                </th>
                <th className="py-2.5 px-2 text-center font-semibold">แผนก</th>
                <th className="py-2.5 px-2 text-left font-semibold">
                  รุ่นที่ใช้สถานีนี้ (Active Models)
                </th>
                <th className="py-2.5 px-2 text-right font-semibold">
                  เวลาถ่วงน้ำหนัก (เดิม → ใหม่)
                </th>
                <th className="py-2.5 px-2 text-right font-semibold">
                  MP เดิม
                </th>
                <th className="py-2.5 px-2 text-right font-bold bg-blue-50 text-blue-900">
                  MP ใหม่
                </th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-emerald-50 text-emerald-900">
                  ลดคนได้ (-MP)
                </th>
                <th className="py-2.5 px-3 text-right font-bold bg-emerald-50 text-emerald-900">
                  ประหยัด/เดือน (฿)
                </th>
                <th className="py-2.5 px-3 text-left font-semibold">
                  แนวทางปรับลดกำลังคน (IE Action Plan)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {stationReductionRows.map((r) => (
                <tr
                  key={r.station.id}
                  className={
                    r.actionStatus === 'shutdown'
                      ? 'bg-rose-50/50'
                      : r.actionStatus === 'rebalance'
                      ? 'hover:bg-slate-50'
                      : 'opacity-75'
                  }
                >
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-bold text-slate-900 font-mono">
                      {r.station.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {r.station.thaiName}
                    </div>
                  </td>

                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        r.station.subArea === 'FG'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {r.station.subArea}
                    </span>
                  </td>

                  <td className="py-2.5 px-2 font-sans">
                    <div className="flex flex-wrap gap-1">
                      {r.supportedModels.map((m) => {
                        const isStillActive = (reducedVolumes[m.id] || 0) > 0;
                        return (
                          <span
                            key={m.id}
                            className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                              isStillActive
                                ? 'bg-white text-slate-800 border-slate-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                            }`}
                          >
                            {m.name}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  <td className="py-2.5 px-2 text-right text-slate-600">
                    {Math.round(r.baseWeightedST)}s →{' '}
                    <strong className="text-slate-900">
                      {Math.round(r.newWeightedST)}s
                    </strong>
                  </td>

                  <td className="py-2.5 px-2 text-right font-semibold text-slate-600">
                    {r.baseMP}
                  </td>

                  <td className="py-2.5 px-2 text-right font-bold text-base text-blue-700 bg-blue-50/40">
                    {r.newMP}
                  </td>

                  <td className="py-2.5 px-2.5 text-right font-bold bg-emerald-50/40 text-emerald-700">
                    {r.mpSaved > 0 ? `-${r.mpSaved} คน` : '0'}
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold bg-emerald-50/40 text-emerald-800">
                    ฿{r.monthlySavings.toLocaleString()}
                  </td>

                  <td className="py-2.5 px-3 font-sans">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold ${
                        r.actionStatus === 'shutdown'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : r.actionStatus === 'rebalance'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.actionLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-mono font-bold">
                <td colSpan={4} className="py-3 px-3 font-sans">
                  รวมผลลัพธ์แผนลดกำลังคน ({activeLine} · {activeSheet})
                </td>
                <td className="py-3 px-2 text-right">{totalBaseMP} MP</td>
                <td className="py-3 px-2 text-right text-amber-300">
                  {totalNewMP} MP
                </td>
                <td className="py-3 px-2.5 text-right text-emerald-300">
                  -{totalSavedMP} คน
                </td>
                <td className="py-3 px-3 text-right text-emerald-300">
                  ฿{monthlyCostSaving.toLocaleString()} / เดือน
                </td>
                <td className="py-3 px-3 font-sans text-amber-300">
                  ประหยัดรายปี ฿{annualCostSaving.toLocaleString()} / ปี
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
