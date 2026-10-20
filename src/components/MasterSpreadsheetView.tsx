import React, { useState } from 'react';
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
  Search,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
} from 'lucide-react';
import { PageLanguageSwitchBar } from '../context/AppPreferencesContext';

interface MasterSpreadsheetViewProps {
  activeLine: LineKey;
  activeSheet: SheetKey;
  models: ModelMetadata[];
  stations: StationConfig[];
  weeklyVolumes: Record<ModelSeries, Record<WeekKey, number>>;
  metrics: WeeklySummaryMetrics;
  onUpdateStandardTime: (stationId: string, model: ModelSeries, newTime: number) => void;
  onUpdateWeeklyVolume: (model: ModelSeries, week: WeekKey, newVol: number) => void;
  onUpdateStationField: (stationId: string, patch: Partial<StationConfig>) => void;
  onUpdateModelMeta: (modelId: ModelSeries, patch: Partial<ModelMetadata>) => void;
  onAddStation: () => void;
  onDeleteStation: (stationId: string) => void;
  onResetAll: () => void;
}

export const MasterSpreadsheetView: React.FC<MasterSpreadsheetViewProps> = ({
  activeLine,
  activeSheet,
  models,
  stations,
  weeklyVolumes,
  metrics,
  onUpdateStandardTime,
  onUpdateWeeklyVolume,
  onUpdateStationField,
  onUpdateModelMeta,
  onAddStation,
  onDeleteStation,
  onResetAll,
}) => {
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<'accurate' | 'original_sheet'>('accurate');

  const filteredRows = metrics.stationRows.filter((row) => {
    if (selectedStationFilter !== 'ALL' && row.station.id !== selectedStationFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        row.station.name.toLowerCase().includes(q) ||
        row.station.thaiName.toLowerCase().includes(q) ||
        row.station.code.toLowerCase().includes(q) ||
        row.station.subArea.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportMasterCSV = () => {
    const headers = [
      '区域 (Area)',
      'Sheet (CAB/FG)',
      '线段 (Station)',
      '产品系列 (Model)',
      '产品工时 (ST sec)',
      '1W Order',
      '2W Order',
      '3W Order',
      '4W Order',
      '1W Mix%',
      '2W Mix%',
      '3W Mix%',
      '4W Mix%',
      '1W 加权工时',
      '2W 加权工时',
      '3W 加权工时',
      '4W 加权工时',
      '1W UPH',
      '2W UPH',
      '3W UPH',
      '4W UPH',
      '1W STD MP',
      '2W STD MP',
      '3W STD MP',
      '4W STD MP',
      'AVG MP',
      'MIN MP',
      'MAX MP',
    ];

    const csvRows: (string | number)[][] = [];
    for (const row of metrics.stationRows) {
      models.forEach((m, idx) => {
        csvRows.push([
          `"${row.station.area}"`,
          `"${row.station.subArea}"`,
          `"${row.station.name}"`,
          `"${m.name}"`,
          row.station.standardTimes[m.id].toFixed(2),
          weeklyVolumes[m.id]['1W'],
          weeklyVolumes[m.id]['2W'],
          weeklyVolumes[m.id]['3W'],
          weeklyVolumes[m.id]['4W'],
          `${Math.round(metrics.mixRatios[m.id]['1W'] * 100)}%`,
          `${Math.round(metrics.mixRatios[m.id]['2W'] * 100)}%`,
          `${Math.round(metrics.mixRatios[m.id]['3W'] * 100)}%`,
          `${Math.round(metrics.mixRatios[m.id]['4W'] * 100)}%`,
          idx === 0 ? row.byWeek['1W'].roundedWeightedST : '',
          idx === 0 ? row.byWeek['2W'].roundedWeightedST : '',
          idx === 0 ? row.byWeek['3W'].roundedWeightedST : '',
          idx === 0 ? row.byWeek['4W'].roundedWeightedST : '',
          idx === 0 ? row.byWeek['1W'].uph : '',
          idx === 0 ? row.byWeek['2W'].uph : '',
          idx === 0 ? row.byWeek['3W'].uph : '',
          idx === 0 ? row.byWeek['4W'].uph : '',
          idx === 0 ? row.byWeek['1W'].stdMP : '',
          idx === 0 ? row.byWeek['2W'].stdMP : '',
          idx === 0 ? row.byWeek['3W'].stdMP : '',
          idx === 0 ? row.byWeek['4W'].stdMP : '',
          idx === 0 ? row.avgMP : '',
          idx === 0 ? row.minMP : '',
          idx === 0 ? row.maxMP : '',
        ]);
      });
    }

    const csvContent =
      '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Thailand_Factory_Standard_MP_${activeLine}_${activeSheet}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sheetTitleLabel =
    activeSheet === 'FG'
      ? `${activeLine} — Sheet FG (Finished Goods — ${stations.length} สถานี)`
      : activeSheet === 'CAB'
      ? `${activeLine} — Sheet CAB (Cabinet Assembly — ${stations.length} สถานี)`
      : `รวมทั้งสายการผลิต ${activeLine} (Sheet CAB + Sheet FG — ครบ ${stations.length} สถานี)`;

  return (
    <div className="space-y-5">
      <PageLanguageSwitchBar pageLabel="ตารางข้อมูลหลัก (Master Spreadsheet)" />
      {/* Header & Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>泰国工厂标准定编测算模型</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-800">{sheetTitleLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="text-blue-600 font-semibold">
                คลิกแก้ไขตัวเลขและข้อความได้ทุกช่อง
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
              ตารางฐานข้อมูลเวลามาตรฐานและการจัดสรรบุคลากรตามมาตรฐาน ({sheetTitleLabel})
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => setDisplayMode('accurate')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  displayMode === 'accurate'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                คำนวณตามสูตรจริง (IE Accurate)
              </button>
              <button
                onClick={() => setDisplayMode('original_sheet')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  displayMode === 'original_sheet'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แสดงตามไฟล์ภาพต้นฉบับ
              </button>
            </div>

            <button
              onClick={onAddStation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มสถานีงาน ({activeSheet === 'FG' ? 'FG' : 'CAB'})</span>
            </button>

            <button
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              title="คืนค่าเริ่มต้นตามไฟล์ต้นฉบับ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่าเริ่มต้น</span>
            </button>

            <button
              onClick={exportMasterCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedStationFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedStationFilter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทุกสถานีในมุมมองนี้ ({stations.length})
            </button>
            {stations.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStationFilter(s.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  selectedStationFilter === s.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {activeSheet === 'ALL' ? `[${s.subArea}] ` : ''}
                {s.name}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสถานี..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Full Spreadsheet Matrix Table matching 泰国工厂标准定编测算模型 — ALL CELLS EDITABLE */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
        <div className="bg-slate-900 text-white py-3 px-5 flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-sm tracking-wide">
            泰国工厂标准定编测算模型 — {sheetTitleLabel}
          </div>
          <div className="text-xs text-amber-300 font-mono">
            * คลิกที่ช่องตัวเลขเพื่อพิมพ์แก้ไขได้ทันที (产品工时, 9月订单量, 加权工时, UPH, 标准定编 STD MP)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-center border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-sans font-bold">
                <th rowSpan={2} className="py-2 px-1.5 border-r border-slate-300 w-16">
                  区域
                  <div className="text-[10px] font-normal text-slate-500">พื้นที่</div>
                </th>
                <th rowSpan={2} className="py-2 px-1.5 border-r border-slate-300 w-14">
                  Sheet
                </th>
                <th rowSpan={2} className="py-2 px-2.5 border-r border-slate-300 min-w-[160px]">
                  线段
                  <div className="text-[10px] font-normal text-slate-500">
                    สถานีงาน & Efficiency
                  </div>
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-slate-300 min-w-[100px]">
                  产品系列
                  <div className="text-[10px] font-normal text-slate-500">รุ่นสินค้า</div>
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 border-r border-slate-300 bg-sky-50/70 min-w-[90px]"
                >
                  产品工时
                  <div className="text-[10px] font-normal text-slate-500">เวลามาตรฐาน(s)</div>
                </th>
                <th colSpan={4} className="py-1.5 px-2 border-r border-b border-slate-300">
                  9月订单量 (ยอดคำสั่งผลิต)
                </th>
                <th colSpan={4} className="py-1.5 px-2 border-r border-b border-slate-300">
                  9月份产量占比 (สัดส่วนการผลิต %)
                </th>
                <th colSpan={4} className="py-1.5 px-2 border-r border-b border-slate-300">
                  加权工时 Weighted labor hours
                </th>
                <th colSpan={4} className="py-1.5 px-2 border-r border-b border-slate-300">
                  UPH (คัน/ชม.)
                </th>
                <th
                  colSpan={4}
                  className="py-1.5 px-2 border-r border-b border-slate-300 bg-blue-50/60"
                >
                  标准定编 การจัดสรรบุคลากรตามมาตรฐาน (STD MP)
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 border-r border-slate-300 bg-yellow-300/80 text-slate-900 w-12"
                >
                  AVG
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 border-r border-slate-300 bg-cyan-300/80 text-slate-900 w-12"
                >
                  MIN
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 bg-rose-300/80 text-slate-900 w-12"
                >
                  MAX
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-300 font-bold">
                {WEEKS.map((w) => (
                  <th key={`ord-${w}`} className="py-1.5 px-1.5 border-r border-slate-300">
                    {w}
                  </th>
                ))}
                {WEEKS.map((w) => (
                  <th key={`mix-${w}`} className="py-1.5 px-1.5 border-r border-slate-300">
                    {w}
                  </th>
                ))}
                {WEEKS.map((w) => (
                  <th key={`wst-${w}`} className="py-1.5 px-1.5 border-r border-slate-300">
                    {w}
                  </th>
                ))}
                {WEEKS.map((w) => (
                  <th key={`uph-${w}`} className="py-1.5 px-1.5 border-r border-slate-300">
                    {w}
                  </th>
                ))}
                {WEEKS.map((w) => (
                  <th
                    key={`std-${w}`}
                    className="py-1.5 px-1.5 border-r border-slate-300 bg-blue-50/60 text-blue-900"
                  >
                    {w}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredRows.map((row, stationIdx) => {
                const totalRowsForStation = models.length + 1;
                const showAreaMerged = stationIdx === 0;
                const totalStationSpan = filteredRows.length * totalRowsForStation;

                const getDisplayedWeightedST = (w: WeekKey) => {
                  if (
                    displayMode === 'original_sheet' &&
                    row.station.sheetDisplayedWeightedST
                  ) {
                    return row.station.sheetDisplayedWeightedST[w];
                  }
                  return row.byWeek[w].roundedWeightedST;
                };

                const displayedAvg =
                  displayMode === 'original_sheet' && row.station.sheetDisplayedSummary
                    ? row.station.sheetDisplayedSummary.avg
                    : row.avgMP;
                const displayedMin =
                  displayMode === 'original_sheet' && row.station.sheetDisplayedSummary
                    ? row.station.sheetDisplayedSummary.min
                    : row.minMP;
                const displayedMax =
                  displayMode === 'original_sheet' && row.station.sheetDisplayedSummary
                    ? row.station.sheetDisplayedSummary.max
                    : row.maxMP;

                const hasManualOverride = WEEKS.some(
                  (w) =>
                    row.byWeek[w].isManualWeightedST || row.byWeek[w].isManualStdMP
                );

                return (
                  <React.Fragment key={row.station.id}>
                    {models.map((m, modelIdx) => {
                      const isFirstModelRow = modelIdx === 0;
                      const st = row.station.standardTimes[m.id];

                      return (
                        <tr
                          key={`${row.station.id}-${m.id}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* 区域 (LineB) merged across all stations */}
                          {showAreaMerged && isFirstModelRow && (
                            <td
                              rowSpan={totalStationSpan}
                              className="border-r border-slate-300 bg-white font-sans font-semibold text-slate-800 align-middle p-1"
                            >
                              <input
                                type="text"
                                value={row.station.area}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  stations.forEach((s) =>
                                    onUpdateStationField(s.id, { area: val })
                                  );
                                }}
                                className="w-14 text-center font-bold bg-slate-50 border border-slate-200 rounded py-1 focus:bg-white focus:border-blue-600 focus:outline-none"
                                title="แก้ไขชื่อ Area (区域)"
                              />
                            </td>
                          )}

                          {/* SubArea (CAB or FG) merged per station */}
                          {isFirstModelRow && (
                            <td
                              rowSpan={totalRowsForStation}
                              className={`border-r border-b border-slate-300 font-sans font-bold align-middle p-1 ${
                                row.station.subArea === 'FG'
                                  ? 'bg-emerald-50/40 text-emerald-900'
                                  : 'bg-white text-slate-800'
                              }`}
                            >
                              <input
                                type="text"
                                value={row.station.subArea}
                                onChange={(e) =>
                                  onUpdateStationField(row.station.id, {
                                    subArea: e.target.value,
                                  })
                                }
                                className="w-12 text-center font-bold bg-white/80 border border-slate-200 rounded py-1 focus:bg-white focus:border-blue-600 focus:outline-none"
                                title="แก้ไข Sheet (CAB / FG)"
                              />
                            </td>
                          )}

                          {/* 线段 (Station Name, Thai Name, Efficiency, Delete) merged across 8 rows */}
                          {isFirstModelRow && (
                            <td
                              rowSpan={totalRowsForStation}
                              className="p-2 border-r border-b border-slate-300 bg-white font-sans align-middle space-y-1.5"
                            >
                              <input
                                type="text"
                                value={row.station.name}
                                onChange={(e) =>
                                  onUpdateStationField(row.station.id, {
                                    name: e.target.value,
                                  })
                                }
                                className="w-full text-center font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:bg-white focus:border-blue-600 focus:outline-none"
                                title="แก้ไขชื่อสถานี (线段)"
                              />
                              <input
                                type="text"
                                value={row.station.thaiName}
                                onChange={(e) =>
                                  onUpdateStationField(row.station.id, {
                                    thaiName: e.target.value,
                                  })
                                }
                                className="w-full text-center text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:bg-white focus:border-blue-600 focus:outline-none"
                                title="แก้ไขคำอธิบายภาษาไทย"
                              />
                              <div className="flex items-center justify-center gap-1 pt-1 text-[10px] text-slate-600">
                                <span>Eff:</span>
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
                                  className="w-12 text-center font-mono font-semibold bg-slate-50 border border-slate-200 rounded py-0.5 focus:bg-white focus:border-blue-600 focus:outline-none"
                                />
                                <span>%</span>
                                {hasManualOverride && (
                                  <button
                                    onClick={() =>
                                      onUpdateStationField(row.station.id, {
                                        manualWeightedST: {},
                                        manualStdMP: {},
                                      })
                                    }
                                    className="p-0.5 text-amber-600 hover:text-amber-800 cursor-pointer"
                                    title="รีเซ็ตกลับเป็นสูตรอัตโนมัติ"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                                {stations.length > 1 && (
                                  <button
                                    onClick={() => onDeleteStation(row.station.id)}
                                    className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                                    title="ลบสถานีงานนี้"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}

                          {/* 产品系列 (Model Name — Editable) */}
                          <td className="py-0.5 px-1.5 border-r border-slate-200 text-left font-sans">
                            <input
                              type="text"
                              value={m.name}
                              onChange={(e) =>
                                onUpdateModelMeta(m.id, { name: e.target.value })
                              }
                              className="w-full px-1 py-0.5 font-medium text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-600 rounded focus:outline-none"
                            />
                          </td>

                          {/* 产品工时 (Standard Time — Always Editable) */}
                          <td className="py-0.5 px-1.5 border-r border-slate-300 bg-sky-100/60 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={st}
                              onChange={(e) =>
                                onUpdateStandardTime(
                                  row.station.id,
                                  m.id,
                                  Math.max(0, parseFloat(e.target.value || '0'))
                                )
                              }
                              className="w-20 px-1.5 py-0.5 text-right font-semibold text-slate-900 bg-white/80 border border-sky-200 hover:border-sky-400 focus:bg-white focus:border-blue-600 rounded focus:outline-none"
                            />
                          </td>

                          {/* 9月订单量 1W-4W — Always Editable */}
                          {WEEKS.map((w) => (
                            <td
                              key={`vol-${w}`}
                              className="py-0.5 px-1 border-r border-slate-200 text-right"
                            >
                              <input
                                type="number"
                                step="10"
                                min="0"
                                value={weeklyVolumes[m.id][w]}
                                onChange={(e) =>
                                  onUpdateWeeklyVolume(
                                    m.id,
                                    w,
                                    Math.max(0, parseInt(e.target.value || '0', 10))
                                  )
                                }
                                className="w-16 px-1 py-0.5 text-right text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-600 rounded focus:outline-none"
                              />
                            </td>
                          ))}

                          {/* 9月份产量占比 1W-4W */}
                          {WEEKS.map((w) => (
                            <td
                              key={`ratio-${w}`}
                              className="py-1 px-2 border-r border-slate-200 text-right text-slate-700"
                            >
                              {Math.round(metrics.mixRatios[m.id][w] * 100)}%
                            </td>
                          ))}

                          {/* 加权工时, UPH, STD MP, AVG, MIN, MAX merged for the 7 model rows — Editable */}
                          {isFirstModelRow && (
                            <>
                              {/* 加权工时 1W-4W */}
                              {WEEKS.map((w) => (
                                <td
                                  key={`wst-merged-${w}`}
                                  rowSpan={models.length}
                                  className="px-1 border-r border-slate-300 align-middle"
                                >
                                  <input
                                    type="number"
                                    min={0}
                                    value={getDisplayedWeightedST(w)}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      onUpdateStationField(row.station.id, {
                                        manualWeightedST: {
                                          ...(row.station.manualWeightedST || {}),
                                          [w]: isNaN(val) ? null : val,
                                        },
                                      });
                                    }}
                                    className={`w-14 py-1 text-center font-semibold rounded border focus:outline-none focus:border-blue-600 ${
                                      row.byWeek[w].isManualWeightedST
                                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                                        : 'bg-slate-50/70 border-slate-200 text-slate-900 hover:border-slate-300'
                                    }`}
                                    title="คลิกเพื่อแก้ไขเวลาถ่วงน้ำหนัก"
                                  />
                                </td>
                              ))}

                              {/* UPH 1W-4W */}
                              {WEEKS.map((w) => (
                                <td
                                  key={`uph-merged-${w}`}
                                  rowSpan={models.length}
                                  className="px-1 border-r border-slate-300 align-middle"
                                >
                                  <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={row.byWeek[w].uph}
                                    onChange={(e) => {
                                      const val = Math.max(
                                        1,
                                        parseFloat(e.target.value || '140')
                                      );
                                      onUpdateStationField(row.station.id, {
                                        uph: val,
                                        uphByWeek: {
                                          ...(row.station.uphByWeek || {
                                            '1W': row.station.uph,
                                            '2W': row.station.uph,
                                            '3W': row.station.uph,
                                            '4W': row.station.uph,
                                          }),
                                          [w]: val,
                                        },
                                      });
                                    }}
                                    className="w-12 py-1 text-center text-slate-700 bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded focus:bg-white focus:border-blue-600 focus:outline-none"
                                    title={`แก้ไข UPH สัปดาห์ ${w}`}
                                  />
                                </td>
                              ))}

                              {/* STD MP 1W-4W */}
                              {WEEKS.map((w) => (
                                <td
                                  key={`std-merged-${w}`}
                                  rowSpan={models.length}
                                  className="px-1 border-r border-slate-300 align-middle bg-blue-50/30"
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
                                    className={`w-12 py-1 text-center font-bold text-xs rounded border focus:outline-none focus:border-blue-600 ${
                                      row.byWeek[w].isManualStdMP
                                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                                        : 'bg-white border-blue-200 text-blue-800 hover:border-blue-400'
                                    }`}
                                    title="คลิกเพื่อแก้ไข STD MP ได้โดยตรง"
                                  />
                                </td>
                              ))}

                              <td
                                rowSpan={models.length}
                                className="px-2 border-r border-slate-300 align-middle font-bold text-slate-900 bg-yellow-50/40"
                              >
                                {displayedAvg}
                              </td>
                              <td
                                rowSpan={models.length}
                                className="px-2 border-r border-slate-300 align-middle font-bold text-slate-900 bg-cyan-50/40"
                              >
                                {displayedMin}
                              </td>
                              <td
                                rowSpan={models.length}
                                className="px-2 align-middle font-bold text-slate-900 bg-rose-50/40"
                              >
                                {displayedMax}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}

                    {/* Station SUM Row */}
                    <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-900">
                      <td className="py-1.5 px-2 border-r border-slate-300 text-left font-sans">
                        SUM
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-300 bg-sky-100/40"></td>
                      {WEEKS.map((w) => (
                        <td
                          key={`sum-vol-${w}`}
                          className="py-1.5 px-2 border-r border-slate-300 bg-yellow-300/90 text-right"
                        >
                          {metrics.totalVolume[w]}
                        </td>
                      ))}
                      {WEEKS.map((w) => (
                        <td
                          key={`sum-mix-${w}`}
                          className="py-1.5 px-2 border-r border-slate-300 bg-yellow-300/90 text-right"
                        >
                          100%
                        </td>
                      ))}
                      <td colSpan={4} className="border-r border-slate-300 bg-white"></td>
                      <td colSpan={4} className="border-r border-slate-300 bg-white"></td>
                      <td colSpan={4} className="border-r border-slate-300 bg-white"></td>
                      <td className="border-r border-slate-300 bg-white"></td>
                      <td className="border-r border-slate-300 bg-white"></td>
                      <td className="bg-white"></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Grand Total Footer (合计) */}
            <tfoot className="border-t-2 border-slate-400 font-bold text-xs">
              <tr className="bg-slate-900 text-white">
                <td colSpan={3} className="py-2.5 px-3 border-r border-slate-700 font-sans text-left">
                  合计 ({sheetTitleLabel})
                </td>
                <td className="py-2.5 px-2 border-r border-slate-700 font-sans text-left">
                  合计
                </td>
                <td className="py-2.5 px-2 border-r border-slate-700 font-sans text-center">
                  /
                </td>
                {WEEKS.map((w) => (
                  <td
                    key={`ft-vol-${w}`}
                    className="py-2.5 px-2 border-r border-slate-700 bg-yellow-400 text-slate-900 text-right"
                  >
                    {metrics.totalVolume[w]}
                  </td>
                ))}
                {WEEKS.map((w) => (
                  <td
                    key={`ft-mix-${w}`}
                    className="py-2.5 px-2 border-r border-slate-700 bg-yellow-400 text-slate-900 text-right"
                  >
                    100%
                  </td>
                ))}
                {WEEKS.map((w) => (
                  <td key={`ft-wst-${w}`} className="py-2.5 px-2 border-r border-slate-700">
                    {displayMode === 'original_sheet'
                      ? metrics.sheetFooterReference.weightedST[w]
                      : Math.round(metrics.totalWeightedST[w])}
                  </td>
                ))}
                {WEEKS.map((w) => (
                  <td key={`ft-uph-${w}`} className="py-2.5 px-2 border-r border-slate-700">
                    {displayMode === 'original_sheet'
                      ? metrics.sheetFooterReference.uph[w]
                      : metrics.totalUphSum[w]}
                  </td>
                ))}
                {WEEKS.map((w) => (
                  <td
                    key={`ft-mp-${w}`}
                    className="py-2.5 px-2 border-r border-slate-700 text-amber-300"
                  >
                    {displayMode === 'original_sheet'
                      ? metrics.sheetFooterReference.stdMP[w]
                      : metrics.totalStdMP[w]}
                  </td>
                ))}
                <td className="py-2.5 px-2 border-r border-slate-700">
                  {displayMode === 'original_sheet'
                    ? metrics.sheetFooterReference.avg
                    : metrics.avgTotalMP}
                </td>
                <td className="py-2.5 px-2 border-r border-slate-700">
                  {displayMode === 'original_sheet'
                    ? metrics.sheetFooterReference.min
                    : metrics.minTotalMP}
                </td>
                <td className="py-2.5 px-2">
                  {displayMode === 'original_sheet'
                    ? metrics.sheetFooterReference.max
                    : metrics.maxTotalMP}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
