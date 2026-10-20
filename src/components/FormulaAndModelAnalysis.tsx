import React from 'react';
import {
  StationConfig,
  ModelSeries,
  ModelMetadata,
} from '../data/mpModelData';
import {
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Layers,
  Plus,
} from 'lucide-react';
import { PageLanguageSwitchBar } from '../context/AppPreferencesContext';

interface FormulaAndModelAnalysisProps {
  models: ModelMetadata[];
  stations: StationConfig[];
  onUpdateStandardTime: (stationId: string, model: ModelSeries, newTime: number) => void;
  onUpdateStationField: (stationId: string, patch: Partial<StationConfig>) => void;
  onUpdateModelMeta: (modelId: ModelSeries, patch: Partial<ModelMetadata>) => void;
  onAddStation: () => void;
}

export const FormulaAndModelAnalysis: React.FC<FormulaAndModelAnalysisProps> = ({
  models,
  stations,
  onUpdateStandardTime,
  onUpdateStationField,
  onUpdateModelMeta,
  onAddStation,
}) => {
  // Calculate total standard time per model across all stations, and single-model 100% run MP
  const modelTotals = models.map((m) => {
    let totalST = 0;
    let singleModelMP = 0;
    for (const s of stations) {
      const st = s.standardTimes[m.id] || 0;
      totalST += st;
      const safeEff = Math.max(0.05, s.efficiency || 0.8);
      const exactStationMP = (st * s.uph) / (3600 * safeEff);
      singleModelMP += Math.round(exactStationMP);
    }
    return {
      model: m,
      totalST,
      singleModelMP,
    };
  });

  return (
    <div className="space-y-6">
      <PageLanguageSwitchBar pageLabel="สูตรคำนวณ & เวลารายรุ่น (IE Formulas & Model ST)" />
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>โครงสร้างสูตรวิศวกรรมอุตสาหการ (IE Standard Time & Manpower Formulas)</span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-600 font-semibold">
              คลิกแก้ไขเวลามาตรฐานรายรุ่นและพารามิเตอร์ทุกช่องได้ทันที
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
            คู่มือสูตรคำนวณกำลังคน MP และแก้ไขเวลามาตรฐานราย Model ({models.length} รุ่น × {stations.length} สถานี)
          </h1>
        </div>

        <button
          onClick={onAddStation}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>เพิ่มสถานีงาน</span>
        </button>
      </div>

      {/* Editable Model Standard Time Matrix across all stations */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>ตารางแก้ไขเวลามาตรฐานรายรุ่น (Editable Standard Time Matrix)</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              ตารางเวลามาตรฐาน (产品工时: วินาที), UPH และ Efficiency ของแต่ละสถานี — แก้ไขได้ทุกช่อง
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            เมื่อแก้ไขค่าในตารางนี้ ผลลัพธ์ในหน้าแดชบอร์ดและหน้าคาดการณ์ MP จะอัปเดตทันที
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <th className="py-3 px-3 font-semibold min-w-[210px]">สถานีงาน (线段)</th>
                <th className="py-3 px-2 font-semibold text-right">UPH</th>
                <th className="py-3 px-2 font-semibold text-right">Efficiency (%)</th>
                {models.map((m) => (
                  <th
                    key={m.id}
                    className="py-2.5 px-2 font-semibold text-right border-l border-slate-200 min-w-[110px]"
                  >
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) =>
                        onUpdateModelMeta(m.id, { name: e.target.value })
                      }
                      className="w-full text-right font-bold text-slate-900 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:border-blue-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={m.category}
                      onChange={(e) =>
                        onUpdateModelMeta(m.id, { category: e.target.value })
                      }
                      className="w-full text-right text-[10px] font-normal text-slate-500 bg-transparent border border-transparent hover:border-slate-200 rounded px-1 mt-0.5 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
              {stations.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-sans">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) =>
                        onUpdateStationField(s.id, { name: e.target.value })
                      }
                      className="w-full font-semibold text-slate-900 px-1.5 py-0.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-600 rounded focus:outline-none"
                    />
                    <input
                      type="text"
                      value={s.thaiName}
                      onChange={(e) =>
                        onUpdateStationField(s.id, { thaiName: e.target.value })
                      }
                      className="w-full text-[11px] text-slate-500 px-1.5 py-0.5 bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-600 rounded focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={s.uph}
                      onChange={(e) => {
                        const val = Math.max(1, parseFloat(e.target.value || '140'));
                        onUpdateStationField(s.id, {
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
                      value={Number((s.efficiency * 100).toFixed(1))}
                      onChange={(e) => {
                        const pct = Math.min(
                          100,
                          Math.max(10, parseFloat(e.target.value || '80'))
                        );
                        onUpdateStationField(s.id, {
                          efficiency: pct / 100,
                        });
                      }}
                      className="w-16 px-1.5 py-1 text-right bg-white border border-slate-200 rounded focus:border-blue-600 focus:outline-none"
                    />
                  </td>
                  {models.map((m) => {
                    const st = s.standardTimes[m.id];
                    return (
                      <td
                        key={m.id}
                        className={`py-2 px-2 text-right border-l border-slate-100 ${
                          st === 0
                            ? 'bg-slate-50/50'
                            : st >= 1000
                            ? 'bg-blue-50/30'
                            : ''
                        }`}
                      >
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={st}
                          onChange={(e) =>
                            onUpdateStandardTime(
                              s.id,
                              m.id,
                              Math.max(0, parseFloat(e.target.value || '0'))
                            )
                          }
                          className={`w-24 px-1.5 py-1 text-right rounded border focus:outline-none focus:border-blue-600 ${
                            st === 0
                              ? 'text-slate-400 bg-white/60 border-slate-200'
                              : st >= 1000
                              ? 'font-bold text-blue-700 bg-white border-blue-300'
                              : 'text-slate-900 bg-white border-slate-200'
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 font-mono tabular-nums">
              <tr className="bg-slate-900 text-white font-bold">
                <td colSpan={3} className="py-3 px-4 font-sans">
                  เวลามาตรฐานรวมต่อเครื่อง (Total Standard Time / Unit)
                </td>
                {modelTotals.map((mt) => (
                  <td
                    key={mt.model.id}
                    className="py-3 px-2 text-right border-l border-slate-700 text-amber-300"
                  >
                    {mt.totalST.toFixed(2)}s
                    <div className="text-[10px] font-normal text-slate-300">
                      ({(mt.totalST / 60).toFixed(1)} นาที)
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-100 text-slate-800 font-semibold">
                <td colSpan={3} className="py-2.5 px-4 font-sans">
                  กำลังคนรวมหากเดินรุ่นเดียว 100% (Single-Model Dedicated MP)
                </td>
                {modelTotals.map((mt) => (
                  <td
                    key={mt.model.id}
                    className="py-2.5 px-2 text-right border-l border-slate-200 text-blue-700 font-bold"
                  >
                    {mt.singleModelMP} MP
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4 Step IE Formula Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="text-xs font-bold text-blue-600">
            ขั้นตอนที่ 1 · สัดส่วนการผลิตรายรุ่น (Production Mix Ratio / 产量占比)
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            คำนวณสัดส่วนของแต่ละ Model เทียบกับยอดรวมรายสัปดาห์
          </h3>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
            Mix Ratio (รุ่น i) = Volume(รุ่น i) ÷ Σ Volume(ทุกรุ่นในสัปดาห์นั้น)
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ตัวอย่างสัปดาห์ 1W: รุ่น <strong>TM19/21</strong> มียอดสั่งผลิต{' '}
            <span className="font-mono">3,788</span> คัน จากยอดรวมทั้งสัปดาห์{' '}
            <span className="font-mono">9,523</span> คัน คิดเป็นสัดส่วน{' '}
            <span className="font-mono">3,788 ÷ 9,523 = 39.78% (แสดงผล 40%)</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="text-xs font-bold text-blue-600">
            ขั้นตอนที่ 2 · เวลามาตรฐานถ่วงน้ำหนัก (Weighted Standard Time / 加权工时)
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            นำเวลามาตรฐานแต่ละรุ่นคูณสัดส่วนการผลิตแล้วนำมารวมกันรายสถานี
          </h3>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
            加权工时 (สถานี s) = Σ [ 产品工时(s, i) × Mix Ratio(i) ]
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            สะท้อนภาระงานเฉลี่ยจริงต่อตู้เย็น 1 เครื่องบนสายการผลิตแบบผสมรุ่น (Mixed-Model Line)
            เช่น สถานี <strong>Inner Box 1</strong> ในสัปดาห์ 1W มีเวลาถ่วงน้ำหนักเท่ากับ{' '}
            <span className="font-mono">981.40 วินาที/เครื่อง</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="text-xs font-bold text-blue-600">
            ขั้นตอนที่ 3 · รอบเวลาการผลิตและประสิทธิภาพสมดุลไลน์ (Takt Time & Line Efficiency)
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            แปลงความเร็วสายการผลิต (UPH) เป็นรอบเวลาต่อชิ้น (Takt Time)
          </h3>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
            Takt Time (TT) = 3,600 วินาที ÷ UPH (140) = 25.714 วินาที/คัน
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            เมื่อคิดค่าสมดุลสายการผลิตและเวลาผ่อนผัน (Line Balance Efficiency η = 70%–81% ตามความซับซ้อนของสถานี)
            จะได้เวลามาตรฐานสุทธิที่พนักงาน 1 คนรับผิดชอบได้ต่อรอบการผลิต
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="text-xs font-bold text-blue-600">
            ขั้นตอนที่ 4 · อัตรากำลังคนมาตรฐาน (Standard Manpower / 标准定编 STD MP)
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            คำนวณจำนวนคนประจำสถานีงานเพื่อให้ทันความเร็ว UPH ที่กำหนด
          </h3>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
            STD MP = ROUND( (加权工时 × UPH) ÷ (3,600 × η) )
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ตัวอย่างสถานี <strong>Inner Box 1 (1W)</strong>:{' '}
            <span className="font-mono">(981.40 × 140) ÷ (3,600 × 0.80) = 47.71 คน → ปัดเป็น 48 MP</span>{' '}
            ตรงตามตัวเลขในตารางต้นฉบับทุกประการ
          </p>
        </div>
      </div>

      {/* Audit & Verification Note on the Original Excel Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>บันทึกการตรวจสอบความถูกต้องของสูตรจากไฟล์ Excel ต้นฉบับ (Formula Audit Log)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1.5">
            <div className="font-bold text-amber-900">
              1. จุดสังเกตที่สถานี Inner Box2 (ช่อง 加权工时 ในไฟล์ภาพ)
            </div>
            <p className="leading-relaxed">
              ในไฟล์ภาพต้นฉบับ ช่อง <strong>加权工时</strong> ของ <strong>Inner Box2</strong> แสดงค่า{' '}
              <span className="font-mono font-semibold">143, 157, 138, 154</span>{' '}
              ซึ่งเป็นตัวเลขเดียวกับสถานี <strong>Rooling</strong> ด้านบน (เกิดจากการคัดลอกสูตรใน Excel)
              แต่ช่อง <strong>标准定编 STD MP (18, 18, 19, 17)</strong> คำนวณจากเวลาถ่วงน้ำหนักจริงของ Inner Box2 คือ{' '}
              <span className="font-mono font-semibold">381, 378, 390, 352 วินาที</span>
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>2. จุดสังเกตบรรทัดรวมท้ายตาราง (合计 Total Row)</span>
            </div>
            <p className="leading-relaxed">
              เมื่อนำค่า <strong>STD MP</strong> ทั้ง 9 สถานีในตารางมาบวกรวมกันจริง (
              <span className="font-mono">7 + 18 + 48 + 10 + 29 + 5 + 3 + 7 + 31</span>) จะได้ผลรวม{' '}
              <span className="font-mono font-bold">1W = 158 MP, 2W = 155 MP, 3W = 153 MP, 4W = 154 MP</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
