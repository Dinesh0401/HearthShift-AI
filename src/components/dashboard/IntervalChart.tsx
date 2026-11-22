'use client';

import React, { useState, useEffect } from 'react';
import { db, type StoredEnergyReading } from '../../lib/db';
import { useLanguage } from '../../locales/i18n';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Activity, Lock } from 'lucide-react';

interface IntervalChartProps {
  canVisualizeIntervals: boolean;
  refreshTrigger?: number;
  className?: string;
}

export const IntervalChart: React.FC<IntervalChartProps> = ({
  canVisualizeIntervals,
  refreshTrigger = 0,
  className = '',
}) => {
  const { t } = useLanguage();
  const [readings, setReadings] = useState<StoredEnergyReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalEnergy, setTotalEnergy] = useState(0);

  useEffect(() => {
    if (!canVisualizeIntervals) return;

    let isMounted = true;
    const fetchReadings = async () => {
      try {
        setLoading(true);
        const allReadings = await db.readings.orderBy('timestamp').toArray();
        if (!isMounted) return;

        setReadings(allReadings);
        const total = allReadings.reduce((sum, r) => sum + (r.value_kwh || 0), 0);
        setTotalEnergy(Math.round(total * 1000) / 1000);
      } catch (err) {
        console.error('Failed to load readings', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReadings();
    return () => {
      isMounted = false;
    };
  }, [canVisualizeIntervals, refreshTrigger]);

  // Scientific Honesty Gating Banner for BASIC mode
  if (!canVisualizeIntervals) {
    return (
      <div className={`rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-8 text-center shadow-sm ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
          {t('intervalDisabledTitle')}
        </h3>
        <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/80 max-w-xl mx-auto leading-relaxed">
          {t('intervalDisabledMsg')}
        </p>

        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-800 text-xs font-medium text-amber-900 dark:text-amber-200 shadow-sm">
          <span>Required: 15-minute, 30-minute, or 1-hour interval CSV</span>
        </div>
      </div>
    );
  }

  // Sample data to prevent SVG rendering bottleneck if many thousands of rows
  const maxPlotPoints = 200;
  const step = Math.max(1, Math.floor(readings.length / maxPlotPoints));
  const chartData = readings.filter((_, idx) => idx % step === 0).map((r) => {
    const d = new Date(r.timestamp);
    return {
      time: `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      kwh: r.value_kwh,
      watts: r.power_watts ?? (r.interval_duration_seconds ? Math.round((r.value_kwh * 3600000) / r.interval_duration_seconds) : undefined),
    };
  });

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm ${className}`}>
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {t('intervalChartTitle')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('intervalChartSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="font-semibold">{t('totalReadingsCount')}</span> {readings.length}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="font-semibold">{t('totalEnergyIntegrated')}</span> {totalEnergy} kWh
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">
          Loading interval records...
        </div>
      ) : readings.length === 0 ? (
        <div className="py-16 text-center text-xs text-gray-400">
          No interval records found. Upload a smart-meter CSV in the Import tab.
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={20} stroke="#94a3b8" />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#94a3b8"
                label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line
                type="monotone"
                dataKey="kwh"
                name="Interval Energy (kWh)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
