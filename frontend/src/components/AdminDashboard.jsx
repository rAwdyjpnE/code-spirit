import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Users, Share2, Play, LogOut, Copy, Check, Settings } from 'lucide-react';
import StudentCard from './StudentCard';
import TasksManager from './TasksManager';

const AdminDashboard = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);

  const token = localStorage.getItem('admin_token');
  const joinUrl = `${window.location.origin}/register?session_id=${sessionId}`;

  const fetchStudents = useCallback(async () => {
    try {
      const data = await api.getStudents(token);
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      if (error.status === 401) navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchStudents();
  }, [fetchStudents, token, navigate]);

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'student_update') {
      setStudents(prev => {
        const index = prev.findIndex(s => s.id === data.user_id);
        if (index === -1) {
          fetchStudents();
          return prev;
        }
        const newStudents = [...prev];
        newStudents[index] = {
          ...newStudents[index],
          status: data.status,
          is_online: data.status !== 'offline',
        };
        return newStudents;
      });
    }
  }, [fetchStudents]);

  useWebSocket(`/ws/admin/${sessionId}`, handleWsMessage);

  const handleAssignTasks = async () => {
    setAssigning(true);
    try {
      await api.assignTasks(token);
    } catch (error) {
      console.error('Assign error:', error);
    } finally {
      setAssigning(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-10 text-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-background text-white p-6">
      <header className="flex items-center justify-between mb-8 pb-6 border-b border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Users className="w-6 h-6" /> Панель преподавателя
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">Session: {sessionId}</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleAssignTasks}
            disabled={assigning}
            className="btn btn-primary flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> 
            {assigning ? 'Раздаем...' : 'Раздать задания'}
          </button>
          
          <button 
            onClick={() => setShowTaskManager(true)}
            className="btn btn-secondary"
            title="Управление задачами"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button 
            onClick={() => {
              localStorage.removeItem('admin_token');
              navigate('/');
            }}
            className="btn btn-secondary"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="card bg-surface p-6 text-center">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5 text-blue-400" /> Подключение
            </h3>
            
            <div className="bg-white p-2 rounded-lg inline-block mb-4">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-3 break-all text-xs font-mono text-slate-400">
              {joinUrl}
            </div>
            
            <button 
              onClick={copyLink}
              className="btn btn-secondary w-full text-sm py-1.5 flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Скопировано' : 'Копировать ссылку'}
            </button>
          </div>

          <div className="card bg-surface p-4">
            <h3 className="font-bold mb-3 text-slate-300">Статистика</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Всего студентов:</span>
                <span className="font-mono">{students.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Онлайн:</span>
                <span className="font-mono text-green-400">
                  {students.filter(s => s.is_online).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <h2 className="text-xl font-bold mb-4">Студенты</h2>
          
          {students.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Пока никого нет. Попросите студентов подключиться.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {students.map(student => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showTaskManager && (
        <TasksManager onClose={() => setShowTaskManager(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;