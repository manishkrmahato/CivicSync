import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-stone-200 bg-stone-100/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-900 text-sm">CivicSync</span>
            <span className="text-stone-300">|</span>
            <span className="text-xs text-stone-500 font-mono">
              Municipal Issue Resolution & Infrastructure System
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-stone-600">
            <Link to="/transparency" className="hover:text-stone-900 underline underline-offset-4">
              Public Transparency
            </Link>
            <span className="text-stone-300">•</span>
            <span className="text-stone-500 font-mono">
              PostGIS Spatial &amp; SLA Enforced
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-stone-500">Group-10 Engineering</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

