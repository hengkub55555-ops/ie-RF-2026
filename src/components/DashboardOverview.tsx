import React, { useState, useEffect } from 'react';
import {
  WEEKS,
  WeekKey,
  LineKey,
  SheetKey,
  WeeklySummaryMetrics,
  ModelSeries,
  ModelMetadata,
  StationConfig,
} from '../data/mpModelData';
import {
  Users,
  Clock,
  Activity,
  Layers,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { PageLanguageSwitchBar } from '../context/AppPreferencesContext';

interface DashboardOverviewProps {
  activeLine: LineKey;
  activeSheet: SheetKey;
  models: ModelMetadata[];
  metrics: WeeklySummaryMetrics;
  lineACabMetrics: WeeklySummaryMetrics;
  lineAFgMetrics: WeeklySummaryMetrics;
  lineBCabMetrics: WeeklySummaryMetrics;
  lineBFgMetrics: WeeklySummaryMetrics;
  weeklyVolumes: Record<ModelSeries, Record<WeekKey, number>>;
  selectedWeek: WeekKey;
  onSelectWeek: (w: WeekKey) => void;
  onSelectLineAndSheet: (line: LineKey, sheet: SheetKey) => void;
  onNavigateToForecaster: (presetWeek: WeekKey) => void;
  onNavigateToMaster: () => void;
  onNavigateToLineCompare?: () => void;
  onUpdateStandardTime: (stationId: string, model: ModelSeries, newTime: number) => void;
  onUpdateWeeklyVolume: (model: ModelSeries, week: WeekKey, newVol: number) => void;
  onUpdateStationField: (stationId: string, patch: Partial<StationConfig>) => void;
  onUpdateModelMeta: (modelId: ModelSeries, patch: Partial<ModelMetadata>) => void;
  onAddStation: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  activeLine,
  activeSheet,
  models,
  metrics,
  lineACabMetrics,
  lineAFgMetrics,
  lineBCabMetrics,
  lineBFgMetrics,
  weeklyVolumes,
  selectedWeek,
  onSelectWeek,
  onSelectLineAndSheet,
  onNavigateToForecaster,
  onNavigateToMaster,
  onNavigateToLineCompare,
  onUpdateStandardTime,
  onUpdateWeeklyVolume,
  onUpdateStationField,
  onUpdateModelMeta,
  onAddStation,
}) => {
  const [inspectedStationId, setInspectedStationId] = useState<string>(
    metrics.stationRows[0]?.station.id || ''
  );

  // Ensure inspectedStationId stays valid when switching between CAB / FG / ALL
  useEffect(() => {
    if (
      metrics.stationRows.length > 0 &&
      !metrics.stationRows.some((r) => r.station.id === inspectedStationId)
    ) {
      setInspectedStationId(metrics.stationRows[0].station.id);
    }
  }, [activeLine, activeSheet, metrics.stationRows, inspectedStationId]);

  const totalMonthlyVolume = WEEKS.reduce((acc, w) => acc + metrics.totalVolume[w], 0);
  const currentWeekVol = metrics.totalVolume[selectedWeek];
  const currentWeekMP = metrics.totalStdMP[selectedWeek];
  const currentWeekExactMP = metrics.totalExactMP[selectedWeek];
  const currentWeekWeightedST = metrics.totalWeightedST[selectedWeek];
  const currentLineHours = metrics.lineHoursRequired[selectedWeek];

  const sortedStationsByMP = [...metrics.stationRows].sort(
    (a, b) => b.byWeek[selectedWeek].stdMP - a.byWeek[selectedWeek].stdMP
  );
  const bottleneckStation = sortedStationsByMP[0];

  const inspectedRow =
    metrics.stationRows.find((r) => r.station.id === inspectedStationId) ||
    metrics.stationRows[0];

  const cabMetrics = activeLine === 'LineA' ? lineACabMetrics : lineBCabMetrics;
  const fgMetrics = activeLine === 'LineA' ? lineAFgMetrics : lineBFgMetrics;

  const sheetTitle =
    activeSheet === 'FG'
      ? `${activeLine} — แผนก FG (Finished Goods & Packing — ${fgMetrics.stationRows.length} สถานี)`
      : activeSheet === 'CAB'
      ? `${activeLine} — แผนก CAB (Cabinet Assembly & PU Foam — ${cabMetrics.stationRows.length} สถานี)`
      : `รวมทั้งสายการผลิต ${activeLine} (CAB + FG = ${metrics.stationRows.length} สถานี)`;

  return (
    <div className="space-y-6">
      <PageLanguageSwitchBar pageLabel="ภาพรวมประสิทธิภาพ (Dashboard Overview)" />
      {/* Top Bar Context & Week Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-blue-700">สายการผลิต {activeLine}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-800">{sheetTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-600 font-medium">คลิกตัวเลขในทุกตารางเพื่อแก้ไขได้ทันที</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
            แดชบอร์ดวิเคราะห์อัตรากำลังคนและประสิทธิภาพการผลิต ({activeLine} ·{' '}
            {activeSheet === 'ALL' ? 'CAB + FG' : `Sheet ${activeSheet}`})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {WEEKS.map((w) => {
              const active = selectedWeek === w;
              return (
                <button
                  key={w}
                  onClick={() => onSelectWeek(w)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap font-mono cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  สัปดาห์ {w} ({metrics.totalVolume[w].toLocaleString()})
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onNavigateToForecaster(selectedWeek)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>จำลองปรับ Volume ({selectedWeek})</span>
          </button>
        </div>
      </div>

      {/* Factory-Wide LineA & LineB 4-Sheet Overview Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>
              สรุปภาพรวมทุก Sheet บนเว็บ (LineA & LineB — สัปดาห์ {selectedWeek}) · คลิกเลือกดูแต่ละ Sheet ได้ทันที
            </span>
          </div>
          <div className="text-xs font-mono text-slate-600">
            รวมทั้งโรงงาน (LineA + LineB):{' '}
            <strong className="text-slate-900">
              {lineACabMetrics.totalStdMP[selectedWeek] +
                lineAFgMetrics.totalStdMP[selectedWeek] +
                lineBCabMetrics.totalStdMP[selectedWeek] +
                lineBFgMetrics.totalStdMP[selectedWeek]}{' '}
              MP
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* LineA - CAB */}
          <div
            onClick={() => onSelectLineAndSheet('LineA', 'CAB')}
            className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
              activeLine === 'LineA' && activeSheet === 'CAB'
                ? 'bg-indigo-50/80 border-indigo-600 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-950">LineA — Sheet CAB</span>
              <span className="font-mono text-[11px] text-indigo-700 font-semibold">
                {lineACabMetrics.stationRows.length} สถานี
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between font-mono tabular-nums">
              <div>
                <span className="text-xl font-bold text-indigo-700">
                  {lineACabMetrics.totalStdMP[selectedWeek]}
                </span>
                <span className="text-[11px] text-slate-500 ml-1">MP ({selectedWeek})</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Vol: {lineACabMetrics.totalVolume[selectedWeek].toLocaleString()}
              </span>
            </div>
          </div>

          {/* LineA - FG */}
          <div
            onClick={() => onSelectLineAndSheet('LineA', 'FG')}
            className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
              activeLine === 'LineA' && activeSheet === 'FG'
                ? 'bg-emerald-50/80 border-emerald-600 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-950">LineA — Sheet FG</span>
              <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                {lineAFgMetrics.stationRows.length} สถานี
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between font-mono tabular-nums">
              <div>
                <span className="text-xl font-bold text-emerald-700">
                  {lineAFgMetrics.totalStdMP[selectedWeek]}
                </span>
                <span className="text-[11px] text-slate-500 ml-1">MP ({selectedWeek})</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Vol: {lineAFgMetrics.totalVolume[selectedWeek].toLocaleString()}
              </span>
            </div>
          </div>

          {/* LineB - CAB */}
          <div
            onClick={() => onSelectLineAndSheet('LineB', 'CAB')}
            className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
              activeLine === 'LineB' && activeSheet === 'CAB'
                ? 'bg-blue-50/80 border-blue-600 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-950">LineB — Sheet CAB</span>
              <span className="font-mono text-[11px] text-blue-700 font-semibold">
                {lineBCabMetrics.stationRows.length} สถานี
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between font-mono tabular-nums">
              <div>
                <span className="text-xl font-bold text-blue-700">
                  {lineBCabMetrics.totalStdMP[selectedWeek]}
                </span>
                <span className="text-[11px] text-slate-500 ml-1">MP ({selectedWeek})</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Vol: {lineBCabMetrics.totalVolume[selectedWeek].toLocaleString()}
              </span>
            </div>
          </div>

          {/* LineB - FG */}
          <div
            onClick={() => onSelectLineAndSheet('LineB', 'FG')}
            className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
              activeLine === 'LineB' && activeSheet === 'FG'
                ? 'bg-teal-50/80 border-teal-600 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-950">LineB — Sheet FG</span>
              <span className="font-mono text-[11px] text-teal-700 font-semibold">
                {lineBFgMetrics.stationRows.length} สถานี
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between font-mono tabular-nums">
              <div>
                <span className="text-xl font-bold text-teal-700">
                  {lineBFgMetrics.totalStdMP[selectedWeek]}
                </span>
                <span className="text-[11px] text-slate-500 ml-1">MP ({selectedWeek})</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Vol: {lineBFgMetrics.totalVolume[selectedWeek].toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {onNavigateToLineCompare && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 border border-indigo-200 rounded-lg text-xs mt-3">
            <div className="flex items-center gap-2 text-indigo-950 font-medium">
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-mono text-[11px] font-bold shrink-0">
                Line A vs Line B
              </span>
              <span>
                <strong>แยกไลน์และเปรียบเทียบเวลามาตรฐาน:</strong> เวลามาตรฐาน (ST) แต่ละรุ่นของ Line A และ Line B ไม่เท่ากัน ใช้กำลังคนแตกต่างกัน
              </span>
            </div>
            <button
              onClick={onNavigateToLineCompare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer shrink-0"
            >
              <span>เปิด Sheet แยกไลน์ Line A vs Line B</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* CAB vs FG Quick Summary Banner for Active Line */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onSelectLineAndSheet(activeLine, 'CAB')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSheet === 'CAB'
              ? 'bg-blue-50/70 border-blue-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Sheet 1: {activeLine} — CAB ({cabMetrics.stationRows.length} สถานี)
            </span>
            <span className="font-mono text-slate-500">UPH 140</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-blue-700">
                {cabMetrics.totalStdMP[selectedWeek]}
              </span>
              <span className="text-xs text-slate-500 ml-1">MP ({selectedWeek})</span>
            </div>
            <div className="text-xs text-slate-600">
              เวลาถ่วงน้ำหนัก: <strong>{Math.round(cabMetrics.totalWeightedST[selectedWeek])}s</strong>
            </div>
          </div>
        </div>

        <div
          onClick={() => onSelectLineAndSheet(activeLine, 'FG')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSheet === 'FG'
              ? 'bg-emerald-50/70 border-emerald-600 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Sheet 2: {activeLine} — FG ({fgMetrics.stationRows.length} สถานี)
            </span>
            <span className="font-mono text-slate-500">UPH 140</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-emerald-700">
                {fgMetrics.totalStdMP[selectedWeek]}
              </span>
              <span className="text-xs text-slate-500 ml-1">MP ({selectedWeek})</span>
            </div>
            <div className="text-xs text-slate-600">
              เวลาถ่วงน้ำหนัก: <strong>{Math.round(fgMetrics.totalWeightedST[selectedWeek])}s</strong>
            </div>
          </div>
        </div>

        <div
          onClick={() => onSelectLineAndSheet(activeLine, 'ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeSheet === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">
              รวมทั้งสายการผลิต {activeLine} (CAB + FG)
            </span>
            <span className="font-mono opacity-75">Total {activeLine}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span
                className={`text-2xl font-bold ${
                  activeSheet === 'ALL' ? 'text-amber-300' : 'text-slate-900'
                }`}
              >
                {cabMetrics.totalStdMP[selectedWeek] + fgMetrics.totalStdMP[selectedWeek]}
              </span>
              <span className="text-xs opacity-75 ml-1">MP ({selectedWeek})</span>
            </div>
            <div className="text-xs opacity-85">
              เวลารวม:{' '}
              <strong>
                {Math.round(
                  cabMetrics.totalWeightedST[selectedWeek] +
                    fgMetrics.totalWeightedST[selectedWeek]
                )}
                s
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              กำลังคนมาตรฐานรวม ({activeSheet} — {selectedWeek})
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {currentWeekMP}
            </span>
            <span className="text-xs text-slate-500">คน (STD MP)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
            <span>ค่าทศนิยม: {currentWeekExactMP.toFixed(2)} MP</span>
            <span>
              Min {metrics.minTotalMP} · Max {metrics.maxTotalMP}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ยอดคำสั่งผลิตสัปดาห์ {selectedWeek} (9月订单量)</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {currentWeekVol.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">เครื่อง (Units)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
            <span>รวมทั้งเดือน: {totalMonthlyVolume.toLocaleString()}</span>
            <span>
              สัดส่วน{' '}
              {totalMonthlyVolume > 0
                ? ((currentWeekVol / totalMonthlyVolume) * 100).toFixed(1)
                : '0.0'}
              %
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>เวลามาตรฐานถ่วงน้ำหนักรวม (加权工时)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {Math.round(currentWeekWeightedST).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">วินาที / เครื่อง</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
            <span>({(currentWeekWeightedST / 60).toFixed(1)} นาที/เครื่อง)</span>
            <span>Takt Time: 25.71s</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ชั่วโมงเดินสายการผลิตที่ต้องการ</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {currentLineHours.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">ชม. เดินไลน์ / สัปดาห์</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
            <span>≈ {(currentLineHours / 8).toFixed(1)} กะ (8 ชม.)</span>
            <span>
              คอขวด: {bottleneckStation?.station.name} (
              {bottleneckStation?.byWeek[selectedWeek].stdMP} MP)
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Analytical & Editable Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Station-by-Station STD MP & Weighted Time Breakdown */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                อัตรากำลังคนมาตรฐานรายสถานีงาน ({activeSheet} — สัปดาห์ {selectedWeek})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกเลือกสถานีเพื่อแก้ไขเวลามาตรฐาน (产品工时), UPH, Efficiency หรือชื่อสถานีด้านขวา
              </p>
            </div>
            <button
              onClick={onAddStation}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มสถานีงาน ({activeSheet === 'FG' ? 'FG' : 'CAB'})</span>
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {metrics.stationRows.map((row) => {
              const m = row.byWeek[selectedWeek];
              const maxBarMP = 50;
              const widthPct = Math.min(100, (m.stdMP / maxBarMP) * 100);
              const isSelected = row.station.id === inspectedStationId;

              return (
                <div
                  key={row.station.id}
                  onClick={() => setInspectedStationId(row.station.id)}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-slate-400">
                        [{row.station.subArea}] {row.station.code}
                      </span>
                      <span className="font-semibold text-slate-900 truncate">
                        {row.station.name}
                      </span>
                      <span className="text-slate-400 hidden sm:inline">·</span>
                      <span className="text-slate-500 truncate hidden sm:inline">
                        {row.station.thaiName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums">
                      <span className="text-slate-500">
                        เวลาถ่วงน้ำหนัก:{' '}
                        <strong className="text-slate-800">{m.roundedWeightedST}s</strong>
                      </span>
                      <span className="text-slate-900 font-bold text-sm w-16 text-right">
                        {m.stdMP} MP
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar & 4-Week Mini Comparison */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.station.subArea === 'FG'
                            ? 'bg-emerald-600'
                            : m.stdMP >= 30
                            ? 'bg-blue-600'
                            : 'bg-sky-600'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                      {WEEKS.map((w) => (
                        <span
                          key={w}
                          className={
                            w === selectedWeek ? 'text-blue-700 font-bold underline' : ''
                          }
                        >
                          {w}:{row.byWeek[w].stdMP}
                        </span>
                      ))}
                      <span className="text-slate-300">|</span>
                      <span>
                        AVG:{row.avgMP} ({row.minMP}–{row.maxMP})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Editable Live Formula Inspector + Editable Production Mix */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {inspectedRow && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex-1 space-y-1.5">
                  <div className="text-xs text-blue-600 font-medium">
                    แก้ไขข้อมูลและสูตรคำนวณรายสถานี ({inspectedRow.station.subArea} — {selectedWeek})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={inspectedRow.station.name}
                      onChange={(e) =>
                        onUpdateStationField(inspectedRow.station.id, {
                          name: e.target.value,
                        })
                      }
                      className="px-2.5 py-1 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-blue-600 focus:outline-none"
                      title="แก้ไขชื่อสถานี (线段)"
                    />
                    <input
                      type="text"
                      value={inspectedRow.station.thaiName}
                      onChange={(e) =>
                        onUpdateStationField(inspectedRow.station.id, {
                          thaiName: e.target.value,
                        })
                      }
                      className="px-2.5 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-blue-600 focus:outline-none"
                      title="แก้ไขคำอธิบายสถานี"
                    />
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums shrink-0">
                  <div className="text-xl font-bold text-blue-600">
                    {inspectedRow.byWeek[selectedWeek].stdMP} MP
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ค่าจริง: {inspectedRow.byWeek[selectedWeek].exactMP.toFixed(2)} MP
                  </div>
                </div>
              </div>

              {/* Station UPH & Efficiency Inline Controls */}
              <div className="mt-3 grid grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">UPH ({selectedWeek}):</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={
                      inspectedRow.station.uphByWeek?.[selectedWeek] ??
                      inspectedRow.station.uph
                    }
                    onChange={(e) => {
                      const val = Math.max(1, parseFloat(e.target.value || '140'));
                      onUpdateStationField(inspectedRow.station.id, {
                        uph: val,
                        uphByWeek: {
                          ...(inspectedRow.station.uphByWeek || {
                            '1W': 140,
                            '2W': 140,
                            '3W': 140,
                            '4W': 140,
                          }),
                          [selectedWeek]: val,
                        },
                      });
                    }}
                    className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-700">Efficiency η (%):</span>
                  <input
                    type="number"
                    step="0.5"
                    min={10}
                    max={100}
                    value={Number((inspectedRow.station.efficiency * 100).toFixed(1))}
                    onChange={(e) => {
                      const pct = Math.min(
                        100,
                        Math.max(10, parseFloat(e.target.value || '80'))
                      );
                      onUpdateStationField(inspectedRow.station.id, {
                        efficiency: pct / 100,
                      });
                    }}
                    className="w-20 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Step 1: Editable Model ST x Mix Ratio Table */}
              <div className="mt-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  1. แก้ไขเวลามาตรฐาน (产品工时) และยอดผลิต ({selectedWeek}) ได้โดยตรง:
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">รุ่น (Model)</th>
                        <th className="py-2 px-2 font-semibold text-right">เวลามาตรฐาน (s)</th>
                        <th className="py-2 px-2 font-semibold text-right">Volume ({selectedWeek})</th>
                        <th className="py-2 px-2 font-semibold text-right">สัดส่วน</th>
                        <th className="py-2 px-2.5 font-semibold text-right">เวลาถ่วงน้ำหนัก</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                      {models.map((m) => {
                        const st = inspectedRow.station.standardTimes[m.id];
                        const vol = weeklyVolumes[m.id][selectedWeek];
                        const ratio = metrics.mixRatios[m.id][selectedWeek];
                        const weightedPart = st * ratio;
                        return (
                          <tr
                            key={m.id}
                            className={
                              st === 0 || vol === 0
                                ? 'text-slate-400 bg-slate-50/40'
                                : 'text-slate-800'
                            }
                          >
                            <td className="py-1.5 px-2.5 font-medium font-sans">{m.name}</td>
                            <td className="py-1 px-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={st}
                                onChange={(e) =>
                                  onUpdateStandardTime(
                                    inspectedRow.station.id,
                                    m.id,
                                    Math.max(0, parseFloat(e.target.value || '0'))
                                  )
                                }
                                className="w-20 px-1.5 py-0.5 text-right font-mono font-semibold bg-white border border-slate-300 rounded text-slate-900 focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-1 px-2 text-right">
                              <input
                                type="number"
                                step="10"
                                min={0}
                                value={vol}
                                onChange={(e) =>
                                  onUpdateWeeklyVolume(
                                    m.id,
                                    selectedWeek,
                                    Math.max(0, parseInt(e.target.value || '0', 10))
                                  )
                                }
                                className="w-20 px-1.5 py-0.5 text-right font-mono font-semibold bg-white border border-slate-300 rounded text-slate-900 focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              {(ratio * 100).toFixed(1)}%
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold">
                              +{weightedPart.toFixed(2)}s
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-mono tabular-nums font-bold text-slate-900">
                      <tr>
                        <td className="py-2 px-2.5 font-sans">รวม (SUM)</td>
                        <td className="py-2 px-2 text-right">—</td>
                        <td className="py-2 px-2 text-right">
                          {currentWeekVol.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right">100.0%</td>
                        <td className="py-2 px-2.5 text-right text-blue-700">
                          {inspectedRow.byWeek[selectedWeek].weightedST.toFixed(2)}s (≈
                          {inspectedRow.byWeek[selectedWeek].roundedWeightedST}s)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Step 2: MP Formula Box */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                <div className="font-semibold text-slate-800">
                  2. สูตรคำนวณกำลังคนมาตรฐาน (STD MP Formula):
                </div>
                <div className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 tabular-nums">
                  STD MP = ROUND( (Weighted ST × UPH) ÷ (3600 × Line Efficiency η) )
                </div>
                <div className="font-mono text-slate-600 tabular-nums flex flex-wrap items-center justify-between pt-1">
                  <span>
                    = ({inspectedRow.byWeek[selectedWeek].weightedST.toFixed(2)} ×{' '}
                    {inspectedRow.byWeek[selectedWeek].uph}) ÷ (3600 ×{' '}
                    {(inspectedRow.station.efficiency * 100).toFixed(1)}%)
                  </span>
                  <span className="font-bold text-slate-900">
                    = {inspectedRow.byWeek[selectedWeek].exactMP.toFixed(2)} →{' '}
                    <span className="text-blue-600">
                      {inspectedRow.byWeek[selectedWeek].stdMP} คน
                    </span>
                  </span>
                </div>
              </div>

              {inspectedRow.station.sheetNote && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{inspectedRow.station.sheetNote}</span>
                </div>
              )}
            </div>
          )}

          {/* Editable Weekly Production Mix Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  สัดส่วนการผลิตรายรุ่น (9月份产量占比 — แก้ไขชื่อรุ่นและยอด {selectedWeek})
                </h3>
              </div>
              <button
                onClick={onNavigateToMaster}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                <span>ดูตารางเต็ม</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {models.map((m) => {
                const vol = weeklyVolumes[m.id][selectedWeek];
                const ratio = metrics.mixRatios[m.id][selectedWeek];
                const pct = ratio * 100;
                const roundedSheetPct = Math.round(pct);

                return (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: m.color }}
                        />
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) =>
                            onUpdateModelMeta(m.id, { name: e.target.value })
                          }
                          className="w-20 px-1.5 py-0.5 font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-600 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={m.thaiDesc}
                          onChange={(e) =>
                            onUpdateModelMeta(m.id, { thaiDesc: e.target.value })
                          }
                          className="flex-1 min-w-0 px-1.5 py-0.5 text-slate-500 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div className="font-mono tabular-nums text-slate-700 shrink-0 flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={vol}
                          onChange={(e) =>
                            onUpdateWeeklyVolume(
                              m.id,
                              selectedWeek,
                              Math.max(0, parseInt(e.target.value || '0', 10))
                            )
                          }
                          className="w-20 px-1.5 py-0.5 text-right font-semibold bg-white border border-slate-300 rounded focus:border-blue-600 focus:outline-none"
                        />
                        <span className="font-bold text-slate-900 w-10 text-right">
                          ({roundedSheetPct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: m.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 4-Week Summary Comparison Table (All Cells Editable) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ตารางสรุปอัตรากำลังคนมาตรฐานทุกสถานี ({sheetTitle} — แก้ไขได้ทุกช่อง)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              พิมพ์แก้ไขชื่อสถานี, UPH, Efficiency, เวลาถ่วงน้ำหนัก หรือ STD MP รายสัปดาห์ได้โดยตรง
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>ซิงค์ข้อมูลทุก Sheet อัตโนมัติ</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-3 font-semibold">Sheet</th>
                <th className="py-3 px-3 font-semibold min-w-[200px]">สถานีงาน (线段)</th>
                <th className="py-3 px-2 font-semibold text-right">UPH</th>
                <th className="py-3 px-2 font-semibold text-right">Efficiency (%)</th>
                {WEEKS.map((w) => (
                  <th
                    key={`wst-${w}`}
                    className="py-3 px-2 font-semibold text-right bg-amber-50/40 border-l border-slate-200"
                  >
                    เวลาถ่วงน้ำหนัก {w}
                  </th>
                ))}
                {WEEKS.map((w) => (
                  <th
                    key={`mp-${w}`}
                    className={`py-3 px-2 font-semibold text-right border-l border-slate-200 ${
                      w === selectedWeek ? 'bg-blue-50 text-blue-800' : 'bg-slate-50'
                    }`}
                  >
                    STD MP {w}
                  </th>
                ))}
                <th className="py-3 px-2.5 font-semibold text-right bg-yellow-50/60 border-l border-slate-200">
                  AVG
                </th>
                <th className="py-3 px-2.5 font-semibold text-right bg-cyan-50/60">MIN</th>
                <th className="py-3 px-2.5 font-semibold text-right bg-rose-50/60">MAX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {metrics.stationRows.map((row) => {
                const hasManualOverride = WEEKS.some(
                  (w) =>
                    row.byWeek[w].isManualWeightedST || row.byWeek[w].isManualStdMP
                );

                return (
                  <tr
                    key={row.station.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2 px-3">
                      <span
                        className={`font-bold ${
                          row.station.subArea === 'FG'
                            ? 'text-emerald-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {row.station.subArea}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={row.station.name}
                          onChange={(e) =>
                            onUpdateStationField(row.station.id, { name: e.target.value })
                          }
                          className="w-full font-semibold text-slate-900 px-1.5 py-0.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-600 rounded focus:outline-none"
                        />
                        {hasManualOverride && (
                          <button
                            onClick={() =>
                              onUpdateStationField(row.station.id, {
                                manualWeightedST: {},
                                manualStdMP: {},
                              })
                            }
                            className="p-1 text-amber-600 hover:text-amber-800 cursor-pointer shrink-0"
                            title="ล้างค่าที่กรอกเองเพื่อกลับไปใช้สูตรคำนวณอัตโนมัติ"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={row.station.thaiName}
                        onChange={(e) =>
                          onUpdateStationField(row.station.id, {
                            thaiName: e.target.value,
                          })
                        }
                        className="w-full text-[11px] text-slate-500 px-1.5 py-0.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-600 rounded focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={row.station.uph}
                        onChange={(e) => {
                          const val = Math.max(1, parseFloat(e.target.value || '140'));
                          onUpdateStationField(row.station.id, {
                            uph: val,
                            uphByWeek: {
                              '1W': val,
                              '2W': val,
                              '3W': val,
                              '4W': val,
                            },
                          });
                        }}
                        className="w-16 px-1.5 py-1 text-right bg-white border border-slate-200 rounded focus:border-blue-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.5"
                        min={10}
                        max={100}
                        value={Number((row.station.efficiency * 100).toFixed(1))}
                        onChange={(e) => {
                          const pct = Math.min(
                            100,
                            Math.max(10, parseFloat(e.target.value || '80'))
                          );
                          onUpdateStationField(row.station.id, {
                            efficiency: pct / 100,
                          });
                        }}
                        className="w-16 px-1.5 py-1 text-right bg-white border border-slate-200 rounded focus:border-blue-600 focus:outline-none"
                      />
                    </td>
                    {WEEKS.map((w) => (
                      <td
                        key={`wst-cell-${w}`}
                        className="py-2 px-2 text-right bg-amber-50/20 border-l border-slate-100"
                      >
                        <input
                          type="number"
                          min={0}
                          value={row.byWeek[w].roundedWeightedST}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateStationField(row.station.id, {
                              manualWeightedST: {
                                ...(row.station.manualWeightedST || {}),
                                [w]: isNaN(val) ? null : val,
                              },
                            });
                          }}
                          className={`w-16 px-1.5 py-1 text-right rounded border focus:outline-none focus:border-blue-600 ${
                            row.byWeek[w].isManualWeightedST
                              ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        />
                      </td>
                    ))}
                    {WEEKS.map((w) => (
                      <td
                        key={`mp-cell-${w}`}
                        className={`py-2 px-2 text-right font-bold border-l border-slate-100 ${
                          w === selectedWeek ? 'bg-blue-50/70' : ''
                        }`}
                      >
                        <input
                          type="number"
                          min={0}
                          value={row.byWeek[w].stdMP}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            onUpdateStationField(row.station.id, {
                              manualStdMP: {
                                ...(row.station.manualStdMP || {}),
                                [w]: isNaN(val) ? null : val,
                              },
                            });
                          }}
                          className={`w-14 px-1.5 py-1 text-right rounded border font-bold focus:outline-none focus:border-blue-600 ${
                            row.byWeek[w].isManualStdMP
                              ? 'bg-amber-100 border-amber-400 text-amber-900'
                              : w === selectedWeek
                              ? 'bg-white border-blue-300 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        />
                      </td>
                    ))}
                    <td className="py-2 px-2.5 text-right font-semibold bg-yellow-50/30 border-l border-slate-100">
                      {row.avgMP}
                    </td>
                    <td className="py-2 px-2.5 text-right font-semibold bg-cyan-50/30">
                      {row.minMP}
                    </td>
                    <td className="py-2 px-2.5 text-right font-semibold bg-rose-50/30">
                      {row.maxMP}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 font-mono tabular-nums text-xs">
              <tr className="bg-slate-900 text-white font-bold">
                <td colSpan={2} className="py-3 px-4 font-sans">
                  รวมจริง ({sheetTitle})
                </td>
                <td className="py-3 px-2 text-right">
                  {metrics.totalUphSum['1W']}
                </td>
                <td className="py-3 px-2 text-right">—</td>
                {WEEKS.map((w) => (
                  <td key={`tot-wst-${w}`} className="py-3 px-2 text-right border-l border-slate-700">
                    {Math.round(metrics.totalWeightedST[w])}s
                  </td>
                ))}
                {WEEKS.map((w) => (
                  <td
                    key={`tot-mp-${w}`}
                    className="py-3 px-2 text-right text-amber-300 border-l border-slate-700 text-sm"
                  >
                    {metrics.totalStdMP[w]} MP
                  </td>
                ))}
                <td className="py-3 px-2.5 text-right border-l border-slate-700">
                  {metrics.avgTotalMP}
                </td>
                <td className="py-3 px-2.5 text-right">{metrics.minTotalMP}</td>
                <td className="py-3 px-2.5 text-right">{metrics.maxTotalMP}</td>
              </tr>
              <tr className="bg-slate-100 text-slate-600">
                <td colSpan={2} className="py-2 px-4 font-sans">
                  ค่าบรรทัดรวม (合计) ที่แสดงในไฟล์ภาพต้นฉบับ ({activeSheet})
                </td>
                <td className="py-2 px-2 text-right">
                  {metrics.sheetFooterReference.uph['1W']}
                </td>
                <td className="py-2 px-2 text-right">—</td>
                {WEEKS.map((w) => (
                  <td
                    key={`ref-wst-${w}`}
                    className="py-2 px-2 text-right border-l border-slate-200"
                  >
                    {metrics.sheetFooterReference.weightedST[w]}s
                  </td>
                ))}
                {WEEKS.map((w) => (
                  <td
                    key={`ref-mp-${w}`}
                    className="py-2 px-2 text-right border-l border-slate-200 font-semibold"
                  >
                    {metrics.sheetFooterReference.stdMP[w]} MP
                  </td>
                ))}
                <td className="py-2 px-2.5 text-right border-l border-slate-200">
                  {metrics.sheetFooterReference.avg}
                </td>
                <td className="py-2 px-2.5 text-right">{metrics.sheetFooterReference.min}</td>
                <td className="py-2 px-2.5 text-right">{metrics.sheetFooterReference.max}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
