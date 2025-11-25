import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import StudentRegistration from './components/StudentRegistration';
import StudentWorkspace from './components/StudentWorkspace';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import StudentDetailView from './components/StudentDetailView';

const Home = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-background relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]"></div>
    </div>

    <div className="z-10 max-w-2xl">
      <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Code Spirit 🐍
      </h1>
      <p className="text-xl text-slate-400 mb-12 leading-relaxed">
        Интерактивная платформа для обучения Python в реальном времени.
        Проводите лекции, раздавайте задания и наблюдайте за прогрессом студентов.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-6 justify-center">
        <a 
          href="/register" 
          className="btn btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2 transform hover:scale-105 transition-all"
        >
          Я Студент
        </a>
        <a 
          href="/admin/login" 
          className="btn btn-secondary text-lg px-8 py-4 flex items-center justify-center gap-2 transform hover:scale-105 transition-all"
        >
          Я Преподаватель
        </a>
      </div>
    </div>
    
    <footer className="absolute bottom-6 text-slate-600 text-sm">
      Built with FastAPI, React & Docker
    </footer>
  </div>
);

function App() {
  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/register" element={<StudentRegistration />} />
        <Route path="/student/:userId" element={<StudentWorkspace />} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard/:sessionId" element={<AdminDashboard />} />
        <Route path="/admin/student/:studentId" element={<StudentDetailView />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;