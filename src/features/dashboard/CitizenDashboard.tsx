import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { Issue } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfigAlert } from '@/components/ui/ConfigAlert';
import { formatDate, formatTicketNumber } from '@/lib/utils';
import { PlusCircle, FileText, AlertCircle, RefreshCw } from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { user, profile, isConfigured } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCitizenIssues = async () => {
    if (!isConfigured || !supabase || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setIssues(data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve your reported issues.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCitizenIssues();
  }, [user, isConfigured]);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-forest-700 font-semibold">
            Citizen Workspace
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            My Reported Issues
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Account: <span className="font-mono text-stone-800">{profile?.email || user?.email}</span> • Role:{' '}
            <span className="font-mono uppercase text-forest-800 font-semibold">Citizen / Community Member</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCitizenIssues}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => alert('The complete Issue Reporting module with Leaflet map coordinates and photo capture activates in Batch 2.')}
            className="flex items-center gap-1.5 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Report Civic Issue (Batch 2)
          </Button>
        </div>
      </div>

      {!isConfigured && (
        <div className="mt-6">
          <ConfigAlert />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Unable to fetch reports</p>
            <p className="mt-0.5 text-rose-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content: Loading, Empty, or List */}
      <div className="mt-6">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-forest-700 border-r-transparent align-[-0.125em]" />
            <p className="mt-2 text-xs text-stone-500 font-mono">Querying complaints ledger...</p>
          </div>
        ) : issues.length === 0 ? (
          <Card className="text-center py-16 border-dashed border-stone-300">
            <FileText className="w-10 h-10 text-stone-400 mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold text-stone-900">
              No civic complaints on record
            </h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto mt-1 leading-relaxed">
              You haven't submitted any civic issue reports yet. In Batch 2, you will be able to
              pin issues on the city map and upload photographic evidence directly to the municipal triage queue.
            </p>
            <div className="mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert('Issue Reporting form unlocks in Batch 2 according to IMPLEMENTATION_PLAN.md.')}
                className="text-xs"
              >
                Learn How Reporting Works
              </Button>
            </div>
          </Card>
        ) : (
          <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100/75 border-b border-stone-200 text-stone-700 font-mono uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Issue Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Community Score</th>
                  <th className="px-4 py-3">Logged At</th>
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
                    <td className="px-4 py-3 font-mono tabular-nums text-stone-600">
                      {issue.upvotes_count} votes • {issue.verifications_count} verified
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-mono tabular-nums whitespace-nowrap">
                      {formatDate(issue.created_at)}
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
