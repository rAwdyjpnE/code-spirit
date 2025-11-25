import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Terminal } from 'lucide-react';

const TestResults = ({ submission }) => {
  if (!submission) return null;

  const { status, test_results, error_message, execution_time } = submission;
  const isError = status === 'error';
  const isSuccess = status === 'success';

  return (
    <div className="bg-surface border-t border-slate-700 h-64 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Результаты выполнения</span>
        </div>
        {execution_time && (
          <span className="text-xs text-slate-500 font-mono">
            {execution_time.toFixed(3)}s
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {isError && error_message && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 mb-4">
            <div className="flex items-center gap-2 mb-1 font-bold">
              <AlertTriangle className="w-4 h-4" />
              Ошибка выполнения
            </div>
            <pre className="whitespace-pre-wrap text-xs opacity-90">{error_message}</pre>
          </div>
        )}
        {test_results && (
          <div className="space-y-2">
            {test_results?.map((test, idx) => {
              const isPassed = test.status === 'passed';
              
              return (
                <div 
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isPassed 
                      ? 'bg-green-500/5 border-green-500/20' 
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="mt-0.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
                        Тест #{idx + 1}
                      </span>
                      {!isPassed && (
                        <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Failed</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Input:</span>
                      <span className="text-slate-300">{JSON.stringify(test.input)}</span>
                      
                      <span>Expected:</span>
                      <span className="text-slate-300">{JSON.stringify(test.expected)}</span>

                      {!isPassed && test.actual !== undefined && (
                        <>
                          <span className="text-red-400">Actual:</span>
                          <span className="text-red-300">{JSON.stringify(test.actual)}</span>
                        </>
                      )}
                      
                      {test.error && (
                        <div className="col-span-2 mt-1 text-red-400 bg-red-950/30 p-1 rounded">
                          {test.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isSuccess && !error_message && (
          <div className="flex flex-col items-center justify-center h-full text-green-500 py-4">
            <CheckCircle2 className="w-12 h-12 mb-2 opacity-20" />
            <span className="font-bold text-lg">Все тесты пройдены! 🎉</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;