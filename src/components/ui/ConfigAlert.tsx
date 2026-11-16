import React from 'react';
import { AlertTriangle, KeyRound } from 'lucide-react';

export const ConfigAlert: React.FC = () => {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 text-amber-900 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900">Supabase Backend Configuration Required</p>
          <p className="mt-1 text-amber-800 leading-relaxed">
            CivicSync requires active Supabase PostgreSQL and Auth credentials to process authentication and real data.
            Mock authentication has been strictly disabled per engineering guidelines.
          </p>
          <div className="mt-3 p-3 bg-amber-100/70 rounded border border-amber-200 text-xs font-mono text-stone-800">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-1">
              <KeyRound className="h-3.5 w-3.5" /> Required Environment Variables (.env):
            </div>
            <div>VITE_SUPABASE_URL=https://[your-project-id].supabase.co</div>
            <div>VITE_SUPABASE_ANON_KEY=eyJhbGciOi...[your-anon-key]</div>
          </div>
          <p className="mt-2 text-xs text-amber-800">
            Refer to <span className="font-mono font-medium">DATABASE_DESIGN.md</span> for the full schema migration script.
          </p>
        </div>
      </div>
    </div>
  );
};

