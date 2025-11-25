import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Clock, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';

const StudentCard = ({ student }) => {
  const navigate = useNavigate();

  const getStatusColor = () => {
    if (!student.is_online) return 'border-slate-700 bg-slate-800/50 opacity-60';
    switch (student.status) {
      case 'typing': return 'border-blue-500 bg-blue-500/5';
      case 'afk': return 'border-yellow-500 bg-yellow-500/5';
      default: return 'border-slate-600 bg-surface';
    }
  };

  const statusColor = getStatusColor();

  return (
    <div 
      onClick={() => navigate(`/admin/student/${student.id}`)}
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg
        ${statusColor}
      `}
    >
      <div className="absolute top-3 right-3 flex gap-2">
        {student.status === 'typing' && (
          <span className="animate-pulse text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <Terminal className="w-3 h-3" /> Typing
          </span>
        )}
        <div className={`w-2.5 h-2.5 rounded-full ${student.is_online ? 'bg-green-500' : 'bg-slate-500'}`} />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-300">
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-bold text-white leading-tight">{student.name}</h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {student.id.slice(0, 8)}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {new Date(student.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>

      </div>
    </div>
  );
};

export default StudentCard;