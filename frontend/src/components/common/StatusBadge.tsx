import React from 'react';
import { Badge } from '../ui/Badge';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ClipboardCheck, 
  AlertCircle, 
  XCircle,
  RotateCcw
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'Verified':
    case 'Approved':
    case 'Completed':
    case 'Accepted':
      return (
        <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />} className={className}>
          {status}
        </Badge>
      );

    case 'AI_Evaluated':
      return (
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />} className={className}>
          AI Evaluated
        </Badge>
      );

    case 'Faculty_Evaluated':
      return (
        <Badge variant="primary" size="sm" icon={<ClipboardCheck className="w-3.5 h-3.5" />} className={className}>
          Faculty Evaluated
        </Badge>
      );

    case 'Pending':
    case 'Submitted':
      return (
        <Badge variant="slate" size="sm" icon={<Clock className="w-3.5 h-3.5" />} className={className}>
          {status}
        </Badge>
      );

    case 'Returned':
      return (
        <Badge variant="amber" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} className={className}>
          Returned
        </Badge>
      );

    case 'Incomplete':
      return (
        <Badge variant="amber" size="sm" icon={<AlertCircle className="w-3.5 h-3.5" />} className={className}>
          Incomplete
        </Badge>
      );

    case 'Absent':
    case 'Rejected':
    case 'Error':
      return (
        <Badge variant="error" size="sm" icon={<XCircle className="w-3.5 h-3.5" />} className={className}>
          {status}
        </Badge>
      );

    default:
      return (
        <Badge variant="slate" size="sm" className={className}>
          {status}
        </Badge>
      );
  }
};
