import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { X, Plus, Trash2, Edit, Save, AlertCircle } from 'lucide-react';

const TasksManager = ({ onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [formError, setFormError] = useState('');
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.getAllTasks(token);
      setTasks(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditClick = (task) => {
    setEditingTask(task);
    const formattedTestCases = (task.spec.tests || []).map(tc => ({
      ...tc,
      input: JSON.stringify(tc.input || tc.args || []),
      kwargs: JSON.stringify(tc.kwargs || {}),
      expected: JSON.stringify(tc.expected)
    }));
    setTestCases(formattedTestCases);
  };

  const handleCreateClick = () => {
    const newTask = { 
      id: `task_${Date.now()}`, 
      title: '',
      description: '',
      difficulty: 'medium',
      time_limit: 2,
      template: '',
      spec: { tests: [] }
    };
    setEditingTask(newTask);
    setTestCases([]);
  };

  const handleTestCaseChange = (index, field, value) => {
    const newTestCases = [...testCases];
    newTestCases[index][field] = value;
    setTestCases(newTestCases);
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '[]', kwargs: '{}', expected: 'null', description: '' }]);
  };

  const removeTestCase = (index) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleDelete = async (taskId) => {
    if(!confirm('Удалить задачу?')) return;
    await api.deleteTask(token, taskId);
    loadTasks();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    const formData = new FormData(e.target);

    const processedTestCases = [];
    for (const tc of testCases) {
      try {
        const inputVal = tc.input.trim() ? JSON.parse(tc.input) : [];
        const kwargsVal = tc.kwargs.trim() ? JSON.parse(tc.kwargs) : {};
        const expectedVal = JSON.parse(tc.expected);

        processedTestCases.push({
          input: inputVal,
          kwargs: kwargsVal,
          expected: expectedVal,
          description: tc.description
        });
      } catch (err) {
        setFormError(`Ошибка JSON в тест-кейсе: ${err.message}. Проверьте скобки и кавычки.`);
        return;
      }
    }

    let entrySpec;
    try {
        entrySpec = JSON.parse(formData.get('spec_entry'));
    } catch (err) {
        setFormError('Ошибка JSON в поле "Спецификация entry"');
        return;
    }

    const taskData = {
      id: formData.get('id'),
      title: formData.get('title'),
      description: formData.get('description'),
      difficulty: formData.get('difficulty'),
      time_limit: parseInt(formData.get('time_limit')),
      template: formData.get('template'),
      spec: {
        language: "python",
        entry: entrySpec,
        tests: processedTestCases
      }
    };

    try {
      if (editingTask.id && tasks.find(t => t.id === editingTask.id)) {
        await api.updateTask(token, editingTask.id, taskData);
      } else {
        await api.createTask(token, taskData);
      }
      setEditingTask(null);
      loadTasks();
    } catch (err) {
      setFormError('Ошибка сохранения: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface w-full max-w-5xl max-h-[90vh] rounded-xl border border-slate-700 flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">Управление задачами</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!editingTask ? (
            <div>
              <button onClick={handleCreateClick} className="btn btn-primary w-full mb-6 flex justify-center items-center gap-2">
                <Plus className="w-5 h-5" /> Добавить новую задачу
              </button>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="p-3 bg-background rounded-lg border border-slate-700 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">{task.title}</div>
                      <div className="text-xs text-slate-400 font-mono">{task.id} • {task.difficulty}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(task)} className="p-2 hover:bg-slate-700 rounded text-blue-400" title="Редактировать"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-2 hover:bg-slate-700 rounded text-red-400" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <div className="bg-red-500/10 text-red-300 text-sm p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> {formError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ID Задачи</label>
                  <input name="id" defaultValue={editingTask.id} className="input-field font-mono" required readOnly={!!tasks.find(t => t.id === editingTask.id)} />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Название</label>
                  <input name="title" defaultValue={editingTask.title} className="input-field" required />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Сложность</label>
                  <select name="difficulty" defaultValue={editingTask.difficulty || 'medium'} className="input-field">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Лимит времени (сек)</label>
                  <input name="time_limit" type="number" defaultValue={editingTask.time_limit || 2} className="input-field" required />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Описание</label>
                <textarea name="description" defaultValue={editingTask.description} className="input-field h-24" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Шаблон кода</label>
                    <textarea name="template" defaultValue={editingTask.template} className="input-field h-32 font-mono text-xs" />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Спецификация `entry` (JSON)</label>
                    <textarea name="spec_entry" defaultValue={JSON.stringify(editingTask.spec?.entry || {}, null, 2)} className="input-field h-32 font-mono text-xs" required />
                    <p className="text-[10px] text-slate-500 mt-1">Пример: {`{"type": "function", "name": "add", "params": ["a", "b"]}`}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-700">
                <h3 className="text-lg font-semibold">Тест-кейсы</h3>
                {testCases.map((tc, index) => (
                  <div key={index} className="p-4 bg-background rounded-lg border border-slate-700 relative">
                    <button type="button" onClick={() => removeTestCase(index)} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Input (Args Array)</label>
                        <textarea 
                            value={tc.input} 
                            onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)} 
                            className="input-field font-mono text-xs h-20" 
                            placeholder='[1, 2]' 
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Kwargs (Object)</label>
                        <textarea 
                            value={tc.kwargs} 
                            onChange={(e) => handleTestCaseChange(index, 'kwargs', e.target.value)} 
                            className="input-field font-mono text-xs h-20" 
                            placeholder='{}' 
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Expected</label>
                        <textarea 
                            value={tc.expected} 
                            onChange={(e) => handleTestCaseChange(index, 'expected', e.target.value)} 
                            className="input-field font-mono text-xs h-20" 
                            placeholder='3' 
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Описание (опционально)</label>
                      <input type="text" value={tc.description} onChange={(e) => handleTestCaseChange(index, 'description', e.target.value)} className="input-field font-mono text-xs" placeholder="Проверка суммы положительных чисел" />
                    </div>
                  </div>
                ))}
                
                <button type="button" onClick={addTestCase} className="btn btn-secondary w-full flex justify-center items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Добавить тест-кейс
                </button>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setEditingTask(null)} className="btn btn-secondary flex-1">Отмена</button>
                <button type="submit" className="btn btn-primary flex-1 flex justify-center items-center gap-2"><Save className="w-4 h-4" /> Сохранить</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksManager;