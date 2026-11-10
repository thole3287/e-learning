import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { User, UserRole } from '../../types';
import { Search, Plus, Filter, Trash2, CheckCircle, XCircle } from 'lucide-react';

export const UsersManagementView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'student' as UserRole,
    code: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res: any = await api.get('/users', { params });
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/users', formData);
      if (res.success) {
        setShowModal(false);
        setFormData({ username: '', email: '', password: '', full_name: '', role: 'student', code: '' });
        fetchUsers();
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi tạo người dùng.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || 'Xóa thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Tài Khoản Người Dùng</h1>
          <p className="text-sm text-slate-500 mt-1">Quản trị phân quyền tài khoản Giáo viên, Học sinh và Quản trị viên</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Người Dùng Mới</span>
        </button>
      </div>

      {/* Bộ lọc và Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên, email, username hoặc mã định danh..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tất cả vai trò</option>
            <option value="super_admin">Quản trị viên</option>
            <option value="teacher">Giáo viên</option>
            <option value="student">Học sinh</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách người dùng */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Họ và Tên</th>
                <th className="px-6 py-3.5">Tên đăng nhập / Mã</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Vai trò</th>
                <th className="px-6 py-3.5">Trạng thái</th>
                <th className="px-6 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{u.full_name}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-slate-700">{u.username}</span>
                      {u.code && <span className="ml-1 text-[11px] text-slate-400">({u.code})</span>}
                    </td>
                    <td className="px-6 py-3.5">{u.email}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        u.role === 'super_admin' ? 'bg-rose-100 text-rose-700' :
                        u.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Hoạt động
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {u.role !== 'super_admin' && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Không tìm thấy người dùng nào phù hợp</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Người Dùng */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-4 sm:p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Thêm Người Dùng Mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên đăng nhập *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="nguyenvanan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã học sinh/GV</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="HS202611"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="an.nguyen@elearning.vn"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu ban đầu *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="student">Học sinh</option>
                  <option value="teacher">Giáo viên</option>
                  <option value="super_admin">Quản trị viên</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-xs"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
