import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { Issue, IssueStatus } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfigAlert } from '@/components/ui/ConfigAlert';
import { formatDate, formatTicketNumber } from '@/lib/utils';
import {
  AlertCircle,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

export const OfficialDashboard: React.FC = () => {
  const { user, profile, role, isConfigured } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficialQueue = async () => {
    if (!isConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('issues')
        .select('*, assigned_department:departments(*)')
        .order('created_at', { ascending: false });

      if (filteredStatus !== 'all') {
        if (filteredStatus === 'escalated') {
          query = query.eq('is_escalated', true);
        } else {
          query = query.eq('status', filteredStatus as IssueStatus);
        }
      }

      const { data, error } = await query;

      if (error) {
        setError(error.message);
      } else {
        setIssues(data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to query official triage queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficialQueue();
  }, [filteredStatus, isConfigured]);

  const activeCount = issues.filter(
    (i) => !['resolved', 'rejected', 'duplicate'].includes(i.status)
  ).length;
  const escalatedCount = issues.filter((i) => i.is_escalated).length;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-forest-700 font-semibold">
              Municipal Operations Console
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-[11px] font-mono text-stone-500 uppercase">
              Role: {role.replace('_', ' ')}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            Issue Triage &amp; Management Queue
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Official: <span className="font-mono text-stone-900 font-medium">{profile?.full_name || user?.email}</span>{' '}
            {profile?.department?.name && `• Department: ${profile.department.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOfficialQueue}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {!isConfigured && (
        <div className="mt-6">
          <ConfigAlert />
        </div>
      )}

      {/* Operational Metrics Bar (Real Data Only) */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-stone-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
              Active Queue Tickets
            </span>
            <Inbox className="w-4 h-4 text-stone-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-stone-900 mt-2 tabular-nums">
            {isLoading ? '...' : activeCount}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">
            Issues requiring triage or in active repair
          </span>
        </Card>

        <Card className="border-stone-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
              SLA Overdue Escalations
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="font-mono text-2xl font-bold text-rose-700 mt-2 tabular-nums">
            {isLoading ? '...' : escalatedCount}
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">
            Exceeded calendar hour resolution target
          </span>
        </Card>

        <Card className="border-stone-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
              Operational Roadmap
            </span>
            <Clock className="w-4 h-4 text-forest-700" />
          </div>
          <div className="font-sans text-xs font-medium text-stone-800 mt-2 leading-relaxed">
            Batch 3: Deduplication modal &amp; voting.<br />
            Batch 4: SLA assignment &amp; resolution photos.
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2 pb-2 border-b border-stone-200 text-xs">
        <span className="text-stone-500 font-mono flex items-center gap-1 mr-2 text-[11px]">
          <Filter className="w-3.5 h-3.5" /> Filter Status:
        </span>
        {['all', 'reported', 'verified', 'assigned', 'in_progress', 'resolved', 'escalated'].map(
          (statusKey) => (
            <button
              key={statusKey}
              onClick={() => setFilteredStatus(statusKey)}
              className={`px-2.5 py-1 rounded capitalize font-mono text-[11px] transition-colors ${
                filteredStatus === statusKey
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {statusKey}
            </button>
          )
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Query execution error</p>
            <p className="mt-0.5 text-rose-800">{error}</p>
          </div>
        </div>
      )}

      {/* Table / Empty State */}
      <div className="mt-6">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-forest-700 border-r-transparent align-[-0.125em]" />
            <p className="mt-2 text-xs text-stone-500 font-mono">Loading municipal queue...</p>
          </div>
        ) : issues.length === 0 ? (
          <Card className="text-center py-16 border-dashed border-stone-300">
            <CheckCircle className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              No tickets found in this view
            </h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto mt-1 leading-relaxed">
              There are currently no civic issues matching the selected status filter.
              As citizens submit reports in subsequent batches, incoming tickets will appear here for triage.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100/75 border-b border-stone-200 text-stone-700 font-mono uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Assigned Department</th>
                  <th className="px-4 py-3">SLA Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-sans">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-stone-900 tabular-nums">
                      {formatTicketNumber(issue.ticket_number)}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-900 max-w-xs truncate">
                      {issue.title}
                    </td>
                    <td className="px-4 py-3 capitalize text-stone-600">
                      {issue.category.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="status" status={issue.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="priority" priority={issue.priority} />
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {issue.assigned_department?.name || (
                        <span className="text-stone-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {issue.is_escalated ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[10px]">
                          <AlertTriangle className="w-3 h-3" /> Escalated
                        </span>
                      ) : issue.deadline ? (
                        <span className="text-stone-600 text-[11px]">
                          Due: {formatDate(issue.deadline)}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">No SLA</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alert(`Ticket ${issue.ticket_number} management actions (Assignment, Duplicate Review, Resolution) will activate in Batches 3 & 4.`)}
                        className="text-[11px] py-1 px-2"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
