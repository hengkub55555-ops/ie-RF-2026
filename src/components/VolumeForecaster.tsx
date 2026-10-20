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
  WeeklySummaryMetrics,
  INITIAL_VOLUMES_BY_LINE,
  simulateVolumeForecast,
} from '../data/mpModelData';
import {
  Calculator,
  RotateCcw,
  Download,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
  Zap,
  Layers,
  TrendingUp,
  Users,
  Clock,
} from 'lucide-react';
import { PageLanguageSwitchBar } from '../context/AppPreferencesContext';

interface VolumeForecasterProps {
  activeLine: LineKey;
  activeSheet: SheetKey;
  models: ModelMetadata[];
  stations: StationConfig[];
  allLineStations: StationConfig[];
  weeklyVolumes: Record<ModelSeries, Record<WeekKey, number>>;
  baselineMetrics: WeeklySummaryMetrics;
  initialPresetWeek?: WeekKey;
  onSelectLineAndSheet: (line: LineKey, sheet: SheetKey) => void;
  onUpdateStationField: (stationId: string, patch: Partial<StationConfig>) => void;
  onUpdateStandardTime: (stationId: string, model: ModelSeries, newTime: number) => void;
  onUpdateModelMeta: (modelId: ModelSeries, patch: Partial<ModelMetadata>) => void;
  onSaveForecastToWeek: (week: WeekKey, volumes: Record<ModelSeries, number>) => void;
  onApplyToMonth?: (month: MonthKey, volumes: Record<ModelSeries, number>, uph: number) => void;
}

export const VolumeForecaster: React.FC<VolumeForecasterProps> = ({
  activeLine,
  activeSheet,
  models,
  stations,
  allLineStations,
  weeklyVolumes,
  initialPresetWeek = '1W',
  onSelectLineAndSheet,
  onUpdateStationField,
  onUpdateStandardTime,
  onUpdateModelMeta,
  onSaveForecastToWeek,
  onApplyToMonth,
}) => {
  const [targetWeek, setTargetWeek] = useState<WeekKey>(initialPresetWeek);
  const [targetMonth, setTargetMonth] = useState<MonthKey>('M09');
  const [isLiveWebSync, setIsLiveWebSync] = useState<boolean>(true);
  const [calculationMode, setCalculationMode] = useState<'volume_driven' | 'fixed_uph'>(
    'volume_driven'
  );
  const [fixedUphInput, setFixedUphInput] = useState<number>(140);
  const [bufferPct, setBufferPct] = useState<number>(0);
  const [expandedStationId, setExpandedStationId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Reference original factory baseline volumes for the selected line & week
  const originalFactoryBaselineVolumes = useMemo(() => {
    const refLine = INITIAL_VOLUMES_BY_LINE[activeLine];
    const res = {} as Record<ModelSeries, number>;
    for (const m of models) {
      res[m.id] = refLine[m.id]?.[targetWeek] || 0;
    }
    return res;
  }, [activeLine, targetWeek, models]);

  const originalFactoryTotalVolume = useMemo(
    () =>
      models.reduce(
        (acc, m) => acc + (originalFactoryBaselineVolumes[m.id] || 0),
        0
      ),
    [models, originalFactoryBaselineVolumes]
  );

  // Standard working hours for the week at baseline UPH 140
  const baselineWorkingHours = useMemo(
    () => (originalFactoryTotalVolume > 0 ? originalFactoryTotalVolume / 140 : 96),
    [originalFactoryTotalVolume]
  );

  const [customWorkingHours, setCustomWorkingHours] = useState<number>(
    Math.round(baselineWorkingHours * 10) / 10
  );

  useEffect(() => {
    setCustomWorkingHours(Math.round(baselineWorkingHours * 10) / 10);
  }, [baselineWorkingHours]);

  // Local volumes initialized from the current web weeklyVolumes[m.id][targetWeek]
  const [customVolumes, setCustomVolumes] = useState<Record<ModelSeries, number>>(() => {
    const init = {} as Record<ModelSeries, number>;
    for (const m of models) {
      init[m.id] = weeklyVolumes[m.id]?.[initialPresetWeek] || 0;
    }
    return init;
  });

  // Keep customVolumes in sync when switching targetWeek or activeLine
  useEffect(() => {
    const next = {} as Record<ModelSeries, number>;
    for (const m of models) {
      next[m.id] = weeklyVolumes[m.id]?.[targetWeek] || 0;
    }
    setCustomVolumes(next);
  }, [targetWeek, activeLine]);

  // Helper to update volumes and (when isLiveWebSync is true) push immediately to Web state
  const updateVolumesWithSync = (nextVolumes: Record<ModelSeries, number>) => {
    setCustomVolumes(nextVolumes);
    if (isLiveWebSync) {
      onSaveForecastToWeek(targetWeek, nextVolumes);
    }
  };

  const currentTotalVolume = useMemo(
    () =>
      models.reduce((acc, m) => acc + Math.max(0, customVolumes[m.id] || 0), 0),
    [models, customVolumes]
  );

  // Effective UPH:
  // In 'volume_driven' mode, UPH scales proportionally with Volume / WorkingHours so MP increases/decreases immediately!
  const effectiveUph = useMemo(() => {
    if (calculationMode === 'fixed_uph') {
      return Math.max(1, fixedUphInput);
    }
    const safeHrs = Math.max(1, customWorkingHours);
    return currentTotalVolume > 0
      ? Math.round((currentTotalVolume / safeHrs) * 10) / 10
      : 0;
  }, [calculationMode, fixedUphInput, customWorkingHours, currentTotalVolume]);

  // Compute Baseline Forecast (at Original Factory Volumes & 140 UPH)
  const cabStations = useMemo(
    () => allLineStations.filter((s) => s.subArea === 'CAB'),
    [allLineStations]
  );
  const fgStations = useMemo(
    () => allLineStations.filter((s) => s.subArea === 'FG'),
    [allLineStations]
  );

  const baselineCabResult = useMemo(
    () =>
      simulateVolumeForecast(
        cabStations,
        originalFactoryBaselineVolumes,
        140,
        0,
        [],
        targetWeek
      ),
    [cabStations, originalFactoryBaselineVolumes, targetWeek]
  );

  const baselineFgResult = useMemo(
    () =>
      simulateVolumeForecast(
        fgStations,
        originalFactoryBaselineVolumes,
        140,
        0,
        [],
        targetWeek
      ),
    [fgStations, originalFactoryBaselineVolumes, targetWeek]
  );

  const baselineActiveResult = useMemo(
    () =>
      simulateVolumeForecast(
        stations,
        originalFactoryBaselineVolumes,
        140,
        0,
        [],
        targetWeek
      ),
    [stations, originalFactoryBaselineVolumes, targetWeek]
  );

  // Compute Current Live Forecast for CAB, FG, and Active Sheet
  const currentCabForecast = useMemo(
    () =>
      simulateVolumeForecast(
        cabStations,
        customVolumes,
        effectiveUph,
        bufferPct,
        [],
        targetWeek
      ),
    [cabStations, customVolumes, effectiveUph, bufferPct, targetWeek]
  );

  const currentFgForecast = useMemo(
    () =>
      simulateVolumeForecast(
        fgStations,
        customVolumes,
        effectiveUph,
        bufferPct,
        [],
        targetWeek
      ),
    [fgStations, customVolumes, effectiveUph, bufferPct, targetWeek]
  );

  const forecast = useMemo(() => {
    const raw = simulateVolumeForecast(
      stations,
      customVolumes,
      effectiveUph,
      bufferPct,
      [],
      targetWeek
    );
    // Attach true original baseline MP for each station so Delta MP is always clear
    const enrichedStations = raw.stations.map((st, idx) => {
      const baseMP = baselineActiveResult.stations[idx]?.stdMP ?? 0;
      return {
        ...st,
        baselineMP: baseMP,
        deltaMP: st.stdMP - baseMP,
      };
    });
    return {
      ...raw,
      baselineTotalMP: baselineActiveResult.totalStdMP,
      deltaTotalMP: raw.totalStdMP - baselineActiveResult.totalStdMP,
      stations: enrichedStations,
    };
  }, [
    stations,
    customVolumes,
    effectiveUph,
    bufferPct,
    targetWeek,
    baselineActiveResult,
  ]);

  // Per-Model MP Contribution & Sensitivity (how many MP each model uses in the current mix)
  const modelMPContributions = useMemo(() => {
    const safeHrs = Math.max(1, customWorkingHours);
    const result = {} as Record<
      ModelSeries,
      {
        currentMP: number;
        baselineMP: number;
        deltaMP: number;
        mpPer1000Units: number;
        totalStdSecPerUnit: number;
      }
    >;

    for (const m of models) {
      let weightedEffSecPerUnit = 0;
      let rawSecPerUnit = 0;
      for (const st of stations) {
        const sec = st.standardTimes[m.id] || 0;
        const eff = Math.max(0.05, st.efficiency || 0.8);
        rawSecPerUnit += sec;
        weightedEffSecPerUnit += sec / (3600 * eff);
      }
      // Man-hours per 1 unit = weightedEffSecPerUnit
      // In `safeHrs` working hours, 1 unit requires `weightedEffSecPerUnit / safeHrs` MP
      const mpPerUnit = weightedEffSecPerUnit / safeHrs;
      const curVol = Math.max(0, customVolumes[m.id] || 0);
      const baseVol = Math.max(0, originalFactoryBaselineVolumes[m.id] || 0);

      result[m.id] = {
        currentMP: mpPerUnit * curVol,
        baselineMP: mpPerUnit * baseVol,
        deltaMP: mpPerUnit * (curVol - baseVol),
        mpPer1000Units: mpPerUnit * 1000,
        totalStdSecPerUnit: rawSecPerUnit,
      };
    }
    return result;
  }, [
    models,
    stations,
    customWorkingHours,
    customVolumes,
    originalFactoryBaselineVolumes,
  ]);

  // Sensitivity Curve Points (-40% to +50% Volume)
  const sensitivityPoints = useMemo(() => {
    const pctSteps = [-40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
    return pctSteps.map((pct) => {
      const factor = 1 + pct / 100;
      const scaledVols = {} as Record<ModelSeries, number>;
      let sumVol = 0;
      for (const m of models) {
        const v = Math.round((originalFactoryBaselineVolumes[m.id] || 0) * factor);
        scaledVols[m.id] = v;
        sumVol += v;
      }
      const stepUph =
        calculationMode === 'fixed_uph'
          ? fixedUphInput
          : sumVol / Math.max(1, customWorkingHours);

      const cabSim = simulateVolumeForecast(
        cabStations,
        scaledVols,
        stepUph,
        bufferPct,
        [],
        targetWeek
      );
      const fgSim = simulateVolumeForecast(
        fgStations,
        scaledVols,
        stepUph,
        bufferPct,
        [],
        targetWeek
      );
      return {
        pct,
        factor,
        totalVolume: sumVol,
        uph: Math.round(stepUph * 10) / 10,
        cabMP: cabSim.totalStdMP,
        fgMP: fgSim.totalStdMP,
        totalMP: cabSim.totalStdMP + fgSim.totalStdMP,
        scaledVols,
      };
    });
  }, [
    models,
    originalFactoryBaselineVolumes,
    calculationMode,
    fixedUphInput,
    customWorkingHours,
    cabStations,
    fgStations,
    bufferPct,
    targetWeek,
  ]);

  // Handlers for Volume Changes
  const handleModelVolumeChange = (model: ModelSeries, newVal: number) => {
    const cleanVal = Math.max(0, Math.round(newVal));
    updateVolumesWithSync({
      ...customVolumes,
      [model]: cleanVal,
    });
  };

  const handleScaleTotalVolumeTo = (newTotal: number) => {
    const cleanTotal = Math.max(0, Math.round(newTotal));
    const baseSource =
      currentTotalVolume > 0 ? customVolumes : originalFactoryBaselineVolumes;
    const baseSum =
      currentTotalVolume > 0 ? currentTotalVolume : originalFactoryTotalVolume;

    const next = {} as Record<ModelSeries, number>;
    if (baseSum <= 0) {
      const each = Math.round(cleanTotal / models.length);
      for (const m of models) next[m.id] = each;
    } else {
      const ratio = cleanTotal / baseSum;
      for (const m of models) {
        next[m.id] = Math.round((baseSource[m.id] || 0) * ratio);
      }
    }
    updateVolumesWithSync(next);
  };

  const handleScaleByPctFromBaseline = (pctDelta: number) => {
    const factor = Math.max(0, 1 + pctDelta / 100);
    const next = {} as Record<ModelSeries, number>;
    for (const m of models) {
      next[m.id] = Math.round((originalFactoryBaselineVolumes[m.id] || 0) * factor);
    }
    updateVolumesWithSync(next);
  };

  const handleResetToOriginalWeek = () => {
    const next = { ...originalFactoryBaselineVolumes };
    setCustomWorkingHours(Math.round(baselineWorkingHours * 10) / 10);
    updateVolumesWithSync(next);
    setSyncNotice(`คืนค่า Volume ต้นฉบับของ ${activeLine} (${targetWeek}) เรียบร้อยแล้ว`);
    setTimeout(() => setSyncNotice(null), 2500);
  };

  const handleManualPushToWeek = (w: WeekKey) => {
    onSaveForecastToWeek(w, customVolumes);
    setSyncNotice(`อัปเดต Volume และ MP ลงตารางหลักสัปดาห์ ${w} (${activeLine}) เรียบร้อยแล้ว`);
    setTimeout(() => setSyncNotice(null), 2500);
  };

  const handlePushToMonth = () => {
    if (!onApplyToMonth) return;
    // Scale weekly volume x4 (or direct if user entered monthly scale)
    const isWeeklyScale = currentTotalVolume < 25000;
    const mult = isWeeklyScale ? 4 : 1;
    const monthVols = {} as Record<ModelSeries, number>;
    for (const m of models) {
      monthVols[m.id] = Math.round((customVolumes[m.id] || 0) * mult);
    }
    onApplyToMonth(targetMonth, monthVols, Math.round(effectiveUph));
    const mMeta = MONTHS.find((mo) => mo.key === targetMonth);
    setSyncNotice(
      `ส่งค่าคาดการณ์ไปยัง Sheet กราฟ 12 เดือน (${mMeta?.fullThai || targetMonth}) เรียบร้อยแล้ว`
    );
    setTimeout(() => setSyncNotice(null), 2500);
  };

  const volumeDelta = currentTotalVolume - originalFactoryTotalVolume;
  const volumeDeltaPct =
    originalFactoryTotalVolume > 0
      ? (volumeDelta / originalFactoryTotalVolume) * 100
      : 0;

  const cabDeltaMP = currentCabForecast.totalStdMP - baselineCabResult.totalStdMP;
  const fgDeltaMP = currentFgForecast.totalStdMP - baselineFgResult.totalStdMP;
  const totalCombinedMP =
    currentCabForecast.totalStdMP + currentFgForecast.totalStdMP;
  const baselineCombinedMP =
    baselineCabResult.totalStdMP + baselineFgResult.totalStdMP;
  const totalCombinedDeltaMP = totalCombinedMP - baselineCombinedMP;

  const exportForecastCSV = () => {
    const headers = [
      'Line',
      'SubArea',
      'Station Code',
      'Station Name',
      'Thai Description',
      'Effective UPH',
      'Efficiency (%)',
      'Weighted ST (sec)',
      `Baseline MP (${targetWeek})`,
      'Forecast STD MP',
      'Delta MP',
      'Total Man-Hours',
    ];
    const rows = forecast.stations.map((s) => [
      s.station.area,
      s.station.subArea,
      s.station.code,
      `"${s.station.name}"`,
      `"${s.station.thaiName}"`,
      forecast.uph,
      (s.station.efficiency * 100).toFixed(1),
      s.weightedST.toFixed(2),
      s.baselineMP,
      s.stdMP,
      s.deltaMP,
      s.manHoursRequired.toFixed(1),
    ]);
    rows.push([
      activeLine,
      activeSheet,
      'TOTAL',
      `"${activeLine} - ${activeSheet} Total"`,
      '"รวมอัตรากำลังคนทั้งสิ้น"',
      forecast.uph,
      '-',
      forecast.totalWeightedST.toFixed(2),
      forecast.baselineTotalMP,
      forecast.totalStdMP,
      forecast.deltaTotalMP,
      forecast.totalManHours.toFixed(1),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${activeLine}_${activeSheet}_Volume_MP_Forecast_${targetWeek}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageLanguageSwitchBar pageLabel="Sheet ปรับเพิ่ม-ลด Volume → คาดการณ์ MP ทันที" />
      {/* Top Sheet Header & Live Web Sync Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 font-bold bg-blue-600 text-white rounded-md">
              Sheet ปรับเพิ่ม-ลด Volume → คาดการณ์ MP ทันที
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-slate-800">
              {activeLine} ({activeSheet === 'ALL' ? 'รวม CAB + FG' : `Sheet ${activeSheet}`})
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              เพิ่มหรือลด Volume รุ่นใดก็ได้ จำนวนคน MP จะปรับขึ้น-ลงและเชื่อมโยงกับทุกหน้าบน Web ทันที
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1.5 tracking-tight">
            ระบบจำลองปรับเพิ่ม-ลด Volume การผลิต เพื่อคาดการณ์อัตรากำลังคน (Dynamic Volume ↔ Manpower Sheet)
          </h1>
        </div>

        {/* Target Week Selector & Live Sync Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-2">
              เชื่อมโยงสัปดาห์:
            </span>
            {WEEKS.map((w) => (
              <button
                key={w}
                onClick={() => setTargetWeek(w)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer font-mono ${
                  targetWeek === w
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Live Web Sync Toggle */}
          <button
            onClick={() => setIsLiveWebSync(!isLiveWebSync)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
              isLiveWebSync
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="เมื่อเปิดใช้งาน การปรับเพิ่ม-ลด Volume ในหน้านี้จะอัปเดตตัวเลขในหน้า Dashboard และตารางหลักทันที"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveWebSync ? 'bg-emerald-600' : 'bg-slate-400'
              }`}
            />
            <span>
              {isLiveWebSync
                ? `ซิงค์ข้อมูลสดกับเว็บ (${targetWeek} Live)`
                : 'โหมดทดลองแยก (Sandbox)'}
            </span>
          </button>

          <button
            onClick={handleResetToOriginalWeek}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่า Volume ต้นฉบับ ({targetWeek})</span>
          </button>

          <button
            onClick={exportForecastCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sync Notification */}
      {syncNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
          <Check className="w-4 h-4" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Real-Time Manpower Impact Summary Strip (Shows CAB, FG, and Total Line MP Changes Immediately) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Volume Change */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              1. ยอดการผลิตรวมที่ปรับ ({activeLine} · {targetWeek})
            </span>
            <Sliders className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-3xl font-bold text-slate-900">
                {currentTotalVolume.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 ml-1.5">คัน</span>
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                volumeDelta > 0
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : volumeDelta < 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {volumeDelta > 0 ? `+${volumeDelta.toLocaleString()}` : volumeDelta.toLocaleString()} (
              {volumeDeltaPct >= 0 ? `+${volumeDeltaPct.toFixed(1)}%` : `${volumeDeltaPct.toFixed(1)}%`})
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>ยอดตั้งต้น ({targetWeek}):</span>
            <span className="font-semibold text-slate-800">
              {originalFactoryTotalVolume.toLocaleString()} คัน
            </span>
          </div>
        </div>

        {/* Card 2: Sheet CAB Manpower Impact */}
        <div
          onClick={() => onSelectLineAndSheet(activeLine, 'CAB')}
          className={`rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
            activeSheet === 'CAB'
              ? 'bg-blue-50/70 border-blue-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-950">
              2. กำลังคนแผนก CAB ({cabStations.length} สถานี)
            </span>
            <span className="text-[11px] font-mono text-blue-700 font-semibold">
              คลิกดูเฉพาะ CAB
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-3xl font-bold text-blue-700">
                {currentCabForecast.totalStdMP}
              </span>
              <span className="text-xs text-slate-600 ml-1.5">MP</span>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                cabDeltaMP > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : cabDeltaMP < 0
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {cabDeltaMP > 0
                ? `+${cabDeltaMP} คน`
                : cabDeltaMP < 0
                ? `${cabDeltaMP} คน`
                : 'เท่าเดิม (0)'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600 font-mono">
            <span>เทียบค่าตั้งต้น CAB:</span>
            <span className="font-semibold text-slate-900">
              {baselineCabResult.totalStdMP} MP → {currentCabForecast.totalStdMP} MP
            </span>
          </div>
        </div>

        {/* Card 3: Sheet FG Manpower Impact */}
        <div
          onClick={() => onSelectLineAndSheet(activeLine, 'FG')}
          className={`rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
            activeSheet === 'FG'
              ? 'bg-emerald-50/70 border-emerald-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-950">
              3. กำลังคนแผนก FG ({fgStations.length} สถานี)
            </span>
            <span className="text-[11px] font-mono text-emerald-700 font-semibold">
              คลิกดูเฉพาะ FG
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-3xl font-bold text-emerald-700">
                {currentFgForecast.totalStdMP}
              </span>
              <span className="text-xs text-slate-600 ml-1.5">MP</span>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                fgDeltaMP > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : fgDeltaMP < 0
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {fgDeltaMP > 0
                ? `+${fgDeltaMP} คน`
                : fgDeltaMP < 0
                ? `${fgDeltaMP} คน`
                : 'เท่าเดิม (0)'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600 font-mono">
            <span>เทียบค่าตั้งต้น FG:</span>
            <span className="font-semibold text-slate-900">
              {baselineFgResult.totalStdMP} MP → {currentFgForecast.totalStdMP} MP
            </span>
          </div>
        </div>

        {/* Card 4: Combined Total Line Manpower (CAB + FG) */}
        <div
          onClick={() => onSelectLineAndSheet(activeLine, 'ALL')}
          className={`rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
            activeSheet === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-slate-900 text-white border-slate-800 opacity-95 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold text-white">
              4. รวมกำลังคนทั้งสาย {activeLine} (CAB + FG)
            </span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-3xl font-bold text-amber-300">
                { bufferPct > 0
                  ? Math.ceil(totalCombinedMP * (1 + bufferPct / 100))
                  : totalCombinedMP }
              </span>
              <span className="text-xs text-slate-300 ml-1.5">MP รวม</span>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                totalCombinedDeltaMP > 0
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : totalCombinedDeltaMP < 0
                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {totalCombinedDeltaMP > 0
                ? `+${totalCombinedDeltaMP} คน`
                : totalCombinedDeltaMP < 0
                ? `${totalCombinedDeltaMP} คน`
                : '0 คน'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono">
            <span>ความเร็วเดินไลน์ (Effective UPH):</span>
            <span className="font-bold text-amber-300">
              {effectiveUph} คัน/ชม. ({customWorkingHours} ชม.)
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Left = Volume Scaler & 7-Model Adjusters | Right = Sensitivity Curve & Station Forecast Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (5 Cols): Total Volume Scaler + Individual Model Volume Sliders */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          {/* Section A: Quick Total Volume Adjuster */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  ปรับเพิ่ม-ลด Volume รวมทั้งสายการผลิต ({activeLine})
                </h2>
                <p className="text-[11px] text-slate-600">
                  กดปุ่ม % หรือเลื่อนแถบเพื่อเพิ่ม/ลด Volume ทั้ง 7 รุ่นตามสัดส่วนพร้อมกัน
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded border border-blue-200">
                {currentTotalVolume.toLocaleString()} คัน
              </span>
            </div>

            {/* Quick Percentage Buttons */}
            <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
              {[-30, -20, -10, -5, 0, 5, 10, 20, 30, 50].map((pct) => {
                const isZero = pct === 0;
                return (
                  <button
                    key={pct}
                    onClick={() => handleScaleByPctFromBaseline(pct)}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      isZero
                        ? 'bg-slate-900 text-white border-slate-900'
                        : pct < 0
                        ? 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {pct > 0 ? `+${pct}%` : pct === 0 ? 'ตั้งต้น 0%' : `${pct}%`}
                  </button>
                );
              })}
            </div>

            {/* Total Volume Slider & Input */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  ลากปรับหรือพิมพ์ยอดผลิตรวม (คัน):
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      handleScaleTotalVolumeTo(Math.max(0, currentTotalVolume - 500))
                    }
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    -500
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={currentTotalVolume}
                    onChange={(e) =>
                      handleScaleTotalVolumeTo(Number(e.target.value) || 0)
                    }
                    className="w-28 px-2.5 py-1 text-right font-mono font-bold text-sm bg-white border border-blue-400 rounded-md focus:outline-none focus:border-blue-600"
                  />
                  <button
                    onClick={() => handleScaleTotalVolumeTo(currentTotalVolume + 500)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    +500
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(25000, originalFactoryTotalVolume * 2)}
                step={100}
                value={currentTotalVolume}
                onChange={(e) => handleScaleTotalVolumeTo(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0 คัน (0 MP)</span>
                <span>ตั้งต้น: {originalFactoryTotalVolume.toLocaleString()} คัน</span>
                <span>{(originalFactoryTotalVolume * 2).toLocaleString()} คัน</span>
              </div>
            </div>
          </div>

          {/* Section B: Working Hours & Calculation Mode Controls */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>โหมดคำนวณความเร็วไลน์และเวลาทำงาน</span>
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-white rounded-md border border-slate-200 text-[11px]">
                <button
                  onClick={() => setCalculationMode('volume_driven')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                    calculationMode === 'volume_driven'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  แปรผันตาม Volume
                </button>
                <button
                  onClick={() => setCalculationMode('fixed_uph')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                    calculationMode === 'fixed_uph'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  ล็อก UPH คงที่
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {calculationMode === 'volume_driven' ? (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    ชั่วโมงเดินไลน์ต่อสัปดาห์ (ชม.)
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={168}
                    step={1}
                    value={customWorkingHours}
                    onChange={(e) =>
                      setCustomWorkingHours(Math.max(8, Number(e.target.value) || 96))
                    }
                    className="w-full px-2.5 py-1.5 font-mono font-bold bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    ล็อกค่า UPH คงที่ (คัน/ชม.)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={400}
                    step={5}
                    value={fixedUphInput}
                    onChange={(e) =>
                      setFixedUphInput(Math.max(10, Number(e.target.value) || 140))
                    }
                    className="w-full px-2.5 py-1.5 font-mono font-bold bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  เผื่ออัตราลางาน Buffer (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={1}
                  value={bufferPct}
                  onChange={(e) =>
                    setBufferPct(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full px-2.5 py-1.5 font-mono font-bold bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section C: Individual Model Volume Adjusters (7 Models) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                ปรับเพิ่ม-ลด Volume แยกรายรุ่น (7 Models)
              </h3>
              <span className="text-[11px] text-slate-500">
                แสดงผลกระทบกำลังคน (±MP) รายรุ่นทันที
              </span>
            </div>

            <div className="space-y-2.5">
              {models.map((m) => {
                const vol = customVolumes[m.id] || 0;
                const baseVol = originalFactoryBaselineVolumes[m.id] || 0;
                const diffVol = vol - baseVol;
                const mixPct =
                  currentTotalVolume > 0 ? (vol / currentTotalVolume) * 100 : 0;
                const contrib = modelMPContributions[m.id];

                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 space-y-2 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: m.color }}
                        />
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {m.name}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">
                          {m.thaiDesc}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold">
                          ใช้คน ~{contrib.currentMP.toFixed(1)} MP
                        </span>
                        {Math.abs(contrib.deltaMP) >= 0.1 && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              contrib.deltaMP > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {contrib.deltaMP > 0
                              ? `+${contrib.deltaMP.toFixed(1)} MP`
                              : `${contrib.deltaMP.toFixed(1)} MP`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepper + Input + Slider Row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleModelVolumeChange(m.id, vol - 200)}
                        className="px-2 py-1 text-xs font-mono font-semibold bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        -200
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(8000, baseVol * 2)}
                        step={50}
                        value={vol}
                        onChange={(e) =>
                          handleModelVolumeChange(m.id, Number(e.target.value))
                        }
                        className="flex-1 accent-blue-600 cursor-pointer"
                      />
                      <button
                        onClick={() => handleModelVolumeChange(m.id, vol + 200)}
                        className="px-2 py-1 text-xs font-mono font-semibold bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        +200
                      </button>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={vol}
                        onChange={(e) =>
                          handleModelVolumeChange(m.id, Number(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1 text-right font-mono font-bold text-xs bg-white border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>
                        ตั้งต้น: {baseVol.toLocaleString()} คัน (
                        {diffVol >= 0 ? `+${diffVol.toLocaleString()}` : diffVol.toLocaleString()})
                      </span>
                      <span>
                        สัดส่วน: {mixPct.toFixed(1)}% · อัตราใช้คน:{' '}
                        <strong className="text-slate-700">
                          {contrib.mpPer1000Units.toFixed(1)} MP / 1,000 คัน
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save / Push to Any Week or Month */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-800">
              ส่งค่า Volume & MP ที่จำลองไปยังสัปดาห์อื่น หรือ Sheet 12 เดือน:
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {WEEKS.map((w) => (
                <button
                  key={w}
                  onClick={() => handleManualPushToWeek(w)}
                  className="px-2.5 py-1.5 text-xs font-mono font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 rounded-md transition-colors cursor-pointer"
                >
                  บันทึกลง {w}
                </button>
              ))}
            </div>
            {onApplyToMonth && (
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value as MonthKey)}
                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                >
                  {MONTHS.map((mo) => (
                    <option key={mo.key} value={mo.key}>
                      {mo.fullThai} ({mo.cnName})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handlePushToMonth}
                  className="flex-1 py-1.5 px-3 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-colors cursor-pointer"
                >
                  อัปเดตลงกราฟ 12 เดือน ({targetMonth})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (7 Cols): Interactive Volume-to-MP Sensitivity Graph + Station-by-Station Forecast Table */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Interactive Volume vs. Manpower Sensitivity Graph */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>
                    กราฟความสัมพันธ์เมื่อเพิ่ม-ลด Volume (-40% ถึง +50%) ต่อกำลังคน MP ({activeLine})
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  คลิกที่แท่งหรือจุดใดก็ได้บนกราฟเพื่อปรับ Volume ไปยังระดับนั้นและคำนวณ MP ทันที
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                  <span>CAB MP</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                  <span>FG MP</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 inline-block" />
                  <span className="font-bold">รวม CAB+FG</span>
                </span>
              </div>
            </div>

            {/* Interactive Bar/Stepped Chart across 10 Volume Steps */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-2">
              {sensitivityPoints.map((pt) => {
                const isCloseToCurrent =
                  Math.abs(pt.totalVolume - currentTotalVolume) <
                  originalFactoryTotalVolume * 0.04;
                const maxMPInChart =
                  sensitivityPoints[sensitivityPoints.length - 1]?.totalMP || 450;
                const cabHeightPct = Math.min(
                  100,
                  Math.round((pt.cabMP / Math.max(1, maxMPInChart)) * 100)
                );
                const fgHeightPct = Math.min(
                  100,
                  Math.round((pt.fgMP / Math.max(1, maxMPInChart)) * 100)
                );

                return (
                  <button
                    key={pt.pct}
                    onClick={() => updateVolumesWithSync(pt.scaledVols)}
                    className={`p-2 rounded-lg border flex flex-col items-center justify-between transition-all cursor-pointer font-mono ${
                      isCloseToCurrent
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20'
                        : pt.pct === 0
                        ? 'bg-amber-50/60 border-amber-300 hover:bg-amber-100/50'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-600">
                      {pt.pct > 0 ? `+${pt.pct}%` : pt.pct === 0 ? 'ตั้งต้น' : `${pt.pct}%`}
                    </div>

                    <div className="text-xs font-bold text-slate-900 my-1">
                      {pt.totalMP} MP
                    </div>

                    {/* Stacked Visual Bar */}
                    <div className="w-full h-24 bg-slate-200/70 rounded flex flex-col justify-end overflow-hidden p-0.5 gap-0.5">
                      <div
                        style={{ height: `${fgHeightPct}%` }}
                        className="w-full bg-emerald-500 rounded-t-xs transition-all"
                        title={`FG: ${pt.fgMP} MP`}
                      />
                      <div
                        style={{ height: `${cabHeightPct}%` }}
                        className="w-full bg-blue-600 rounded-b-xs transition-all"
                        title={`CAB: ${pt.cabMP} MP`}
                      />
                    </div>

                    <div className="mt-1.5 text-[9px] text-slate-500 leading-tight text-center">
                      <div>C:{pt.cabMP} | F:{pt.fgMP}</div>
                      <div className="font-semibold text-slate-700">
                        {(pt.totalVolume / 1000).toFixed(1)}k คัน
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Station-by-Station Manpower Forecast Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  ตารางอัตรากำลังคนรายสถานีที่คาดการณ์ทันที ({activeLine} ·{' '}
                  {activeSheet === 'ALL' ? 'รวม CAB + FG' : `Sheet ${activeSheet}`})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบกำลังคนตั้งต้น (`{targetWeek}`) กับกำลังคนที่ต้องใช้จริงเมื่อปรับ Volume (คลิกแถวเพื่อดู/แก้ไขเวลามาตรฐานรายรุ่น)
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onSelectLineAndSheet(activeLine, 'CAB')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    activeSheet === 'CAB'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  CAB ({currentCabForecast.totalStdMP} MP)
                </button>
                <button
                  onClick={() => onSelectLineAndSheet(activeLine, 'FG')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    activeSheet === 'FG'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  FG ({currentFgForecast.totalStdMP} MP)
                </button>
                <button
                  onClick={() => onSelectLineAndSheet(activeLine, 'ALL')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    activeSheet === 'ALL'
                      ? 'bg-slate-900 text-amber-300 border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  รวม CAB+FG ({totalCombinedMP} MP)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-mono">
                    <th className="py-2.5 px-3 text-left font-semibold">สถานีงาน (Station)</th>
                    <th className="py-2.5 px-2 text-center font-semibold">แผนก</th>
                    <th className="py-2.5 px-2 text-right font-semibold">
                      เวลาถ่วงน้ำหนัก
                    </th>
                    <th className="py-2.5 px-2 text-right font-semibold">
                      ชม.งานรวม
                    </th>
                    <th className="py-2.5 px-2 text-right font-semibold">
                      MP ตั้งต้น ({targetWeek})
                    </th>
                    <th className="py-2.5 px-3 text-right font-bold bg-blue-50 text-blue-900">
                      MP คาดการณ์ใหม่
                    </th>
                    <th className="py-2.5 px-3 text-right font-bold">
                      ส่วนต่าง (±MP)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  {forecast.stations.map((s) => {
                    const isExpanded = expandedStationId === s.station.id;
                    return (
                      <React.Fragment key={s.station.id}>
                        <tr
                          onClick={() =>
                            setExpandedStationId(isExpanded ? null : s.station.id)
                          }
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 font-sans">
                            <div className="font-bold text-slate-900 font-mono">
                              {s.station.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {s.station.thaiName}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                s.station.subArea === 'FG'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {s.station.subArea}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-700">
                            {Math.round(s.weightedST)}s
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-600">
                            {Math.round(s.manHoursRequired).toLocaleString()} ชม.
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-500 font-semibold">
                            {s.baselineMP}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-base text-blue-700 bg-blue-50/50">
                            {s.stdMP}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">
                              ({s.exactMP.toFixed(1)})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {s.deltaMP > 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                                <ArrowUpRight className="w-3 h-3" />+{s.deltaMP}
                              </span>
                            ) : s.deltaMP < 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                                <ArrowDownRight className="w-3 h-3" />
                                {s.deltaMP}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                <Minus className="w-3 h-3" />0
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Standard Time Inline Editor */}
                        {isExpanded && (
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <td colSpan={7} className="p-3">
                              <div className="text-[11px] font-sans font-bold text-slate-700 mb-2">
                                แก้ไขเวลามาตรฐานรายรุ่น (วินาที) ของสถานี {s.station.name}:
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                {models.map((m) => (
                                  <div
                                    key={m.id}
                                    className="bg-white p-2 rounded border border-slate-200"
                                  >
                                    <div className="text-[10px] font-bold text-slate-700">
                                      {m.name}
                                    </div>
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={s.station.standardTimes[m.id] || 0}
                                      onChange={(e) =>
                                        onUpdateStandardTime(
                                          s.station.id,
                                          m.id,
                                          Math.max(0, Number(e.target.value) || 0)
                                        )
                                      }
                                      className="mt-1 w-full text-right font-mono text-xs px-1.5 py-1 border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-mono font-bold">
                    <td colSpan={2} className="py-3 px-3 font-sans">
                      รวมทั้งสิ้น ({activeLine} · {activeSheet})
                    </td>
                    <td className="py-3 px-2 text-right">
                      {Math.round(forecast.totalWeightedST)}s
                    </td>
                    <td className="py-3 px-2 text-right">
                      {Math.round(forecast.totalManHours).toLocaleString()} ชม.
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300">
                      {forecast.baselineTotalMP} MP
                    </td>
                    <td className="py-3 px-3 text-right text-base text-amber-300 bg-slate-800">
                      {forecast.totalStdMP} MP
                    </td>
                    <td className="py-3 px-3 text-right">
                      {forecast.deltaTotalMP > 0
                        ? `+${forecast.deltaTotalMP} MP`
                        : `${forecast.deltaTotalMP} MP`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
