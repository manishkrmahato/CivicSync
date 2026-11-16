import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfigAlert } from '@/components/ui/ConfigAlert';
import { BarChart3, AlertCircle, RefreshCw } from 'lucide-react';

export const PublicDashboard: React.FC = () => {
  const { isConfigured } = useAuth();
  const [metrics, setMetrics] = useState<{
    total: number;
    resolved: number;
    active: number;
    escalated: number;
  }>({ total: 0, resolved: 0, active: 0, escalated: 0 });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublicMetrics = async () => {
    if (!isConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query anonymized issues count
      const { data, error } = await supabase
        .from('issues')
        .select('id, status, is_escalated');

      if (error) {
        setError(error.message);
      } else if (data) {
        const total = data.length;
        const resolved = data.filter((i) => i.status === 'resolved').length;
        const escalated = data.filter((i) => i.is_escalated).length;
        const active = data.filter(
          (i) => !['resolved', 'rejected', 'duplicate'].includes(i.status)
        ).length;

        setMetrics({ total, resolved, active, escalated });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to query public transparency statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicMetrics();
  }, [isConfigured]);

  const resolutionRate =
    metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-forest-700 font-semibold">
              Public Utility Portal
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-[11px] font-mono text-stone-500 uppercase">
              PII Strictly Redacted
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            Municipal Transparency Dashboard
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Real-time infrastructure accountability, SLA compliance, and public service turnaround
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPublicMetrics}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {!isConfigured && (
        <div className="mt-6">
          <ConfigAlert />
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Unable to load metrics</p>
            <p className="mt-0.5 text-rose-800">{error}</p>
          </div>
        </div>
      )}

      {/* Real Statistics Display */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-stone-200 p-5">
          <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
            Total Complaints Filed
          </span>
          <div className="font-mono text-3xl font-bold text-stone-900 mt-2 tabular-nums">
            {isLoading ? '...' : metrics.total}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            All validated civic issues recorded
          </p>
        </Card>

        <Card className="border-stone-200 p-5">
          <span className="text-xs font-mono uppercase tracking-wider text-forest-700">
            Successfully Resolved
          </span>
          <div className="font-mono text-3xl font-bold text-forest-800 mt-2 tabular-nums">
            {isLoading ? '...' : metrics.resolved}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Verified repair with photographic proof
          </p>
        </Card>

        <Card className="border-stone-200 p-5">
          <span className="text-xs font-mono uppercase tracking-wider text-amber-700">
            Active in Pipeline
          </span>
          <div className="font-mono text-3xl font-bold text-amber-800 mt-2 tabular-nums">
            {isLoading ? '...' : metrics.active}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Under triage, review, or departmental repair
          </p>
        </Card>

        <Card className="border-stone-200 p-5">
          <span className="text-xs font-mono uppercase tracking-wider text-stone-600">
            Resolution Efficiency
          </span>
          <div className="font-mono text-3xl font-bold text-stone-900 mt-2 tabular-nums">
            {isLoading ? '...' : `${resolutionRate}%`}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Ratio of resolved issues to total intake
          </p>
        </Card>
      </div>

      {/* Roadmap Notice for Batch 5 Recharts Visualizations */}
      <div className="mt-8 bg-stone-100/70 border border-stone-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-forest-700 mt-0.5" />
          <div>
            <h3 className="font-serif text-base font-semibold text-stone-900">
              Interactive Analytics Suite (Batch 5 Integration)
            </h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Full interactive Recharts charts (department SLA turnaround comparisons, category distributions,
              ward-level resolution timelines, and citywide cluster map) will be implemented during Batch 5.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
