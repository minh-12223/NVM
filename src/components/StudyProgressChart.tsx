import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { StudySet } from '../types';

interface StudyProgressChartProps {
  studySets: StudySet[];
  isDark: boolean;
  onSelectSet: (set: StudySet) => void;
}

export const StudyProgressChart: React.FC<StudyProgressChartProps> = ({
  studySets,
  isDark,
  onSelectSet,
}) => {
  const stats = useMemo(() => {
    let mastered = 0;
    let learning = 0;
    let newCards = 0;

    studySets.forEach((set) => {
      const cards = set.cards || [];
      cards.forEach((card) => {
        if (card.status === 'mastered') mastered += 1;
        else if (card.status === 'learning') learning += 1;
        else newCards += 1;
      });
    });

    const total = mastered + learning + newCards;
    const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

    const pieData =
      total > 0
        ? [
            { name: 'Đã thuộc lòng (Mastered)', value: mastered, color: '#23B26D' },
            { name: 'Đang ôn tập (Learning)', value: learning, color: '#FF725B' },
            { name: 'Chưa học (New)', value: newCards, color: isDark ? '#2E3856' : '#CBD5E1' },
          ]
        : [{ name: 'Chưa có thẻ', value: 1, color: isDark ? '#2E3856' : '#CBD5E1' }];

    const setBreakdown = studySets.slice(0, 5).map((s) => {
      const cards = s.cards || [];
      const m = cards.filter((c) => c.status === 'mastered').length;
      const l = cards.filter((c) => c.status === 'learning').length;
      const n = Math.max(0, (cards.length || s.cardCount || 0) - m - l);
      return {
        id: s.id,
        shortTitle: s.title.length > 22 ? `${s.title.slice(0, 22)}...` : s.title,
        fullTitle: s.title,
        mastered: m,
        learning: l,
        remaining: n,
        setObj: s,
      };
    });

    return {
      mastered,
      learning,
      newCards,
      total,
      masteredPct,
      pieData,
      setBreakdown,
    };
  }, [studySets, isDark]);

  return (
    <section className="bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-[#2E3856] rounded-3xl p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-slate-100 dark:border-[#2E3856]">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            Phân Tích Tiến Độ Học Tập & Mức Độ Thuộc Bài (Mastered)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Biểu đồ trực quan theo dõi tỷ lệ thẻ đã thuộc lòng (Mastered) so với tổng số thẻ trong thư viện của bạn
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Tổng cộng:</span>
          <strong className="font-mono font-bold tabular-nums text-slate-900 dark:text-white text-sm">
            {stats.total} thẻ
          </strong>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Donut Pie Chart & Legend */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-52 h-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0A092D' : '#FFFFFF',
                    borderColor: isDark ? '#2E3856' : '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isDark ? '#F8FAFC' : '#0F172A',
                  }}
                  formatter={(value) => [`${value ?? 0} thẻ`, 'Số lượng']}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Percentage Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                {stats.masteredPct}%
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Mastered
              </span>
            </div>
          </div>

          {/* Breakdown Legend with Explicit Icons & Labels */}
          <div className="flex-1 w-full space-y-3.5">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#2E3856]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#23B26D] shrink-0" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Đã thuộc lòng (Mastered)
                </span>
              </div>
              <div className="text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {stats.mastered} thẻ ({stats.masteredPct}%)
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#2E3856]">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#FF725B] shrink-0" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Đang ôn tập (Learning)
                </span>
              </div>
              <div className="text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {stats.learning} thẻ (
                {stats.total > 0 ? Math.round((stats.learning / stats.total) * 100) : 0}%)
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Chưa học (New)
                </span>
              </div>
              <div className="text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {stats.newCards} thẻ (
                {stats.total > 0 ? Math.round((stats.newCards / stats.total) * 100) : 0}%)
              </div>
            </div>
          </div>
        </div>

        {/* Right: Bar Chart Comparison per Study Set */}
        <div className="lg:col-span-7 lg:border-l border-slate-100 dark:border-[#2E3856] lg:pl-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tiến độ theo từng bộ học phần
            </span>
            <span className="text-[11px] text-slate-400">
              Nhấn vào tên bộ thẻ bên dưới để ôn tập ngay
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.setBreakdown}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke={isDark ? '#2E3856' : '#E2E8F0'}
                />
                <XAxis
                  type="number"
                  tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                />
                <YAxis
                  dataKey="shortTitle"
                  type="category"
                  width={135}
                  tick={{ fill: isDark ? '#E2E8F0' : '#334155', fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0A092D' : '#FFFFFF',
                    borderColor: isDark ? '#2E3856' : '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="mastered"
                  name="Đã thuộc (Mastered)"
                  stackId="a"
                  fill="#23B26D"
                  radius={[4, 0, 0, 4]}
                />
                <Bar
                  dataKey="learning"
                  name="Đang học (Learning)"
                  stackId="a"
                  fill="#FF725B"
                />
                <Bar
                  dataKey="remaining"
                  name="Chưa học (New)"
                  stackId="a"
                  fill={isDark ? '#2E3856' : '#CBD5E1'}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {stats.setBreakdown.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectSet(item.setObj)}
                className="text-xs font-semibold text-[#4257B2] dark:text-indigo-300 hover:underline cursor-pointer mr-3"
              >
                Ôn ngay: {item.shortTitle}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
