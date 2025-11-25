import React from 'react';
import { BookOpen, Clock, BarChart } from 'lucide-react';

const TaskDisplay = ({ task }) => {
  if (!task) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-secondary p-8 text-center border-r border-slate-700">
        <BookOpen className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-xl font-semibold mb-2">Нет активного задания</h3>
        <p>Ожидайте, пока преподаватель назначит вам задачу.</p>
      </div>
    );
  }

  const difficultyColor = {
    easy: 'text-green-400 bg-green-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    hard: 'text-red-400 bg-red-400/10'
  }[task.difficulty] || 'text-slate-400 bg-slate-400/10';

  return (
    <div className="h-full overflow-y-auto p-6 border-r border-slate-700 bg-surface/50">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${difficultyColor}`}>
            {task.difficulty}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{task.time_limit} сек</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">{task.title}</h2>
        
        <div className="prose prose-invert prose-sm max-w-none text-slate-300">
          <p className="whitespace-pre-wrap">{task.description}</p>
        </div>
      </div>

      {task.test_cases && task.test_cases.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Примеры</h3>
          <div className="space-y-3">
            {task.test_cases.slice(0, 2).map((test, idx) => (
              <div key={idx} className="bg-background rounded-lg p-3 text-sm font-mono border border-slate-700/50">
                <div className="flex gap-2 mb-1">
                  <span className="text-blue-400">Input:</span>
                  <span className="text-slate-300">{JSON.stringify(test.input).slice(1, -1)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-400">Output:</span>
                  <span className="text-slate-300">{JSON.stringify(test.expected)}</span>
                </div>
                {test.description && (
                  <div className="mt-1 text-slate-500 text-xs italic border-t border-slate-700/50 pt-1">
                    // {test.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDisplay;