import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfigAlert } from '@/components/ui/ConfigAlert';
import {
  MapPin,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  BarChart2,
  ChevronRight,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, role, isConfigured } = useAuth();

  return (
    <div className="flex-1 flex flex-col">
      {/* Configuration notice if database is unconfigured */}
      {!isConfigured && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
          <ConfigAlert />
        </div>
      )}

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 border-b border-stone-200 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-mono mb-6">
              <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse" />
              Civic Infrastructure Platform • Batch 1 Active
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-stone-900 tracking-tight leading-[1.15]">
              Public Infrastructure,{' '}
              <span className="italic font-normal text-forest-700">Accountable</span>{' '}
              Resolution.
            </h1>

            <p className="mt-6 text-lg text-stone-600 leading-relaxed max-w-2xl">
              CivicSync bridges citizens and municipal authorities with an operational
              pipeline: geo-tagged reporting, PostGIS duplicate detection, community consensus
              verification, and server-side SLA escalation tracking.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/transparency">
                <Button variant="primary" size="lg" className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" />
                  View Public Transparency
                </Button>
              </Link>

              {user ? (
                <Link to={role === 'official' || role === 'department_staff' ? '/official' : '/citizen'}>
                  <Button variant="secondary" size="lg" className="flex items-center gap-2">
                    Enter Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button variant="outline" size="lg" className="flex items-center gap-2">
                    Sign In to Portal
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-16 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-xs uppercase font-mono tracking-wider text-forest-700 font-semibold">
              Operational Pipeline
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-stone-900 mt-1">
              Engineering Public Accountability
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="flex flex-col border-stone-200">
              <div className="w-9 h-9 rounded bg-forest-50 border border-forest-200 flex items-center justify-center text-forest-800 mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                1. Geo-Tagged Reporting
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Citizens submit complaints with precise Leaflet map coordinates, reverse-geocoded
                addresses, and tamper-resistant photographic evidence.
              </p>
            </Card>

            <Card className="flex flex-col border-stone-200">
              <div className="w-9 h-9 rounded bg-forest-50 border border-forest-200 flex items-center justify-center text-forest-800 mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                2. PostGIS Deduplication
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Automated 75-metre spatial query via GiST spatial indexes identifies repeated complaints,
                preventing ticket inflation and focusing work crews.
              </p>
            </Card>

            <Card className="flex flex-col border-stone-200">
              <div className="w-9 h-9 rounded bg-forest-50 border border-forest-200 flex items-center justify-center text-forest-800 mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                3. Community Consensus
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Independent voting and ground-truth verification. Thresholds trigger documented,
                non-silent priority escalations logged in the activity audit trail.
              </p>
            </Card>

            <Card className="flex flex-col border-stone-200">
              <div className="w-9 h-9 rounded bg-forest-50 border border-forest-200 flex items-center justify-center text-forest-800 mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                4. SLA Server Escalation
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Calendar-hour deadlines per category (48h–120h). Scheduled server-side routines flag
                overdue tickets and mandate post-repair verification photos.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Role Navigation Banners */}
      <section className="py-16 bg-stone-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2 text-stone-800 mb-3">
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-stone-100 border border-stone-200 font-semibold">
                  Citizen
                </span>
              </div>
              <h4 className="font-serif text-lg font-semibold text-stone-900">
                Citizen Portal
              </h4>
              <p className="text-xs text-stone-600 mt-2 mb-4 leading-relaxed">
                Report infrastructure hazards, review status updates from municipal crews, and verify issues in your neighborhood.
              </p>
              <Link to="/citizen">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Access Citizen Hub &rarr;
                </Button>
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2 text-stone-800 mb-3">
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-forest-50 border border-forest-200 text-forest-800 font-semibold">
                  Official
                </span>
              </div>
              <h4 className="font-serif text-lg font-semibold text-stone-900">
                Municipal Operations Console
              </h4>
              <p className="text-xs text-stone-600 mt-2 mb-4 leading-relaxed">
                Triage incoming complaints, review spatial duplicate candidates, route to departments, and monitor SLA timers.
              </p>
              <Link to="/official">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Access Official Console &rarr;
                </Button>
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2 text-stone-800 mb-3">
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 font-semibold">
                  Public
                </span>
              </div>
              <h4 className="font-serif text-lg font-semibold text-stone-900">
                Public Transparency
              </h4>
              <p className="text-xs text-stone-600 mt-2 mb-4 leading-relaxed">
                Open government analytics, citywide resolution rates, and departmental response performance with full PII redaction.
              </p>
              <Link to="/transparency">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Public Metrics &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
