import React, { useState, useMemo } from 'react';
import {
  WEEKS,
  WeekKey,
  LineKey,
  SheetKey,
  ModelSeries,
  ModelMetadata,
  StationConfig,
  WeeklySummaryMetrics,
} from '../data/mpModelData';
import {
  Scale,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  Users,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageLanguageSwitchBar, useAppPreferences } from '../context/AppPreferencesContext';

interface LineComparisonSheetViewProps {
  models: ModelMetadata[];
  stations: StationConfig[];
  lineAStations: StationConfig[];
  lineBStations: StationConfig[];
  volumesByLine: Record<LineKey, Record<ModelSeries, Record<WeekKey, number>>>;
  lineACabMetrics: WeeklySummaryMetrics;
  lineAFgMetrics: WeeklySummaryMetrics;
  lineATotalMetrics: WeeklySummaryMetrics;
  lineBCabMetrics: WeeklySummaryMetrics;
  lineBFgMetrics: WeeklySummaryMetrics;
  lineBTotalMetrics: WeeklySummaryMetrics;
  selectedWeek: WeekKey;
  onSelectWeek: (w: WeekKey) => void;
  onNavigateToLine: (line: LineKey, sheet?: SheetKey) => void;
  onUpdateStandardTime: (stationId: string, model: ModelSeries, newTime: number) => void;
  onUpdateStationField: (stationId: string, patch: Partial<StationConfig>) => void;
}

export const LineComparisonSheetView: React.FC<LineComparisonSheetViewProps> = ({
  models,
  lineAStations,
  lineBStations,
  volumesByLine,
  lineACabMetrics,
  lineAFgMetrics,
  lineATotalMetrics,
  lineBCabMetrics,
  lineBFgMetrics,
  lineBTotalMetrics,
  selectedWeek,
  onSelectWeek,
  onNavigateToLine,
  onUpdateStandardTime,
  onUpdateStationField,
}) => {
  const { t, localizeStationDesc, localizeModelDesc } = useAppPreferences();
  const [selectedSubArea, setSelectedSubArea] = useState<SheetKey>('ALL');
  const [expandedStationCode, setExpandedStationCode] = useState<string | null>(null);

  // Active Metrics for Line A and Line B based on Department Filter
  const activeLineAMetrics = useMemo(() => {
    if (selectedSubArea === 'CAB') return lineACabMetrics;
    if (selectedSubArea === 'FG') return lineAFgMetrics;
    return lineATotalMetrics;
  }, [selectedSubArea, lineACabMetrics, lineAFgMetrics, lineATotalMetrics]);

  const activeLineBMetrics = useMemo(() => {
    if (selectedSubArea === 'CAB') return lineBCabMetrics;
    if (selectedSubArea === 'FG') return lineBFgMetrics;
    return lineBTotalMetrics;
  }, [selectedSubArea, lineBCabMetrics, lineBFgMetrics, lineBTotalMetrics]);

  // Filtered Stations for Line A and Line B
  const activeStationsA = useMemo(() => {
    if (selectedSubArea === 'CAB') return lineAStations.filter((s) => s.subArea === 'CAB');
    if (selectedSubArea === 'FG') return lineAStations.filter((s) => s.subArea === 'FG');
    return lineAStations;
  }, [selectedSubArea, lineAStations]);

  const activeStationsB = useMemo(() => {
    if (selectedSubArea === 'CAB') return lineBStations.filter((s) => s.subArea === 'CAB');
    if (selectedSubArea === 'FG') return lineBStations.filter((s) => s.subArea === 'FG');
    return lineBStations;
  }, [selectedSubArea, lineBStations]);

  // Model-by-Model Total Standard Time & MP Variance Analysis
  const modelComparisonRows = useMemo(() => {
    return models.map((m) => {
      // Line A total ST for this model in active department
      let lineATotalST = 0;
      for (const st of activeStationsA) {
        lineATotalST += st.standardTimes[m.id] || 0;
      }

      // Line B total ST for this model in active department
      let lineBTotalST = 0;
      for (const st of activeStationsB) {
        lineBTotalST += st.standardTimes[m.id] || 0;
      }

      const stDelta = lineATotalST - lineBTotalST;
      const stDeltaPct = lineBTotalST > 0 ? (stDelta / lineBTotalST) * 100 : 0;

      const volA = volumesByLine.LineA[m.id]?.[selectedWeek] || 0;
      const volB = volumesByLine.LineB[m.id]?.[selectedWeek] || 0;

      // MP Contribution approx at 140 UPH and 80% eff
      const mpRateA = (lineATotalST * 140) / (3600 * 0.8);
      const mpRateB = (lineBTotalST * 140) / (3600 * 0.8);

      return {
        model: m,
        lineATotalST,
        lineBTotalST,
        stDelta,
        stDeltaPct,
        volA,
        volB,
        mpRateA,
        mpRateB,
      };
    });
  }, [models, activeStationsA, activeStationsB, volumesByLine, selectedWeek]);

  // Total Summary Metrics
  const lineAMP = activeLineAMetrics.totalStdMP[selectedWeek];
  const lineBMP = activeLineBMetrics.totalStdMP[selectedWeek];
  const mpDelta = lineAMP - lineBMP;

  const lineAVol = activeLineAMetrics.totalVolume[selectedWeek];
  const lineBVol = activeLineBMetrics.totalVolume[selectedWeek];

  const lineAWeightedST = activeLineAMetrics.totalWeightedST[selectedWeek];
  const lineBWeightedST = activeLineBMetrics.totalWeightedST[selectedWeek];
  const weightedSTDelta = lineAWeightedST - lineBWeightedST;

  // Station Pair Mapping between Line A and Line B (matching by station name/subArea)
  const stationPairs = useMemo(() => {
    return activeStationsB.map((stB, idx) => {
      // Find matching Line A station by name or index
      const stA = activeStationsA.find((s) => s.name === stB.name && s.subArea === stB.subArea) || activeStationsA[idx];
      const rowA = activeLineAMetrics.stationRows.find((r) => r.station.id === stA?.id);
      const rowB = activeLineBMetrics.stationRows.find((r) => r.station.id === stB.id);

      const mpA = rowA?.byWeek[selectedWeek]?.stdMP ?? 0;
      const mpB = rowB?.byWeek[selectedWeek]?.stdMP ?? 0;
      const stDeltaMP = mpA - mpB;

      const wstA = rowA?.byWeek[selectedWeek]?.weightedST ?? 0;
      const wstB = rowB?.byWeek[selectedWeek]?.weightedST ?? 0;

      return {
        key: `${stB.subArea}_${stB.name}`,
        subArea: stB.subArea,
        name: stB.name,
        thaiName: stB.thaiName,
        stationA: stA,
        stationB: stB,
        rowA,
        rowB,
        mpA,
        mpB,
        stDeltaMP,
        wstA,
        wstB,
      };
    });
  }, [activeStationsB, activeStationsA, activeLineAMetrics, activeLineBMetrics, selectedWeek]);

  const handleExportComparisonCSV = () => {
    const headers = [
      'Department',
      'Station Name',
      'Thai Description',
      `LineA ST (sec)`,
      `LineB ST (sec)`,
      `LineA Weighted ST (${selectedWeek})`,
      `LineB Weighted ST (${selectedWeek})`,
      `LineA STD MP (${selectedWeek})`,
      `LineB STD MP (${selectedWeek})`,
      `MP Delta (LineA - LineB)`,
    ];

    const rows = stationPairs.map((pair) => [
      pair.subArea,
      `"${pair.name}"`,
      `"${pair.thaiName}"`,
      pair.stationA ? Object.values(pair.stationA.standardTimes).reduce((a, b) => a + b, 0).toFixed(1) : '-',
      Object.values(pair.stationB.standardTimes).reduce((a, b) => a + b, 0).toFixed(1),
      Math.round(pair.wstA),
      Math.round(pair.wstB),
      pair.mpA,
      pair.mpB,
      pair.stDeltaMP,
    ]);

    rows.push([
      selectedSubArea,
      'TOTAL',
      'รวมทั้งสิ้น',
      '-',
      '-',
      Math.round(lineAWeightedST),
      Math.round(lineBWeightedST),
      lineAMP,
      lineBMP,
      mpDelta,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LineA_vs_LineB_Comparison_${selectedSubArea}_${selectedWeek}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageLanguageSwitchBar pageLabel="Sheet เปรียบเทียบ Line A vs Line B (ST & MP Comparison)" />

      {/* Top Header & Context Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 font-bold bg-indigo-600 text-white rounded-md">
              {t('Sheet เปรียบเทียบ Line A vs Line B', 'Line A 与 Line B 对比测算表', 'Line A vs Line B Comparison Sheet')}
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-slate-800">
              {t(
                'แยกเวลามาตรฐานรายรุ่น & กำลังคนที่ใช้จริง',
                '独立各机型标准工时与各线实际定编',
                'Independent Model ST & Line Manpower Allocation'
              )}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-blue-700 font-medium">
              {t(
                'เวลามาตรฐานแต่ละรุ่นไม่เท่ากัน จึงต้องใช้กำลังคนแตกต่างกัน',
                '各机型在两条产线的标准工时不同，因此配置定编人数存在差异',
                'Each model standard time varies, resulting in different manpower requirements'
              )}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1.5 tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>
              {t(
                'ระบบวิเคราะห์แยกไลน์ Line A และ Line B (เปรียบเทียบเวลามาตรฐานรายรุ่น & อัตรากำลังคน MP)',
                'Line A 与 Line B 独立分线定编测算与工时差异对比系统',
                'Line A vs Line B Independent Standard Time & Manpower Analysis System'
              )}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-2">
              {t('สัปดาห์:', '周次:', 'Week:')}
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

          {/* Department Filter (CAB / FG / ALL) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedSubArea('CAB')}
              className={`px-3 py-1.5 font-bold rounded-md transition-colors cursor-pointer ${
                selectedSubArea === 'CAB'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sheet CAB
            </button>
            <button
              onClick={() => setSelectedSubArea('FG')}
              className={`px-3 py-1.5 font-bold rounded-md transition-colors cursor-pointer ${
                selectedSubArea === 'FG'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sheet FG
            </button>
            <button
              onClick={() => setSelectedSubArea('ALL')}
              className={`px-3 py-1.5 font-bold rounded-md transition-colors cursor-pointer ${
                selectedSubArea === 'ALL'
                  ? 'bg-slate-900 text-amber-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('รวม CAB + FG', '合计 CAB + FG', 'Combined CAB + FG')}
            </button>
          </div>

          <button
            onClick={handleExportComparisonCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('Export เปรียบเทียบ (CSV)', '导出对比表 (CSV)', 'Export Comparison (CSV)')}</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Comparison Cards (Line A vs Line B) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Manpower Comparison */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {t('1. กำลังคนมาตรฐาน (Line A vs Line B)', '1. 标准定编人数 (Line A vs Line B)', '1. Standard Manpower (Line A vs Line B)')}
            </span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono tabular-nums">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-indigo-700">
                Line A: <strong className="text-2xl font-bold">{lineAMP}</strong> MP
              </div>
              <div className="text-sm font-semibold text-blue-700">
                Line B: <strong className="text-2xl font-bold">{lineBMP}</strong> MP
              </div>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                mpDelta > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : mpDelta < 0
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {mpDelta > 0 ? `Line A +${mpDelta} MP` : mpDelta < 0 ? `Line B +${Math.abs(mpDelta)} MP` : 'เท่ากัน (0)'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>{t('รวมทั้ง 2 ไลน์ (A+B):', '两线合计定编 (A+B):', 'Total Both Lines (A+B):')}</span>
            <span className="font-bold text-slate-900">{lineAMP + lineBMP} MP</span>
          </div>
        </div>

        {/* Card 2: Weighted Standard Time Comparison */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {t('2. เวลาถ่วงน้ำหนักรวม (Weighted ST)', '2. 加权标准工时 (Weighted ST)', '2. Total Weighted ST')}
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono tabular-nums">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-indigo-700">
                Line A: <strong className="text-2xl font-bold">{Math.round(lineAWeightedST)}</strong>s
              </div>
              <div className="text-sm font-semibold text-blue-700">
                Line B: <strong className="text-2xl font-bold">{Math.round(lineBWeightedST)}</strong>s
              </div>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                weightedSTDelta > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : weightedSTDelta < 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {weightedSTDelta > 0 ? `A มากกว่า +${Math.round(weightedSTDelta)}s` : weightedSTDelta < 0 ? `B มากกว่า +${Math.abs(Math.round(weightedSTDelta))}s` : 'เท่ากัน'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>{t('เฉลี่ยต่อเครื่อง (นาที):', '单台平均工时 (分钟):', 'Average Time (min):')}</span>
            <span className="font-bold text-slate-900">
              A: {(lineAWeightedST / 60).toFixed(1)}m · B: {(lineBWeightedST / 60).toFixed(1)}m
            </span>
          </div>
        </div>

        {/* Card 3: Order Volume Comparison */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {t('3. ยอดคำสั่งผลิต (Volume Units)', '3. 周订单排产量 (Volume Units)', '3. Order Volume Units')}
            </span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono tabular-nums">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-indigo-700">
                Line A: <strong className="text-2xl font-bold">{lineAVol.toLocaleString()}</strong>
              </div>
              <div className="text-sm font-semibold text-blue-700">
                Line B: <strong className="text-2xl font-bold">{lineBVol.toLocaleString()}</strong>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-800 rounded-md">
              {lineAVol - lineBVol >= 0 ? `A +${(lineAVol - lineBVol).toLocaleString()}` : `B +${(lineBVol - lineAVol).toLocaleString()}`}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>{t('รวมผลผลิตทั้งโรงงาน:', '全厂当周总产量:', 'Factory Weekly Volume:')}</span>
            <span className="font-bold text-slate-900">{(lineAVol + lineBVol).toLocaleString()} {t('คัน', '台', 'units')}</span>
          </div>
        </div>

        {/* Card 4: Quick Sheet Navigation Jump Buttons */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold">{t('4. สลับดู Sheet เฉพาะแต่ละไลน์', '4. 快速前往单线专用表', '4. Switch to Single Line Sheet')}</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 space-y-2">
            <button
              onClick={() => onNavigateToLine('LineA', selectedSubArea)}
              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>{t('👉 เปิด Sheet Line A (มาตรฐานเฉพาะ A)', '👉 打开 Line A 专用工作表', '👉 Open Line A Sheet')}</span>
              <span className="font-mono text-amber-300">{lineAMP} MP</span>
            </button>
            <button
              onClick={() => onNavigateToLine('LineB', selectedSubArea)}
              className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>{t('👉 เปิด Sheet Line B (มาตรฐานเฉพาะ B)', '👉 打开 Line B 专用工作表', '👉 Open Line B Sheet')}</span>
              <span className="font-mono text-amber-300">{lineBMP} MP</span>
            </button>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 text-center">
            {t('สามารถแก้ไขเวลามาตรฐานแยกอิสระในแต่ละ Sheet ได้ทันที', '可在各线工作表中独立修改标准工时，互不干扰', 'Can edit standard times independently in each sheet')}
          </div>
        </div>
      </div>

      {/* Model-by-Model Standard Time & Manpower Variance Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>
                {t(
                  'ตารางเปรียบเทียบเวลามาตรฐานรายรุ่น (Standard Time per Model) ระหว่าง Line A vs Line B',
                  '各机型单台标准工时对比表 (Line A vs Line B)',
                  'Model Standard Time Comparison Matrix (Line A vs Line B)'
                )}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'แสดงเวลามาตรฐานรวมต่อเครื่องของแต่ละรุ่น, ส่วนต่างเวลา (Delta ST), และผลกระทบต่ออัตราการใช้กำลังคน',
                '展示 7 款机型在两条产线的单台总标准工时、工时差异 (秒与百分比) 以及对定编的影响',
                'Shows total standard time per unit by model, cycle variance (sec & %), and manpower rate'
              )}
            </p>
          </div>
          <div className="text-xs font-mono text-slate-600">
            {t('แผนกที่แสดง:', '当前部门:', 'Department:')}{' '}
            <strong className="text-indigo-700">
              {selectedSubArea === 'ALL' ? 'CAB + FG' : selectedSubArea}
            </strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-mono">
                <th className="py-2.5 px-3 text-left font-semibold">{t('รุ่นตู้เย็น (Model)', '机型 (Model)', 'Model')}</th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-indigo-900 bg-indigo-50/60">
                  {t('Line A เวลามาตรฐาน (s)', 'Line A 标准工时 (秒)', 'Line A Std Time (s)')}
                </th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-blue-900 bg-blue-50/60">
                  {t('Line B เวลามาตรฐาน (s)', 'Line B 标准工时 (秒)', 'Line B Std Time (s)')}
                </th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-amber-50/70 text-amber-900">
                  {t('ส่วนต่างเวลา (A - B)', '工时差值 (A - B)', 'ST Delta (A - B)')}
                </th>
                <th className="py-2.5 px-2 text-right font-semibold text-indigo-700">
                  {t('Line A ยอดผลิต', 'Line A 产量', 'Line A Vol')}
                </th>
                <th className="py-2.5 px-2 text-right font-semibold text-blue-700">
                  {t('Line B ยอดผลิต', 'Line B 产量', 'Line B Vol')}
                </th>
                <th className="py-2.5 px-3 text-left font-semibold">
                  {t('ลักษณะกระบวนการ / เหตุผลความแตกต่าง', '产线特征与工艺差异说明', 'Process Note / Line Characteristic')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {modelComparisonRows.map((r) => {
                const isADifferent = Math.abs(r.stDelta) > 0.1;
                return (
                  <tr key={r.model.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: r.model.color }} />
                        <div>
                          <div className="font-bold text-slate-900 font-mono">{r.model.name}</div>
                          <div className="text-[10px] text-slate-500">{localizeModelDesc(r.model.id, r.model.thaiDesc)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-indigo-700 bg-indigo-50/30">
                      {r.lineATotalST.toFixed(1)}s
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({(r.lineATotalST / 60).toFixed(1)}m)
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-blue-700 bg-blue-50/30">
                      {r.lineBTotalST.toFixed(1)}s
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({(r.lineBTotalST / 60).toFixed(1)}m)
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold bg-amber-50/40">
                      {isADifferent ? (
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${
                            r.stDelta > 0
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {r.stDelta > 0 ? `+${r.stDelta.toFixed(1)}s` : `${r.stDelta.toFixed(1)}s`} (
                          {r.stDeltaPct >= 0 ? `+${r.stDeltaPct.toFixed(1)}%` : `${r.stDeltaPct.toFixed(1)}%`})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0.0s (0%)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-slate-800">
                      {r.volA.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-slate-800">
                      {r.volB.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-xs text-slate-600">
                      {r.stDelta < -50
                        ? t('Line A เร็วกว่า (ใช้ระบบดัดพับและโฟมอัตโนมัติ)', 'Line A 更快 (采用自动化辊轧与发泡夹具)', 'Line A faster (Automated rolling & foam fixtures)')
                        : r.stDelta > 50
                        ? t('Line A ใช้เวลามากกว่า (มีจุดตรวจและติดตั้งเสริม)', 'Line A 工时较多 (配备加强型检验与装配工步)', 'Line A has more ST (Additional inspection/assembly steps)')
                        : t('ใกล้เคียงกันตามมาตรฐานโรงงาน', '两线工艺工时基本接近', 'Comparable between lines')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-mono font-bold">
                <td className="py-3 px-3 font-sans">{t('รวมเวลาเฉลี่ยและยอดผลิต', '合计工时与周产量', 'Total ST & Weekly Volume')}</td>
                <td className="py-3 px-2.5 text-right text-indigo-300">
                  {modelComparisonRows.reduce((a, b) => a + b.lineATotalST, 0).toFixed(1)}s
                </td>
                <td className="py-3 px-2.5 text-right text-blue-300">
                  {modelComparisonRows.reduce((a, b) => a + b.lineBTotalST, 0).toFixed(1)}s
                </td>
                <td className="py-3 px-2.5 text-right text-amber-300">
                  {(
                    modelComparisonRows.reduce((a, b) => a + b.lineATotalST, 0) -
                    modelComparisonRows.reduce((a, b) => a + b.lineBTotalST, 0)
                  ).toFixed(1)}s
                </td>
                <td className="py-3 px-2 text-right text-indigo-300">{lineAVol.toLocaleString()}</td>
                <td className="py-3 px-2 text-right text-blue-300">{lineBVol.toLocaleString()}</td>
                <td className="py-3 px-3 font-sans text-amber-300">
                  {t('Line A และ Line B ใช้กำลังคนแยกกันโดยสิ้นเชิง', 'Line A 与 Line B 定编人数完全独立核算', 'Line A and Line B use independent manpower allocation')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Station-by-Station Side-by-Side Detailed Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>
                {t(
                  'ตารางเปรียบเทียบรายสถานีงาน (Station-by-Station Comparison Table) Line A vs Line B',
                  '各工段定编与工时明细对照表 (Line A vs Line B)',
                  'Station-by-Station Detailed Comparison Table (Line A vs Line B)'
                )}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'คลิกที่แถวสถานีเพื่อคลี่ดู/แก้ไขเวลามาตรฐานรายรุ่นของทั้ง Line A และ Line B พร้อมกัน',
                '点击任意工段行可展开同时对比并编辑 Line A 与 Line B 该工段各机型标准工时',
                'Click any station row to expand and edit model standard times for both Line A and Line B'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
              Line A = {lineAMP} MP
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
              Line B = {lineBMP} MP
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-mono">
                <th className="py-2.5 px-3 text-left font-semibold">{t('สถานีงาน (Station)', '工段名称 (Station)', 'Station')}</th>
                <th className="py-2.5 px-2 text-center font-semibold">{t('แผนก', '部门', 'Dept')}</th>
                <th className="py-2.5 px-2 text-right font-semibold text-indigo-900 bg-indigo-50/60">
                  Line A 加权 (s)
                </th>
                <th className="py-2.5 px-2 text-right font-bold text-indigo-900 bg-indigo-50/60">
                  Line A 定编 (MP)
                </th>
                <th className="py-2.5 px-2 text-right font-semibold text-blue-900 bg-blue-50/60">
                  Line B 加权 (s)
                </th>
                <th className="py-2.5 px-2 text-right font-bold text-blue-900 bg-blue-50/60">
                  Line B 定编 (MP)
                </th>
                <th className="py-2.5 px-2.5 text-right font-bold bg-amber-50 text-amber-900">
                  {t('ส่วนต่าง (±MP)', '定编差值 (±MP)', 'MP Delta')}
                </th>
                <th className="py-2.5 px-3 text-center font-semibold">{t('การวิเคราะห์กำลังคน', '定编分析', 'Analysis')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {stationPairs.map((pair) => {
                const isExpanded = expandedStationCode === pair.key;
                const delta = pair.stDeltaMP;

                return (
                  <React.Fragment key={pair.key}>
                    <tr
                      onClick={() => setExpandedStationCode(isExpanded ? null : pair.key)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 font-mono">{pair.name}</div>
                            <div className="text-[10px] text-slate-500">{localizeStationDesc(pair.name, pair.thaiName)}</div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            pair.subArea === 'FG'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {pair.subArea}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-indigo-700 bg-indigo-50/20">
                        {Math.round(pair.wstA)}s
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-sm text-indigo-900 bg-indigo-50/40">
                        {pair.mpA} MP
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-blue-700 bg-blue-50/20">
                        {Math.round(pair.wstB)}s
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-sm text-blue-900 bg-blue-50/40">
                        {pair.mpB} MP
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold bg-amber-50/40">
                        {delta !== 0 ? (
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${
                              delta > 0
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {delta > 0 ? `+${delta} MP` : `${delta} MP`}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-center">
                        {delta > 0 ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                            {t('Line A ใช้คนมากกว่า', 'Line A 人数较多', 'Line A uses more MP')}
                          </span>
                        ) : delta < 0 ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            {t('Line B ใช้คนมากกว่า', 'Line B 人数较多', 'Line B uses more MP')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                            {t('ใช้คนเท่ากัน', '两线人数相同', 'Equal MP')}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Model Standard Time Inline Comparison Matrix */}
                    {isExpanded && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={8} className="p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span>
                              {t('เปรียบเทียบเวลามาตรฐานรายรุ่น (วินาที) ของสถานี:', '该工段各机型标准工时对比 (秒):', 'Model ST Comparison for station:')}{' '}
                              <strong className="text-indigo-700 font-mono">{pair.name}</strong>
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal">
                              {t('แก้ไขตัวเลขในช่องเพื่ออัปเดต Line A หรือ Line B ได้ทันที', '可直接在输入框中修改数值并即时生效', 'Edit values to update Line A or Line B immediately')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                            {models.map((m) => {
                              const stA = pair.stationA?.standardTimes[m.id] ?? 0;
                              const stB = pair.stationB?.standardTimes[m.id] ?? 0;
                              const diff = stA - stB;

                              return (
                                <div key={m.id} className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5 shadow-2xs">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-900 font-mono">
                                    <span>{m.name}</span>
                                    {Math.abs(diff) > 0.1 && (
                                      <span
                                        className={`text-[10px] px-1 rounded ${
                                          diff > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {diff > 0 ? `+${diff.toFixed(1)}s` : `${diff.toFixed(1)}s`}
                                      </span>
                                    )}
                                  </div>

                                  {/* Line A ST Input */}
                                  <div className="space-y-0.5">
                                    <div className="text-[10px] text-indigo-700 font-semibold flex items-center justify-between">
                                      <span>Line A (s):</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min={0}
                                      value={stA}
                                      onChange={(e) => {
                                        if (pair.stationA) {
                                          onUpdateStandardTime(
                                            pair.stationA.id,
                                            m.id,
                                            Math.max(0, parseFloat(e.target.value) || 0)
                                          );
                                        }
                                      }}
                                      className="w-full px-1.5 py-0.5 text-right font-mono text-xs bg-indigo-50/40 border border-indigo-200 rounded focus:border-indigo-600 focus:outline-none"
                                    />
                                  </div>

                                  {/* Line B ST Input */}
                                  <div className="space-y-0.5">
                                    <div className="text-[10px] text-blue-700 font-semibold flex items-center justify-between">
                                      <span>Line B (s):</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min={0}
                                      value={stB}
                                      onChange={(e) => {
                                        if (pair.stationB) {
                                          onUpdateStandardTime(
                                            pair.stationB.id,
                                            m.id,
                                            Math.max(0, parseFloat(e.target.value) || 0)
                                          );
                                        }
                                      }}
                                      className="w-full px-1.5 py-0.5 text-right font-mono text-xs bg-blue-50/40 border border-blue-200 rounded focus:border-blue-600 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              );
                            })}
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
                  {t('รวมทั้งหมด (Line A vs Line B)', '合计对比 (Line A vs Line B)', 'Total Comparison (Line A vs Line B)')}
                </td>
                <td className="py-3 px-2 text-right text-indigo-300">
                  {Math.round(lineAWeightedST)}s
                </td>
                <td className="py-3 px-2 text-right text-indigo-300 text-sm">
                  {lineAMP} MP
                </td>
                <td className="py-3 px-2 text-right text-blue-300">
                  {Math.round(lineBWeightedST)}s
                </td>
                <td className="py-3 px-2 text-right text-blue-300 text-sm">
                  {lineBMP} MP
                </td>
                <td className="py-3 px-2.5 text-right text-amber-300 text-sm">
                  {mpDelta > 0 ? `+${mpDelta} MP` : `${mpDelta} MP`}
                </td>
                <td className="py-3 px-3 font-sans text-center text-amber-300">
                  {mpDelta !== 0
                    ? t(`ส่วนต่างรวม ${Math.abs(mpDelta)} คน`, `全线总定编差 ${Math.abs(mpDelta)} 人`, `Total Diff ${Math.abs(mpDelta)} MP`)
                    : t('กำลังคนรวมเท่ากัน', '两线定编总数相同', 'Equal Total MP')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
