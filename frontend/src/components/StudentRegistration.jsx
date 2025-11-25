import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { User, KeyRound, ArrowRight, Loader2 } from 'lucide-react';

const StudentRegistration = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sid = searchParams.get('session_id');
    if (sid) {
      setSessionId(sid);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !sessionId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const user = await api.registerStudent(name, sessionId);
      localStorage.setItem('code_spirit_user_id', user.id);
      localStorage.setItem('code_spirit_session_id', sessionId);

      navigate(`/student/${user.id}`);
    } catch (err) {
      setError(err.message || 'Ошибка регистрации. Проверьте ID сессии.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Присоединиться</h1>
          <p className="text-secondary">Введите имя и ID сессии для начала</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Ваше имя</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                className="input-field pl-10"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">ID Сессии</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="uuid-..."
                className="input-field pl-10 font-mono text-sm"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Начать <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistration;