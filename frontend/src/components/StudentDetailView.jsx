import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { ArrowLeft, Terminal, Wifi } from 'lucide-react';
import CodeEditor from './CodeEditor';
import TestResults from './TestResults';

const StudentDetailView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveCode, setLiveCode] = useState('');
  const [tasks, setTasks] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const token = localStorage.getItem('admin_token');

  const fetchStudentData = useCallback(async () => {
    try {
      const data = await api.getStudentDetail(token, studentId);
      setStudent(data);
      setSessionId(data.session_id);
      setLiveCode(data.last_submission?.code || data.current_task?.template || '');
    } catch (error) {
      console.error('Error fetching student:', error);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [token, studentId, navigate]);

  useEffect(() => {
    if (token) {
      fetchStudentData();
      api.getAllTasks(token).then(setTasks);
    }
  }, [token, fetchStudentData]);

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'live_code_update' && data.user_id === studentId) {
      setLiveCode(data.code);
    } else if (data.type === 'student_update' && data.user_id === studentId) {
      setStudent(prev => ({
        ...prev,
        status: data.status,
        is_online: data.status !== 'offline'
      }));
    }
  }, [studentId]);

  const { sendMessage } = useWebSocket(
    sessionId ? `/ws/admin/${sessionId}` : null, 
    handleWsMessage
  );

  useEffect(() => {
    if (sessionId) {
      const timer = setTimeout(() => {
        sendMessage({
          type: 'view_student',
          student_id: studentId
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sessionId, studentId, sendMessage]);

  const handleManualAssign = async (taskId) => {
    if (!taskId) {
        if (!confirm('Выдать новую случайную задачу? Прогресс текущей будет сброшен.')) return;
    } else {
        if (!confirm('Сменить задачу студенту? Прогресс текущей будет сброшен.')) return;
    }
    await api.assignManualTask(token, studentId, taskId);
    fetchStudentData();
  };

  if (loading || !student) {
    return <div className="p-10 text-center">Загрузка данных студента...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background text-white">
      <header className="h-14 border-b border-slate-700 flex items-center justify-between px-4 bg-surface">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              {student.name}
              <span className={`w-2 h-2 rounded-full ${student.is_online ? 'bg-green-500' : 'bg-slate-500'}`} />
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>ID: {student.id.slice(0, 8)}</span>
              <span>•</span>
              <span className="uppercase">{student.status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select 
            onChange={(e) => handleManualAssign(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1 text-slate-300 outline-none"
            value=""
          >
            <option value="" disabled>Выдать задачу...</option>
            <option value="">🎲 Случайная</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>

          {student.current_task ? (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">{student.current_task.title}</span>
            </div>
          ) : (
            <span className="text-sm text-slate-500">Нет активной задачи</span>
          )}
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden h-full">
        <div className="lg:col-span-2 h-full border-r border-slate-700 flex flex-col">
          <div className="bg-slate-900 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex justify-between">
            <span>LIVE PREVIEW (READ ONLY)</span>
            {student.status === 'typing' && (
              <span className="text-blue-400 animate-pulse">Typing...</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden relative">
            <CodeEditor 
              code={liveCode} 
              readOnly={true} 
              onChange={() => {}}
            />
            {!student.is_online && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-surface border border-slate-600 px-4 py-2 rounded-lg shadow-xl flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 text-sm">Студент офлайн</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 bg-surface overflow-y-auto">
          <div className="p-6 space-y-6">
            {student.current_task && (
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Задача</h3>
                <div className="bg-background rounded-lg p-4 border border-slate-700">
                  <h4 className="font-bold mb-2">{student.current_task.title}</h4>
                  <p className="text-sm text-slate-400 line-clamp-4">
                    {student.current_task.description}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                Последняя попытка
              </h3>
              {student.last_submission ? (
                <div className="bg-background rounded-lg border border-slate-700 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <span className={`text-sm font-bold ${
                      student.last_submission.status === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {student.last_submission.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(student.last_submission.submitted_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    <TestResults submission={student.last_submission} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
                  Нет решений
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailView;