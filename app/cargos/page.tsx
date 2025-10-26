'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  LogOut,
  User
} from 'lucide-react';

interface Cargo {
  id: string;
  descricao: string;
  createdAt: string;
  updatedAt: string;
}

interface CargoForm {
  descricao: string;
}

export default function CargosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cargoToDelete, setCargoToDelete] = useState<Cargo | null>(null);

  const cargoForm = useForm<CargoForm>();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadCargos();
    }
  }, [session]);

  const loadCargos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cargo`);

      if (response.ok) {
        const cargosData = await response.json();
        setCargos(cargosData);
      } else {
        toast.error('Erro ao carregar cargos');
      }
    } catch (error) {
      toast.error('Erro ao carregar cargos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCargo = async (data: CargoForm) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cargo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Cargo criado com sucesso!');
        setShowCreateForm(false);
        cargoForm.reset();
        loadCargos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao criar cargo');
      }
    } catch (error) {
      toast.error('Erro ao criar cargo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCargo = (cargo: Cargo) => {
    setEditingCargo(cargo);
    cargoForm.reset({
      descricao: cargo.descricao
    });
    setShowCreateForm(true);
  };

  const handleUpdateCargo = async (data: CargoForm) => {
    if (!editingCargo) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cargo/${editingCargo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Cargo atualizado com sucesso!');
        setShowCreateForm(false);
        setEditingCargo(null);
        cargoForm.reset();
        loadCargos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao atualizar cargo');
      }
    } catch (error) {
      toast.error('Erro ao atualizar cargo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCargo = (cargo: Cargo) => {
    setCargoToDelete(cargo);
    setShowDeleteModal(true);
  };

  const confirmDeleteCargo = async () => {
    if (!cargoToDelete) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cargo/${cargoToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Cargo excluído com sucesso!');
        loadCargos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir cargo');
      }
    } catch (error) {
      toast.error('Erro ao excluir cargo');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setCargoToDelete(null);
    }
  };

  const cancelDeleteCargo = () => {
    setShowDeleteModal(false);
    setCargoToDelete(null);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Voltar</span>
              </button>
              <div className="flex items-center">
                <Briefcase className="h-8 w-8 text-indigo-600" />
                <h1 className="ml-2 text-2xl font-bold text-gray-900">
                  Gerenciar Cargos
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {session.user?.avatar ? (
                  <img
                    src={session.user.avatar}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {session.user?.name}
                </span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Cargos
            </h2>
            <p className="text-gray-600 mt-2">
              Gerencie os cargos disponíveis no sistema.
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setEditingCargo(null);
              cargoForm.reset();
            }}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Cargo</span>
          </button>
        </div>

        {/* Create/Edit Cargo Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCargo ? 'Editar Cargo' : 'Criar Novo Cargo'}
            </h3>
            <form onSubmit={cargoForm.handleSubmit(editingCargo ? handleUpdateCargo : handleCreateCargo)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição do Cargo
                </label>
                <input
                  {...cargoForm.register('descricao', { required: 'Descrição é obrigatória' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Gerente, Vendedor, Atendente"
                />
                {cargoForm.formState.errors.descricao && (
                  <p className="mt-1 text-sm text-red-600">
                    {cargoForm.formState.errors.descricao.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingCargo(null);
                    cargoForm.reset();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Salvando...' : editingCargo ? 'Atualizar' : 'Criar Cargo'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Cargos List */}
        {!showCreateForm && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Lista de Cargos ({cargos.length})
              </h3>
            </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cargos.map((cargo) => (
                  <tr key={cargo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cargo.descricao}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cargo.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditCargo(cargo)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCargo(cargo)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </main>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && cargoToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Excluir Cargo
                  </h3>
                  <p className="text-sm text-gray-500">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Tem certeza que deseja excluir o cargo{' '}
                  <span className="font-semibold text-gray-900">{cargoToDelete.descricao}</span>?
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteCargo}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteCargo}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
