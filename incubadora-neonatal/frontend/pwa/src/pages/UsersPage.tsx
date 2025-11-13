import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    is_admin: false,
  });

  const BASE = (import.meta.env.VITE_API_BASE as string) || (location.origin + "/api/incubadora");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${BASE}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Error al cargar usuarios");
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const endpoint = formData.is_admin ? "/auth/create-admin" : "/auth/register";
      const response = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al crear usuario");
      }

      setShowCreateForm(false);
      setFormData({ username: "", email: "", password: "", is_admin: false });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAdmin = async (userId: number) => {
    try {
      const response = await fetch(`${BASE}/auth/users/${userId}/toggle-admin`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Error al actualizar");
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const response = await fetch(`${BASE}/auth/users/${userId}/toggle-active`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Error al actualizar");
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Estas seguro de eliminar este usuario?")) return;
    try {
      const response = await fetch(`${BASE}/auth/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Error al eliminar");
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gestion de Usuarios</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showCreateForm ? "Cancelar" : "Crear Usuario"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Crear Nuevo Usuario</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-md px-3 py-2"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full border rounded-md px-3 py-2"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contrasena
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full border rounded-md px-3 py-2"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_admin"
                className="mr-2"
                checked={formData.is_admin}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
              />
              <label htmlFor="is_admin" className="text-sm text-slate-700">
                Usuario Administrador
              </label>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Crear Usuario
            </button>
          </form>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-slate-600">Cargando...</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Creado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_admin ? (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-slate-100 text-slate-800 rounded">
                        Cliente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        Activo
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleToggleAdmin(user.id)}
                      className="text-blue-600 hover:text-blue-800"
                      title={user.is_admin ? "Quitar admin" : "Hacer admin"}
                    >
                      {user.is_admin ? "Quitar Admin" : "Hacer Admin"}
                    </button>
                    <button
                      onClick={() => handleToggleActive(user.id)}
                      className="text-orange-600 hover:text-orange-800"
                      title={user.is_active ? "Desactivar" : "Activar"}
                    >
                      {user.is_active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

