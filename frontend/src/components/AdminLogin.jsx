import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Shield, Key, ArrowRight, Loader2, PlusCircle } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [sessionId, setSessionId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const session = await api.createSession(password);
        const { access_token } = await api.adminLogin(session.id, password);
        localStorage.setItem('admin_token', access_token);
        navigate(`/admin/dashboard/${session.id}`);
      } else {
        const { access_token } = await api.adminLogin(sessionId, password);
        localStorage.setItem('admin_token', access_token);
        navigate(`/admin/dashboard/${sessionId}`);
      }
    } catch (err) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {mode === 'create' ? 'Новая лекция' : 'Вход для преподавателя'}
          </h1>
          <p className="text-secondary text-sm">
            {mode === 'create' 
              ? 'Создайте пароль для новой сессии' 
              : 'Введите ID сессии и пароль'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'login' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">ID Сессии</label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="input-field font-mono"
                placeholder="uuid-..."
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Пароль</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            {mode === 'create' ? 'Создать и войти' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-700 text-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'create' : 'login')}
            className="text-sm text-primary hover:text-blue-400 flex items-center justify-center gap-2 mx-auto"
          >
            {mode === 'login' ? (
              <>
                <PlusCircle className="w-4 h-4" /> Создать новую сессию
              </>
            ) : (
              'Вернуться ко входу'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;