'use client';

import React, { useState, useEffect } from 'react';
import { db, type StoredEnergyReading } from '../../lib/db';
import { useLanguage } from '../../locales/i18n';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, Lock, Upload } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

interface IntervalChartProps {
  canVisualizeIntervals: boolean;
  refreshTrigger?: number;
  onGoToImport?: () => void;
  className?: string;
}

export const IntervalChart: React.FC<IntervalChartProps> = ({
  canVisualizeIntervals,
  refreshTrigger = 0,
  onGoToImport,
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

  if (!canVisualizeIntervals) {
    return (
      <EmptyState
        icon={<Lock className="w-5 h-5 text-amber-600" />}
        title={t('intervalDisabledTitle')}
        description={t('intervalDisabledMsg')}
        className={className}
        action={
          onGoToImport ? (
            <button
              type="button"
              onClick={onGoToImport}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('overviewImportUnlockCta')}</span>
            </button>
          ) : undefined
        }
      />
    );
  }

  const maxPlotPoints = 200;
  const step = Math.max(1, Math.floor(readings.length / maxPlotPoints));
  const chartData = readings
    .filter((_, idx) => idx % step === 0)
    .map((r) => {
      const d = new Date(r.timestamp);
      return {
        time: `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${String(
          d.getHours()
        ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        kwh: r.value_kwh,
      };
    });

  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-emerald-600" />
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{t('intervalChartTitle')}</h3>
            <p className="text-xs text-zinc-500">{t('intervalChartSubtitle')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="emerald">
            <span>{t('totalReadingsCount')}</span>
            <span className="font-semibold tabular-nums">{readings.length}</span>
          </Badge>
          <Badge variant="neutral">
            <span>{t('totalEnergyIntegrated')}</span>
            <span className="font-semibold tabular-nums">{totalEnergy} kWh</span>
          </Badge>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : readings.length === 0 ? (
        <div className="py-14 text-center text-xs text-zinc-500">
          No interval records found yet.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#71717a' }} minTickGap={24} stroke="#e4e4e7" />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} stroke="#e4e4e7" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 4px 12px rgb(0 0 0 / 0.06)',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="kwh"
                name={t('energyAxis')}
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#kwhFill)"
                isAnimationActive={false}
                activeDot={{ r: 4, fill: '#059669' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
