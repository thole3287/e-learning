import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response: any = await api.post('/auth/login', {
        login: loginInput,
        password: password,
      });

      if (response.success) {
        login(response.data.user, response.data.token);

        // Chuyển hướng theo vai trò
        const role = response.data.user.role;
        if (role === 'super_admin') {
          navigate('/admin/dashboard');
        } else if (role === 'teacher') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err: any) {
      setError(err?.errors?.login?.[0] || err?.message || 'Đăng nhập không thành công.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-600/30">
            E
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Hệ Thống Thi Trực Tuyến</h2>
          <p className="text-sm text-slate-400">Đăng nhập tài khoản để vào phòng thi hoặc quản trị</p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Tài khoản hoặc Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2 cursor-pointer"
          >
            <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
