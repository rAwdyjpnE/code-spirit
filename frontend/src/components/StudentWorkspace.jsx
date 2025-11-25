import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Play, Loader2, Wifi, WifiOff } from 'lucide-react';
import CodeEditor from './CodeEditor';
import TaskDisplay from './TaskDisplay';
import TestResults from './TestResults';

const StudentWorkspace = () => {
  const { userId } = useParams();
  const [task, setTask] = useState(null);
  const [code, setCode] = useState('');
  const [submission, setSubmission] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const typingTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const handleWsMessage = useCallback((data) => {
    console.log('WS Message:', data);
    if (data.type === 'task_assigned') {
      setTask(data.task);
      setCode(data.task.template || '');
    }
  }, []);

  const { isConnected, sendMessage } = useWebSocket(`/ws/student/${userId}`, handleWsMessage);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const currentTask = await api.getTask(userId);
        if (currentTask) {
          setTask(currentTask);
          setCode((prev) => prev || currentTask.template || '');
        }
      } catch (error) {
        console.error('Failed to fetch task:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [userId]);

  const handleCodeChange = useCallback((value) => {
    setCode(value);
    lastActivityRef.current = Date.now();

    sendMessage({
      type: 'code_update',
      code: value
    });

    sendMessage({ type: 'status_update', status: 'typing' });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      sendMessage({ type: 'status_update', status: 'online' });
    }, 2000);
  }, [sendMessage]);

  useEffect(() => {
    const afkInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 5 * 60 * 1000) {
        sendMessage({ type: 'status_update', status: 'afk' });
      }
    }, 30000);

    return () => clearInterval(afkInterval);
  }, [sendMessage]);

  const handleSubmit = async () => {
    if (!task) return;
    
    setIsRunning(true);
    setSubmission({ status: 'running' });

    try {
      const result = await api.submitSolution(userId, task.id, code);
      setSubmission(result);
    } catch (error) {
      setSubmission({
        status: 'error',
        error_message: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-white overflow-hidden">
      <header className="h-14 border-b border-slate-700 flex items-center justify-between px-4 bg-surface z-10">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg text-primary">Code Spirit</h1>
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span>{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isRunning || !task}
          className={`btn btn-primary flex items-center gap-2 ${
            isRunning ? 'opacity-70 cursor-wait' : ''
          }`}
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          Запустить
        </button>
      </header>

      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        <div className="col-span-4 h-full overflow-hidden">
          <TaskDisplay task={task} />
        </div>
        <div className="col-span-8 h-full flex flex-col border-l border-slate-700">
          <div className="flex-1 overflow-hidden relative">
            <CodeEditor 
              code={code} 
              onChange={handleCodeChange} 
            />
          </div>
          <TestResults submission={submission} />
        </div>
      </div>
    </div>
  );
};

export default StudentWorkspace;