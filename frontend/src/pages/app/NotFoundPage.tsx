import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Home, ArrowLeft, ShieldAlert } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-5 border-[#243047] shadow-elevated">
        <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono font-bold text-purple-400 tracking-widest uppercase">
            Error 404
          </span>
          <h1 className="text-2xl font-bold text-slate-100">Page Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The requested evaluation workspace, classroom, or project report route does not exist or has been archived.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
              Dashboard
            </Button>
          </Link>
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
