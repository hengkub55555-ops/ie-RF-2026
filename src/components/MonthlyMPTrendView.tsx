import React, { useState } from 'react';
import {
  MONTHS,
  MonthKey,
  LineKey,
  SheetKey,
  ModelSeries,
  ModelMetadata,
  StationConfig,
  YearlyTrendMetrics,
  MonthlyPlanByLine,
} from '../data/mpModelData';
import {
  TrendingUp,
  Users,
  Calendar,
  Activity,
  RefreshCw,
  Download,
  RotateCcw,
  Layers,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { PageLanguageSwitchBar } from '../context/AppPreferencesContext';

interface MonthlyMPTrendViewProps {
  activeLine: LineKey;
  activeSheet: SheetKey;
  models: ModelMetadata[];
  stations: StationConfig[];
  linePlan: MonthlyPlanByLine[LineKey];
  activeTrend: YearlyTrendMetrics;
  lineATotalTrend: YearlyTrendMetrics;
  lineBTotalTrend: YearlyTrendMetrics;
  useDynamicVolumeUph: boolean;
  onToggleDynamicUph: (val: boolean) => void;
  onSelectLineAndSheet: (line: LineKey, sheet: SheetKey) => void;
  onUpdateMonthlyVolume: (
    line: LineKey,
    model: ModelSeries,
    month: MonthKey,
    val: number
  ) => void;
  onScaleMonthTotalVolume: (line: LineKey, month: MonthKey, newTotal: number) => void;
  onUpdateMonthlyUph: (line: LineKey, month: MonthKey, val: number) => void;
  onUpdateMonthlyWorkingHours: (line: LineKey, month: MonthKey, val: number) => void;
  onUpdateManualMonthlyMP: (
    line: LineKey,
    month: MonthKey,
    val: number | null
  ) => void;
  onSyncSeptemberFromWeekly: () => void;
  onResetMonthlyPlan: () => void;
  onUpdateStationField: (stationId: string, patch: Partial<StationConfig>) => void;
}

type ChartMode = 'cab_fg_split' | 'linea_vs_lineb' | 'mp_vs_volume';

export const MonthlyMPTrendView: React.FC<MonthlyMPTrendViewProps> = ({
  activeLine,
  activeSheet,
  models,
  linePlan,
  activeTrend,
  lineATotalTrend,
  lineBTotalTrend,
  useDynamicVolumeUph,
  onToggleDynamicUph,
  onSelectLineAndSheet,
  onUpdateMonthlyVolume,
  onScaleMonthTotalVolume,
  onUpdateMonthlyUph,
  onUpdateMonthlyWorkingHours,
  onUpdateManualMonthlyMP,
  onSyncSeptemberFromWeekly,
  onResetMonthlyPlan,
  onUpdateStationField,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>('M09');
  const [chartMode, setChartMode] = useState<ChartMode>('cab_fg_split');

  const selectedMonthMeta =
    MONTHS.find((m) => m.key === selectedMonth) || MONTHS[8];
  const peakMonthMeta =
    MONTHS.find((m) => m.key === activeTrend.peakMonth) || MONTHS[10];
  const lowMonthMeta =
    MONTHS.find((m) => m.key === activeTrend.lowMonth) || MONTHS[0];

  // Export 12-Month CSV
  const handleExportMonthlyCSV = () => {
    const headers = [
      'Line',
      'Sheet',
      'Category / Station',
      'Code / Desc',
      ...MONTHS.map((m) => `${m.cnName} (${m.shortThai})`),
      'AVG',
      'MIN',
      'MAX',
    ];

    const rows: (string | number)[][] = [];

    // 1. Model Volumes
    for (const m of models) {
      const mVols = MONTHS.map((mo) => linePlan.volumes[m.id]?.[mo.key] || 0);
      const sum = mVols.reduce((a, b) => a + b, 0);
      rows.push([
        activeLine,
        activeSheet,
        `Order Volume: ${m.name}`,
        m.thaiDesc,
        ...mVols,
        Math.round(sum / 12),
        Math.min(...mVols),
        Math.max(...mVols),
      ]);
    }

    // Total Volume Row
    const totVols = MONTHS.map((mo) => activeTrend.totalVolumeByMonth[mo.key]);
    rows.push([
      activeLine,
      activeSheet,
      'Total Monthly Volume (คัน)',
      'รวมยอดผลิต 7 รุ่น',
      ...totVols,
      Math.round(totVols.reduce((a, b) => a + b, 0) / 12),
      Math.min(...totVols),
      Math.max(...totVols),
    ]);

    // UPH Row
    const uphs = MONTHS.map((mo) => activeTrend.effectiveUphByMonth[mo.key]);
    rows.push([
      activeLine,
      activeSheet,
      'Effective UPH (คัน/ชม.)',
      useDynamicVolumeUph ? 'Dynamic Volume/Hrs' : 'Target UPH',
      ...uphs,
      Math.round(uphs.reduce((a, b) => a + b, 0) / 12),
      Math.min(...uphs),
      Math.max(...uphs),
    ]);

    // Station Rows
    for (const stRow of activeTrend.stationRows) {
      rows.push([
        stRow.station.area,
        stRow.station.subArea,
        stRow.station.name,
        stRow.station.thaiName,
        ...MONTHS.map((mo) => stRow.byMonth[mo.key].stdMP),
        stRow.avgMP,
        stRow.minMP,
        stRow.maxMP,
      ]);
    }

    // Total STD MP Row
    const totMPs = MONTHS.map((mo) => activeTrend.totalStdMPByMonth[mo.key]);
    rows.push([
      activeLine,
      activeSheet,
      'TOTAL STD MP (คน)',
      'อัตรากำลังคนมาตรฐานรวม',
      ...totMPs,
      activeTrend.yearlyAvgMP,
      activeTrend.yearlyMinMP,
      activeTrend.yearlyMaxMP,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLine}_${activeSheet}_12Month_MP_Trend.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================================================
  // SVG CHART GEOMETRY CALCULATIONS (12 MONTHS)
  // ==========================================================================
  const svgWidth = 960;
  const svgHeight = 320;
  const padLeft = 56;
  const padRight = 56;
  const padTop = 36;
  const padBottom = 48;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const getMonthX = (idx: number) =>
    padLeft + (idx / (MONTHS.length - 1)) * plotW;

  // Determine series based on chartMode
  const primaryMPSeries = MONTHS.map(
    (m) => activeTrend.totalStdMPByMonth[m.key]
  );
  const cabMPSeries = MONTHS.map((m) => activeTrend.cabStdMPByMonth[m.key]);
  const fgMPSeries = MONTHS.map((m) => activeTrend.fgStdMPByMonth[m.key]);

  const lineAMPSeries = MONTHS.map(
    (m) => lineATotalTrend.totalStdMPByMonth[m.key]
  );
  const lineBMPSeries = MONTHS.map(
    (m) => lineBTotalTrend.totalStdMPByMonth[m.key]
  );
  const factoryTotalMPSeries = MONTHS.map(
    (m, i) => lineAMPSeries[i] + lineBMPSeries[i]
  );

  const volumeSeries = MONTHS.map(
    (m) => activeTrend.totalVolumeByMonth[m.key]
  );

  // Compute Y scale for MP
  const allRelevantMPValues =
    chartMode === 'linea_vs_lineb'
      ? [...lineAMPSeries, ...lineBMPSeries, ...factoryTotalMPSeries]
      : chartMode === 'cab_fg_split'
      ? [...primaryMPSeries, ...cabMPSeries, ...fgMPSeries]
      : [...primaryMPSeries];

  const rawMaxMP = Math.max(...allRelevantMPValues, 50);
  const rawMinMP = Math.min(...allRelevantMPValues, 0);
  const yMaxMP = Math.ceil((rawMaxMP * 1.15) / 20) * 20;
  const yMinMP = Math.max(0, Math.floor((rawMinMP * 0.7) / 20) * 20);

  const getMPY = (val: number) => {
    const span = Math.max(1, yMaxMP - yMinMP);
    return padTop + plotH - ((val - yMinMP) / span) * plotH;
  };

  // Volume Y scale (for mp_vs_volume dual-axis mode)
  const maxVolume = Math.max(...volumeSeries, 10000);
  const yMaxVol = Math.ceil((maxVolume * 1.2) / 10000) * 10000;
  const getVolY = (vol: number) => {
    return padTop + plotH - (vol / Math.max(1, yMaxVol)) * plotH;
  };

  const buildPolyline = (values: number[], yFn: (v: number) => number) =>
    values.map((v, i) => `${getMonthX(i)},${yFn(v)}`).join(' ');

  const buildAreaPath = (values: number[], yFn: (v: number) => number) => {
    const pts = values.map((v, i) => `${getMonthX(i)},${yFn(v)}`).join(' L ');
    const firstX = getMonthX(0);
    const lastX = getMonthX(values.length - 1);
    const baseY = padTop + plotH;
    return `M ${firstX},${baseY} L ${pts} L ${lastX},${baseY} Z`;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round(yMinMP + t * (yMaxMP - yMinMP))
  );

  return (
    <div className="space-y-6">
      <PageLanguageSwitchBar pageLabel="กราฟแนวโน้ม MP 12 เดือน (12-Month MP Trend)" />
      {/* Top Control & Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-0.5 font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              Sheet กราฟแนวโน้ม 12 เดือน (1月–12月)
            </span>
            <span>·</span>
            <span className="font-semibold text-slate-800">
              สายการผลิต {activeLine} (
              {activeSheet === 'ALL'
                ? 'รวม CAB + FG'
                : `แผนก ${activeSheet}`}
              )
            </span>
            <span>·</span>
            <span className="text-blue-600 font-medium">
              คลิกจุดบนกราฟหรือแก้ไขตัวเลขในตารางทั้ง 12 เดือนได้ทันที
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
            กราฟวิเคราะห์แนวโน้มอัตรากำลังคนมาตรฐานรายเดือน (12-Month Standard MP Trend —{' '}
            {activeLine})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onSyncSeptemberFromWeekly}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            title="รวมยอดผลิตสัปดาห์ 1W+2W+3W+4W มาอัปเดตที่เดือนกันยายน (9月) อัตโนมัติ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ซิงค์เดือน ก.ย. (9月) จากตาราง 1W–4W</span>
          </button>

          <button
            onClick={handleExportMonthlyCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export 12 เดือน (CSV)</span>
          </button>

          <button
            onClick={onResetMonthlyPlan}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น 12 เดือน</span>
          </button>
        </div>
      </div>

      {/* 4 Annual KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>กำลังคนเฉลี่ยทั้งปี ({activeLine} · {activeSheet})</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-3xl font-bold text-slate-900">
              {activeTrend.yearlyAvgMP}
            </span>
            <span className="text-xs font-semibold text-slate-500">MP / เดือน</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>กรอบอัตรากำลังคนทั้งปี:</span>
            <span className="font-semibold text-slate-800">
              MIN {activeTrend.yearlyMinMP} – MAX {activeTrend.yearlyMaxMP} MP
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>เดือนที่ใช้ MP สูงสุด (Peak Season)</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-3xl font-bold text-amber-600">
                {activeTrend.totalStdMPByMonth[activeTrend.peakMonth]}
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-1.5">
                MP
              </span>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
              {peakMonthMeta.fullThai} ({peakMonthMeta.cnName})
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>ยอดผลิตเดือนพีค:</span>
            <span className="font-semibold text-slate-800">
              {activeTrend.totalVolumeByMonth[activeTrend.peakMonth].toLocaleString()} คัน (UPH{' '}
              {activeTrend.effectiveUphByMonth[activeTrend.peakMonth]})
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>เดือนที่ใช้ MP ต่ำสุด (Low Season)</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono tabular-nums">
            <div>
              <span className="text-3xl font-bold text-emerald-600">
                {activeTrend.totalStdMPByMonth[activeTrend.lowMonth]}
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-1.5">
                MP
              </span>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
              {lowMonthMeta.fullThai} ({lowMonthMeta.cnName})
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>ส่วนต่าง Peak - Low:</span>
            <span className="font-semibold text-slate-800">
              ±{activeTrend.yearlyMaxMP - activeTrend.yearlyMinMP} คน
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ยอดการผลิตรวมทั้งปี (12 เดือน — {activeLine})</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-3xl font-bold text-slate-900">
              {activeTrend.totalAnnualVolume.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500">คัน / ปี</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>เฉลี่ยต่อเดือน:</span>
            <span className="font-semibold text-slate-800">
              {Math.round(activeTrend.totalAnnualVolume / 12).toLocaleString()} คัน/เดือน
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive 12-Month Trend Chart Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                กราฟแนวโน้มกำลังคนมาตรฐาน (STD MP) รายเดือน ทั้ง 12 เดือน (ม.ค. – ธ.ค.)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกที่จุดเดือนใดก็ได้บนกราฟเพื่อดูการกระจายกำลังคนรายสถานีของเดือนนั้น · ปรับเปลี่ยนโหมดกราฟและสูตร UPH ได้ด้านขวา
            </p>
          </div>

          {/* Chart Mode & Calculation Mode Switchers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Chart Series Mode */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setChartMode('cab_fg_split')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                  chartMode === 'cab_fg_split'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แยกแผนก CAB vs FG ({activeLine})
              </button>
              <button
                onClick={() => setChartMode('linea_vs_lineb')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                  chartMode === 'linea_vs_lineb'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เปรียบเทียบ LineA vs LineB
              </button>
              <button
                onClick={() => setChartMode('mp_vs_volume')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                  chartMode === 'mp_vs_volume'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                MP คู่กับ ยอดผลิต (Volume)
              </button>
            </div>

            {/* UPH Calculation Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-blue-50/70 rounded-lg border border-blue-200 text-xs">
              <button
                onClick={() => onToggleDynamicUph(false)}
                className={`px-2.5 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                  !useDynamicVolumeUph
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-800 hover:bg-blue-100/60'
                }`}
                title="คำนวณ MP จากค่า UPH เป้าหมายของแต่ละเดือนที่ระบุด้านล่าง"
              >
                ใช้ UPH เป้าหมายรายเดือน
              </button>
              <button
                onClick={() => onToggleDynamicUph(true)}
                className={`px-2.5 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                  useDynamicVolumeUph
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-800 hover:bg-blue-100/60'
                }`}
                title="คำนวณ UPH อัตโนมัติจาก ยอดผลิตรายเดือน ÷ ชั่วโมงทำงานต่อเดือน"
              >
                คำนวณ UPH ตาม Volume ÷ ชม.ทำงาน
              </button>
            </div>
          </div>
        </div>

        {/* Legend Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-5">
            {chartMode === 'cab_fg_split' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-slate-900 inline-block" />
                  <span className="font-semibold text-slate-800">
                    กำลังคนที่เลือก ({activeLine} · {activeSheet === 'ALL' ? 'รวม CAB+FG' : activeSheet})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                  <span className="text-slate-600">{activeLine} — Sheet CAB (9 สถานี)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                  <span className="text-slate-600">{activeLine} — Sheet FG (7 สถานี)</span>
                </div>
              </>
            )}

            {chartMode === 'linea_vs_lineb' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-slate-900 inline-block" />
                  <span className="font-semibold text-slate-800">
                    รวมทั้งโรงงาน LineA + LineB (CAB+FG)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
                  <span className="text-slate-600">สายการผลิต LineA รวม (CAB+FG)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                  <span className="text-slate-600">สายการผลิต LineB รวม (CAB+FG)</span>
                </div>
              </>
            )}

            {chartMode === 'mp_vs_volume' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                  <span className="font-semibold text-slate-800">
                    เส้นอัตรากำลังคนมาตรฐาน STD MP ({activeLine} · {activeSheet})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-indigo-100 border border-indigo-400 inline-block" />
                  <span className="text-slate-600">
                    แท่งยอดการผลิตรายเดือน (Volume คัน/เดือน — แกนขวา)
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="font-mono text-xs text-slate-600">
            เดือนที่เลือกตรวจสอบ:{' '}
            <strong className="text-blue-700">
              {selectedMonthMeta.fullThai} ({selectedMonthMeta.cnName}) ={' '}
              {activeTrend.totalStdMPByMonth[selectedMonth]} MP
            </strong>
          </div>
        </div>

        {/* SVG 12-Month Trend Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[760px] h-auto select-none"
          >
            <defs>
              <linearGradient id="mpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Left Y-Axis Labels (MP) */}
            {yTicks.map((tickVal, idx) => {
              const y = getMPY(tickVal);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray={idx === 0 ? undefined : '4 4'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-500 font-mono text-[11px]"
                  >
                    {tickVal} MP
                  </text>
                  {chartMode === 'mp_vs_volume' && (
                    <text
                      x={svgWidth - padRight + 8}
                      y={y + 4}
                      textAnchor="start"
                      className="fill-indigo-500 font-mono text-[10px]"
                    >
                      {Math.round(((tickVal - yMinMP) / Math.max(1, yMaxMP - yMinMP)) * (yMaxVol / 1000))}k
                    </text>
                  )}
                </g>
              );
            })}

            {/* Selected Month Vertical Highlight Column */}
            {MONTHS.map((m, idx) => {
              const x = getMonthX(idx);
              const isSelected = m.key === selectedMonth;
              const isSep = m.key === 'M09';
              return (
                <g
                  key={m.key}
                  onClick={() => setSelectedMonth(m.key)}
                  className="cursor-pointer"
                >
                  {isSelected && (
                    <rect
                      x={x - 28}
                      y={padTop - 10}
                      width={56}
                      height={plotH + 18}
                      rx={8}
                      fill="#eff6ff"
                      stroke="#bfdbfe"
                      strokeWidth="1"
                    />
                  )}

                  {/* Volume Bars when in mp_vs_volume mode */}
                  {chartMode === 'mp_vs_volume' && (
                    <rect
                      x={x - 16}
                      y={getVolY(volumeSeries[idx])}
                      width={32}
                      height={padTop + plotH - getVolY(volumeSeries[idx])}
                      rx={4}
                      fill={isSelected ? '#c7d2fe' : '#e0e7ff'}
                      stroke={isSelected ? '#6366f1' : '#a5b4fc'}
                      strokeWidth="1"
                    />
                  )}

                  {/* X-Axis Month Label */}
                  <text
                    x={x}
                    y={svgHeight - 22}
                    textAnchor="middle"
                    className={`text-[11px] font-mono ${
                      isSelected
                        ? 'fill-blue-700 font-bold'
                        : isSep
                        ? 'fill-slate-900 font-semibold'
                        : 'fill-slate-600'
                    }`}
                  >
                    {m.shortThai}
                  </text>
                  <text
                    x={x}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    className="fill-slate-400 font-mono text-[10px]"
                  >
                    {m.cnName}
                  </text>
                </g>
              );
            })}

            {/* Area Fill under Primary Curve */}
            <path
              d={buildAreaPath(
                chartMode === 'linea_vs_lineb' ? factoryTotalMPSeries : primaryMPSeries,
                getMPY
              )}
              fill="url(#mpAreaGrad)"
            />

            {/* MODE 1: CAB vs FG vs Active Line */}
            {chartMode === 'cab_fg_split' && (
              <>
                {/* CAB Line */}
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeDasharray={activeSheet === 'CAB' ? undefined : '5 3'}
                  points={buildPolyline(cabMPSeries, getMPY)}
                />
                {/* FG Line */}
                <polyline
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.2"
                  strokeDasharray={activeSheet === 'FG' ? undefined : '5 3'}
                  points={buildPolyline(fgMPSeries, getMPY)}
                />
                {/* Active Selected Sheet Line (Bold) */}
                <polyline
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="3"
                  points={buildPolyline(primaryMPSeries, getMPY)}
                />

                {/* CAB & FG Nodes */}
                {MONTHS.map((m, i) => (
                  <g
                    key={m.key}
                    onClick={() => setSelectedMonth(m.key)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={getMonthX(i)}
                      cy={getMPY(cabMPSeries[i])}
                      r={3.5}
                      fill="#2563eb"
                    />
                    <circle
                      cx={getMonthX(i)}
                      cy={getMPY(fgMPSeries[i])}
                      r={3.5}
                      fill="#059669"
                    />
                    <circle
                      cx={getMonthX(i)}
                      cy={getMPY(primaryMPSeries[i])}
                      r={m.key === selectedMonth ? 6 : 4.5}
                      fill={m.key === selectedMonth ? '#2563eb' : '#0f172a'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={getMonthX(i)}
                      y={getMPY(primaryMPSeries[i]) - 10}
                      textAnchor="middle"
                      className={`font-mono text-[11px] ${
                        m.key === selectedMonth
                          ? 'fill-blue-700 font-bold'
                          : 'fill-slate-800 font-semibold'
                      }`}
                    >
                      {primaryMPSeries[i]}
                    </text>
                  </g>
                ))}
              </>
            )}

            {/* MODE 2: LineA vs LineB vs Factory Total */}
            {chartMode === 'linea_vs_lineb' && (
              <>
                <polyline
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  points={buildPolyline(lineAMPSeries, getMPY)}
                />
                <polyline
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  points={buildPolyline(lineBMPSeries, getMPY)}
                />
                <polyline
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="3"
                  points={buildPolyline(factoryTotalMPSeries, getMPY)}
                />

                {MONTHS.map((m, i) => (
                  <g
                    key={m.key}
                    onClick={() => setSelectedMonth(m.key)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={getMonthX(i)}
                      cy={getMPY(lineAMPSeries[i])}
                      r={4}
                      fill="#4f46e5"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={getMonthX(i)}
                      y={getMPY(lineAMPSeries[i]) - 8}
                      textAnchor="middle"
                      className="fill-indigo-700 font-mono text-[10px] font-semibold"
                    >
                      A:{lineAMPSeries[i]}
                    </text>

                    <circle
                      cx={getMonthX(i)}
                      cy={getMPY(lineBMPSeries[i])}
                      r={4}
                      fill="#0284c7"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={getMonthX(i)}
                      y={getMPY(lineBMPSeries[i]) + 14}
                      textAnchor="middle"
                      className="fill-sky-700 font-mono text-[10px] font-semibold"
                    >
                      B:{lineBMPSeries[i]}
                    </text>

                    <circle
                      cx={getMonthX(i)}
                      cy={getMPY(factoryTotalMPSeries[i])}
                      r={m.key === selectedMonth ? 6 : 4.5}
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={getMonthX(i)}
                      y={getMPY(factoryTotalMPSeries[i]) - 10}
                      textAnchor="middle"
                      className="fill-slate-900 font-mono text-[11px] font-bold"
                    >
                      {factoryTotalMPSeries[i]}
                    </text>
                  </g>
                ))}
              </>
            )}

            {/* MODE 3: MP Line + Volume Bars */}
            {chartMode === 'mp_vs_volume' && (
              <>
                <polyline
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="3"
                  points={buildPolyline(primaryMPSeries, getMPY)}
                />
                {MONTHS.map((m, i) => (
                  <g
                    key={m.key}
                    onClick={() => setSelectedMonth(m.key)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={getMonthX(i)}
                      cy={getMPY(primaryMPSeries[i])}
                      r={m.key === selectedMonth ? 6 : 4.5}
                      fill="#1d4ed8"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={getMonthX(i)}
                      y={getMPY(primaryMPSeries[i]) - 10}
                      textAnchor="middle"
                      className="fill-blue-800 font-mono text-[11px] font-bold"
                    >
                      {primaryMPSeries[i]} MP
                    </text>
                  </g>
                ))}
              </>
            )}
          </svg>
        </div>

        {/* 12-Month Quick Selector Pill Strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2 pt-2">
          {MONTHS.map((m) => {
            const isSelected = m.key === selectedMonth;
            const mpVal = activeTrend.totalStdMPByMonth[m.key];
            const volVal = activeTrend.totalVolumeByMonth[m.key];
            return (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(m.key)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer font-mono ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : m.key === 'M09'
                    ? 'bg-amber-50/70 text-slate-900 border-amber-300 hover:bg-amber-100/60'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold">{m.shortThai}</span>
                  <span className={isSelected ? 'text-blue-100' : 'text-slate-400'}>
                    {m.cnName}
                  </span>
                </div>
                <div className="text-base font-bold mt-1">{mpVal} MP</div>
                <div
                  className={`text-[10px] truncate ${
                    isSelected ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {(volVal / 1000).toFixed(1)}k คัน
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editable 12-Month Order Volume, UPH, and MP Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ตารางแผนยอดการผลิต (`订单量`) และตัวแปรคำนวณ MP ทั้ง 12 เดือน — {activeLine} (คลิกแก้ไขได้ทุกช่อง)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              พิมพ์แก้ไขยอดผลิตรายรุ่น, ยอดผลิตรวมรายเดือน, ค่า UPH หรือตัวเลข STD MP รายเดือนได้โดยตรง กราฟด้านบนจะอัปเดตทันที
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-mono">
              เดือน 9月 (ก.ย.) อ้างอิงยอดจากตาราง 1W–4W
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-mono">
                <th className="py-3 px-3 text-left font-semibold sticky left-0 bg-slate-900 z-10 min-w-[180px]">
                  รุ่นสินค้า / ตัวแปร ({activeLine})
                </th>
                {MONTHS.map((m) => (
                  <th
                    key={m.key}
                    onClick={() => setSelectedMonth(m.key)}
                    className={`py-2.5 px-2 text-center font-semibold min-w-[86px] cursor-pointer transition-colors ${
                      m.key === selectedMonth
                        ? 'bg-blue-700 text-amber-200'
                        : m.key === 'M09'
                        ? 'bg-slate-800 text-amber-300'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <div>{m.shortThai}</div>
                    <div className="text-[10px] opacity-75">{m.cnName}</div>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right font-semibold bg-slate-800 min-w-[90px]">
                  รวม/เฉลี่ยปี
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {/* 7 Model Volume Rows */}
              {models.map((model) => {
                const rowVols = MONTHS.map(
                  (m) => linePlan.volumes[model.id]?.[m.key] || 0
                );
                const annualModelSum = rowVols.reduce((a, b) => a + b, 0);
                return (
                  <tr key={model.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-sans sticky left-0 bg-white z-10 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: model.color }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 font-mono">
                            {model.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[145px]">
                            {model.thaiDesc}
                          </div>
                        </div>
                      </div>
                    </td>
                    {MONTHS.map((m) => {
                      const val = linePlan.volumes[model.id]?.[m.key] || 0;
                      const isSel = m.key === selectedMonth;
                      return (
                        <td
                          key={m.key}
                          className={`p-1.5 text-right ${
                            isSel ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <input
                            type="number"
                            min={0}
                            step={50}
                            value={val}
                            onChange={(e) =>
                              onUpdateMonthlyVolume(
                                activeLine,
                                model.id,
                                m.key,
                                Math.max(0, Number(e.target.value) || 0)
                              )
                            }
                            className="w-full text-right px-1.5 py-1 rounded border border-slate-200 bg-white hover:border-blue-400 focus:border-blue-600 focus:outline-none text-slate-800 font-mono text-xs"
                          />
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-bold text-slate-900 bg-slate-50">
                      {annualModelSum.toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {/* Total Monthly Volume Row (Editable to scale all models proportionally!) */}
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="py-2.5 px-3 font-sans sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                  <div>รวมยอดผลิตรายเดือน (คัน)</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    คลิกแก้เพื่อปรับสเกลทั้ง 7 รุ่นอัตโนมัติ
                  </div>
                </td>
                {MONTHS.map((m) => {
                  const totalVol = activeTrend.totalVolumeByMonth[m.key];
                  return (
                    <td key={m.key} className="p-1.5 text-right">
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={totalVol}
                        onChange={(e) =>
                          onScaleMonthTotalVolume(
                            activeLine,
                            m.key,
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className="w-full text-right px-1.5 py-1 rounded border border-slate-300 bg-white font-bold text-slate-900 hover:border-blue-500 focus:border-blue-600 focus:outline-none text-xs"
                      />
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-200/70">
                  {activeTrend.totalAnnualVolume.toLocaleString()}
                </td>
              </tr>

              {/* Editable Monthly UPH Row */}
              <tr className="bg-blue-50/40 text-slate-800">
                <td className="py-2 px-3 font-sans sticky left-0 bg-blue-50/90 z-10 border-r border-slate-200">
                  <div className="font-semibold text-blue-950">
                    ความเร็วสายการผลิต UPH (คัน/ชม.)
                  </div>
                  <div className="text-[10px] text-blue-700">
                    {useDynamicVolumeUph
                      ? 'คำนวณอัตโนมัติจาก Volume ÷ ชม.ทำงาน'
                      : 'แก้ไขค่า UPH รายเดือนได้โดยตรง'}
                  </div>
                </td>
                {MONTHS.map((m) => {
                  const effUph = activeTrend.effectiveUphByMonth[m.key];
                  return (
                    <td key={m.key} className="p-1.5 text-right">
                      {useDynamicVolumeUph ? (
                        <div className="px-2 py-1 font-bold text-blue-800">
                          {effUph}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          step={2}
                          value={linePlan.uphByMonth[m.key] || 140}
                          onChange={(e) =>
                            onUpdateMonthlyUph(
                              activeLine,
                              m.key,
                              Math.max(1, Number(e.target.value) || 140)
                            )
                          }
                          className="w-full text-right px-1.5 py-1 rounded border border-blue-200 bg-white font-semibold text-blue-900 hover:border-blue-500 focus:border-blue-600 focus:outline-none text-xs"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-right font-semibold text-blue-900 bg-blue-100/50">
                  เฉลี่ย{' '}
                  {Math.round(
                    MONTHS.reduce(
                      (acc, m) => acc + activeTrend.effectiveUphByMonth[m.key],
                      0
                    ) / 12
                  )}
                </td>
              </tr>

              {/* Editable Working Hours per Month Row */}
              <tr className="bg-slate-50/70 text-slate-700">
                <td className="py-2 px-3 font-sans sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  <div className="font-semibold text-slate-800">
                    ชั่วโมงเดินไลน์ต่อเดือน (ชม./เดือน)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ใช้คำนวณ Dynamic UPH & ชั่วโมงแรงงาน
                  </div>
                </td>
                {MONTHS.map((m) => (
                  <td key={m.key} className="p-1.5 text-right">
                    <input
                      type="number"
                      min={10}
                      step={8}
                      value={linePlan.workingHoursByMonth[m.key] || 359}
                      onChange={(e) =>
                        onUpdateMonthlyWorkingHours(
                          activeLine,
                          m.key,
                          Math.max(10, Number(e.target.value) || 350)
                        )
                      }
                      className="w-full text-right px-1.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:border-blue-400 focus:border-blue-600 focus:outline-none text-xs"
                    />
                  </td>
                ))}
                <td className="py-2 px-3 text-right font-semibold text-slate-700 bg-slate-100">
                  เฉลี่ย{' '}
                  {Math.round(
                    MONTHS.reduce(
                      (acc, m) => acc + activeTrend.workingHoursByMonth[m.key],
                      0
                    ) / 12
                  )}{' '}
                  ชม.
                </td>
              </tr>

              {/* Weighted Standard Time Summary Row */}
              <tr className="bg-slate-50 text-slate-700">
                <td className="py-2 px-3 font-sans sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  <div className="font-semibold text-slate-800">
                    เวลามาตรฐานถ่วงน้ำหนักรวม (加权工时)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    วินาทีรวมต่อเครื่อง ({activeSheet})
                  </div>
                </td>
                {MONTHS.map((m) => (
                  <td key={m.key} className="py-2 px-2.5 text-right font-semibold">
                    {Math.round(activeTrend.totalWeightedSTByMonth[m.key]).toLocaleString()}s
                  </td>
                ))}
                <td className="py-2 px-3 text-right font-semibold bg-slate-100">
                  {Math.round(
                    MONTHS.reduce(
                      (acc, m) => acc + activeTrend.totalWeightedSTByMonth[m.key],
                      0
                    ) / 12
                  ).toLocaleString()}
                  s
                </td>
              </tr>

              {/* Final STD MP Row (Editable Override) */}
              <tr className="bg-amber-50/90 font-bold text-slate-900 border-t-2 border-amber-300">
                <td className="py-2.5 px-3 font-sans sticky left-0 bg-amber-50 z-10 border-r border-amber-200">
                  <div className="text-amber-950">
                    อัตรากำลังคนรวม STD MP ({activeSheet})
                  </div>
                  <div className="text-[10px] font-normal text-amber-800">
                    คำนวณตามสูตร IE (คลิกเพื่อกำหนดค่าเองได้)
                  </div>
                </td>
                {MONTHS.map((m) => {
                  const mpVal = activeTrend.totalStdMPByMonth[m.key];
                  const hasManual =
                    linePlan.manualTotalMP?.[m.key] !== undefined &&
                    linePlan.manualTotalMP?.[m.key] !== null;
                  return (
                    <td key={m.key} className="p-1.5 text-right">
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          value={mpVal}
                          onChange={(e) =>
                            onUpdateManualMonthlyMP(
                              activeLine,
                              m.key,
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className={`w-full text-right px-1.5 py-1 rounded border font-bold text-xs focus:outline-none ${
                            hasManual
                              ? 'border-amber-500 bg-amber-100 text-amber-950'
                              : 'border-amber-300 bg-white text-slate-900 hover:border-amber-500'
                          }`}
                        />
                        {hasManual && (
                          <button
                            onClick={() =>
                              onUpdateManualMonthlyMP(activeLine, m.key, null)
                            }
                            title="คืนค่าตามสูตรคำนวณ IE"
                            className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center cursor-pointer"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-right font-bold text-amber-950 bg-amber-100/80">
                  เฉลี่ย {activeTrend.yearlyAvgMP} MP
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Station-by-Station 12-Month MP Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ตารางอัตรากำลังคนมาตรฐานรายสถานี (Station-by-Station 12-Month MP) — {activeLine} ({activeSheet})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงจำนวนคน `STD MP` ของแต่ละสถานีงานตั้งแต่ ม.ค. (1月) ถึง ธ.ค. (12月) พร้อมค่าเฉลี่ย (AVG), ต่ำสุด (MIN), สูงสุด (MAX)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectLineAndSheet(activeLine, 'CAB')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                activeSheet === 'CAB'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Sheet CAB
            </button>
            <button
              onClick={() => onSelectLineAndSheet(activeLine, 'FG')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                activeSheet === 'FG'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Sheet FG
            </button>
            <button
              onClick={() => onSelectLineAndSheet(activeLine, 'ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                activeSheet === 'ALL'
                  ? 'bg-slate-900 text-amber-300 border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              รวม CAB + FG
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-mono">
                <th className="py-2.5 px-3 text-left font-semibold sticky left-0 bg-slate-100 z-10 min-w-[200px]">
                  สถานีงาน (线段 / Station)
                </th>
                <th className="py-2.5 px-2 text-center font-semibold">แผนก</th>
                <th className="py-2.5 px-2 text-center font-semibold">Eff (η)</th>
                {MONTHS.map((m) => (
                  <th
                    key={m.key}
                    onClick={() => setSelectedMonth(m.key)}
                    className={`py-2.5 px-2 text-right font-semibold cursor-pointer ${
                      m.key === selectedMonth
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-slate-200/60'
                    }`}
                  >
                    {m.shortThai}
                  </th>
                ))}
                <th className="py-2.5 px-2.5 text-right font-bold bg-slate-200/70">
                  AVG
                </th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-emerald-50 text-emerald-800">
                  MIN
                </th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-amber-50 text-amber-800">
                  MAX
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {activeTrend.stationRows.map((row) => (
                <tr key={row.station.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-sans sticky left-0 bg-white z-10 border-r border-slate-200">
                    <div className="font-bold text-slate-900 font-mono">
                      {row.station.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                      {row.station.thaiName}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        row.station.subArea === 'FG'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {row.station.subArea}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      step={1}
                      value={Math.round(row.station.efficiency * 100)}
                      onChange={(e) =>
                        onUpdateStationField(row.station.id, {
                          efficiency: Math.max(
                            0.1,
                            Math.min(1, (Number(e.target.value) || 80) / 100)
                          ),
                        })
                      }
                      className="w-12 text-center py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-white focus:border-blue-600 focus:outline-none text-[11px]"
                    />
                    <span className="text-[10px] text-slate-400 ml-0.5">%</span>
                  </td>
                  {MONTHS.map((m) => {
                    const cell = row.byMonth[m.key];
                    const isPeak = cell.stdMP === row.maxMP && row.maxMP > row.minMP;
                    const isSel = m.key === selectedMonth;
                    return (
                      <td
                        key={m.key}
                        className={`py-2 px-2 text-right ${
                          isSel
                            ? 'bg-blue-50/70 font-bold text-blue-900'
                            : isPeak
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-800'
                        }`}
                        title={`${row.station.name} (${m.fullThai}): Exact ${cell.exactMP.toFixed(
                          2
                        )} MP | เวลาถ่วงน้ำหนัก ${Math.round(cell.weightedST)}s`}
                      >
                        {cell.stdMP}
                      </td>
                    );
                  })}
                  <td className="py-2 px-2.5 text-right font-bold bg-slate-100 text-slate-900">
                    {row.avgMP}
                  </td>
                  <td className="py-2 px-2.5 text-right font-semibold bg-emerald-50/50 text-emerald-800">
                    {row.minMP}
                  </td>
                  <td className="py-2 px-2.5 text-right font-semibold bg-amber-50/50 text-amber-800">
                    {row.maxMP}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-mono font-bold">
                <td
                  colSpan={3}
                  className="py-3 px-3 font-sans sticky left-0 bg-slate-900 z-10"
                >
                  รวมอัตรากำลังคนมาตรฐาน ({activeLine} · {activeSheet})
                </td>
                {MONTHS.map((m) => (
                  <td
                    key={m.key}
                    className={`py-3 px-2 text-right ${
                      m.key === selectedMonth ? 'text-amber-300 underline' : ''
                    }`}
                  >
                    {activeTrend.totalStdMPByMonth[m.key]}
                  </td>
                ))}
                <td className="py-3 px-2.5 text-right text-amber-300 bg-slate-800">
                  {activeTrend.yearlyAvgMP}
                </td>
                <td className="py-3 px-2.5 text-right text-emerald-300 bg-slate-800">
                  {activeTrend.yearlyMinMP}
                </td>
                <td className="py-3 px-2.5 text-right text-amber-300 bg-slate-800">
                  {activeTrend.yearlyMaxMP}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
