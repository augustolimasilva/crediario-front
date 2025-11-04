'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  LogOut,
  User,
  Phone,
  MapPin,
  Mail,
  CreditCard,
  Percent,
  History,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Cargo {
  id: string;
  descricao: string;
}

interface Funcionario {
  id: string;
  nome: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  cpf?: string;
  email?: string;
  salario?: number;
  cargo: Cargo;
  createdAt: string;
  updatedAt: string;
}

interface FuncionarioForm {
  nome: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  cpf?: string;
  email?: string;
  cargoId: string;
  salario?: number;
}

function FuncionariosPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [funcionarioToDelete, setFuncionarioToDelete] = useState<Funcionario | null>(null);

  const funcionarioForm = useForm<FuncionarioForm>();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadFuncionarios();
      loadCargos();
    }
  }, [session, page, pageSize]);

  // Detectar parâmetro de edição na URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && funcionarios.length > 0 && !editingFuncionario) {
      const funcionarioToEdit = funcionarios.find(f => f.id === editId);
      if (funcionarioToEdit) {
        handleEditFuncionario(funcionarioToEdit);
      }
    } else if (!editId && editingFuncionario) {
      // Se não há mais parâmetro edit na URL e há um funcionário sendo editado, fechar o formulário
      setEditingFuncionario(null);
      funcionarioForm.reset({
        nome: '',
        telefone: '',
        cep: '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        pais: '',
        cpf: '',
        email: '',
        cargoId: '',
        salario: undefined
      });
      setShowCreateForm(false);
    }
  }, [searchParams, funcionarios]);

  const loadFuncionarios = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/funcionario?page=${page}&pageSize=${pageSize}`);
      if (response.ok) {
        const payload = await response.json();
        setFuncionarios(payload.data);
        setTotal(payload.total);
      } else {
        toast.error('Erro ao carregar funcionários');
      }
    } catch (error) {
      toast.error('Erro ao carregar funcionários');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCargos = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cargo`);

      if (response.ok) {
        const cargosData = await response.json();
        setCargos(cargosData.data || cargosData);
      } else {
        toast.error('Erro ao carregar cargos');
      }
    } catch (error) {
      toast.error('Erro ao carregar cargos');
    }
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCEP = (cep: string) => {
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const buscarCEP = async (cep: string) => {
    // Remove caracteres não numéricos
    const cepLimpo = cep.replace(/\D/g, '');
    
    // Verifica se tem 8 dígitos
    if (cepLimpo.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        // Preenche os campos automaticamente
        funcionarioForm.setValue('endereco', data.logradouro || '');
        funcionarioForm.setValue('bairro', data.bairro || '');
        funcionarioForm.setValue('cidade', data.localidade || '');
        funcionarioForm.setValue('estado', data.uf || '');
        funcionarioForm.setValue('pais', 'Brasil');
        
        toast.success('Endereço preenchido automaticamente!');
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    }
  };

  const handleCreateFuncionario = async (data: FuncionarioForm) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/funcionario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Funcionário criado com sucesso!');
        funcionarioForm.reset({
          nome: '',
          telefone: '',
          cep: '',
          endereco: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          pais: '',
          cpf: '',
          email: '',
          cargoId: '',
          salario: undefined
        });
        setShowCreateForm(false);
        loadFuncionarios();
      } else {
        const responseText = await response.text();
        console.error('Status HTTP:', response.status);
        console.error('Texto da resposta:', responseText);
        
        let error;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { message: responseText || 'Erro ao criar funcionário' };
        }
        
        console.error('Erro do servidor:', error);
        toast.error(error.message || 'Erro ao criar funcionário');
      }
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      toast.error('Erro ao criar funcionário');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFuncionario = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    funcionarioForm.reset({
      nome: funcionario.nome,
      telefone: funcionario.telefone || '',
      cep: funcionario.cep || '',
      endereco: funcionario.endereco || '',
      numero: funcionario.numero || '',
      bairro: funcionario.bairro || '',
      cidade: funcionario.cidade || '',
      estado: funcionario.estado || '',
      pais: funcionario.pais || '',
      cpf: funcionario.cpf || '',
      email: funcionario.email || '',
      cargoId: funcionario.cargo.id,
      salario: funcionario.salario || undefined
    });
    setShowCreateForm(true);
  };

  const handleUpdateFuncionario = async (data: FuncionarioForm) => {
    if (!editingFuncionario) return;

    // Verificar se houve alterações nos dados
    const hasChanges = 
      data.nome !== editingFuncionario.nome ||
      data.telefone !== (editingFuncionario.telefone || '') ||
      data.cep !== (editingFuncionario.cep || '') ||
      data.endereco !== (editingFuncionario.endereco || '') ||
      data.numero !== (editingFuncionario.numero || '') ||
      data.bairro !== (editingFuncionario.bairro || '') ||
      data.cidade !== (editingFuncionario.cidade || '') ||
      data.estado !== (editingFuncionario.estado || '') ||
      data.pais !== (editingFuncionario.pais || '') ||
      data.cpf !== (editingFuncionario.cpf || '') ||
      data.email !== (editingFuncionario.email || '') ||
      data.cargoId !== editingFuncionario.cargo?.id ||
      Number(data.salario || 0) !== Number(editingFuncionario.salario || 0);

    // Se não houve alterações, apenas fechar o formulário
    if (!hasChanges) {
      toast.info('Nenhuma alteração foi realizada');
      setEditingFuncionario(null);
      funcionarioForm.reset({
        nome: '',
        telefone: '',
        cep: '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        pais: '',
        cpf: '',
        email: '',
        cargoId: '',
        salario: undefined
      });
      setShowCreateForm(false);
      router.push('/funcionarios');
      return;
    }

    try {
      setIsLoading(true);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_URL}/funcionario/${editingFuncionario.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Funcionário atualizado com sucesso!');
        setEditingFuncionario(null);
        funcionarioForm.reset({
          nome: '',
          telefone: '',
          cep: '',
          endereco: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          pais: '',
          cpf: '',
          email: '',
          cargoId: '',
          salario: undefined
        });
        setShowCreateForm(false);
        loadFuncionarios();
        
        // Remover parâmetro edit da URL
        router.push('/funcionarios');
      } else {
        const responseText = await response.text();
        console.error('Status HTTP (update):', response.status);
        console.error('Texto da resposta (update):', responseText);
        
        let error;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { message: responseText || 'Erro ao atualizar funcionário' };
        }
        
        console.error('Erro do servidor (update):', error);
        toast.error(error.message || 'Erro ao atualizar funcionário');
      }
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      toast.error('Erro ao atualizar funcionário');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFuncionario = (funcionario: Funcionario) => {
    setFuncionarioToDelete(funcionario);
    setShowDeleteModal(true);
  };

  const confirmDeleteFuncionario = async () => {
    if (!funcionarioToDelete) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/funcionario/${funcionarioToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Funcionário excluído com sucesso!');
        loadFuncionarios();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir funcionário');
      }
    } catch (error) {
      toast.error('Erro ao excluir funcionário');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setFuncionarioToDelete(null);
    }
  };

  const cancelDeleteFuncionario = () => {
    setShowDeleteModal(false);
    setFuncionarioToDelete(null);
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
                <Users className="h-8 w-8 text-indigo-600" />
                <h1 className="ml-2 text-2xl font-bold text-gray-900">
                  Gerenciar Funcionários
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {session.user?.image ? (
                  <img
                    src={session.user.image}
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
              Funcionários
            </h2>
            <p className="text-gray-600 mt-2">
              Gerencie os funcionários da empresa.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/funcionarios/historico')}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <History className="h-5 w-5" />
              <span>Histórico</span>
            </button>
            <button
              onClick={() => {
                setEditingFuncionario(null);
                funcionarioForm.reset({
                  nome: '',
                  telefone: '',
                  cep: '',
                  endereco: '',
                  numero: '',
                  bairro: '',
                  cidade: '',
                  estado: '',
                  pais: '',
                  cpf: '',
                  email: '',
                  cargoId: '',
                  salario: undefined
                });
                setShowCreateForm(true);
              }}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Novo Funcionário</span>
            </button>
          </div>
        </div>

        {/* Create/Edit Funcionario Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingFuncionario ? 'Editar Funcionário' : 'Criar Novo Funcionário'}
            </h3>
            <form onSubmit={funcionarioForm.handleSubmit(editingFuncionario ? handleUpdateFuncionario : handleCreateFuncionario)} className="space-y-6">
              {/* Dados Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    {...funcionarioForm.register('nome', { required: 'Nome é obrigatório' })}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nome completo"
                  />
                  {funcionarioForm.formState.errors.nome && (
                    <p className="mt-1 text-sm text-red-600">
                      {funcionarioForm.formState.errors.nome.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone *
                  </label>
                  <input
                    {...funcionarioForm.register('telefone', { required: 'Telefone é obrigatório' })}
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="(11) 99999-9999"
                  />
                  {funcionarioForm.formState.errors.telefone && (
                    <p className="mt-1 text-sm text-red-600">
                      {funcionarioForm.formState.errors.telefone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <div className="flex space-x-2">
                  <input
                    {...funcionarioForm.register('cep')}
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="00000-000"
                    onChange={(e) => {
                      const cep = e.target.value.replace(/\D/g, '');
                      if (cep.length === 8) {
                        buscarCEP(cep);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cep = funcionarioForm.getValues('cep')?.replace(/\D/g, '');
                      if (cep && cep.length === 8) {
                        buscarCEP(cep);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço
                  </label>
                  <input
                    {...funcionarioForm.register('endereco')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número
                  </label>
                  <input
                    {...funcionarioForm.register('numero')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bairro
                  </label>
                  <input
                    {...funcionarioForm.register('bairro')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Centro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <input
                    {...funcionarioForm.register('cidade')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="São Paulo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    {...funcionarioForm.register('estado')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="SP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <input
                  {...funcionarioForm.register('pais')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Brasil"
                />
              </div>

              {/* Dados Pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF
                  </label>
                  <input
                    {...funcionarioForm.register('cpf')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    {...funcionarioForm.register('email')}
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo *
                </label>
                <select
                  {...funcionarioForm.register('cargoId', { required: 'Cargo é obrigatório' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione um cargo</option>
                  {cargos.map((cargo) => (
                    <option key={cargo.id} value={cargo.id}>
                      {cargo.descricao}
                    </option>
                  ))}
                </select>
                {funcionarioForm.formState.errors.cargoId && (
                  <p className="mt-1 text-sm text-red-600">
                    {funcionarioForm.formState.errors.cargoId.message}
                  </p>
                )}
              </div>

              {/* Salário */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salário
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    {...funcionarioForm.register('salario')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFuncionario(null);
                    funcionarioForm.reset({
                      nome: '',
                      telefone: '',
                      cep: '',
                      endereco: '',
                      numero: '',
                      bairro: '',
                      cidade: '',
                      estado: '',
                      pais: '',
                      cpf: '',
                      email: '',
                      cargoId: '',
                      salario: undefined
                    });
                    setShowCreateForm(false);
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
                  {isLoading ? 'Salvando...' : editingFuncionario ? 'Atualizar' : 'Criar Funcionário'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Funcionarios List */}
        {!showCreateForm && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Lista de Funcionários ({total})
              </h3>
            </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funcionário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endereço
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {funcionarios.map((funcionario) => (
                  <tr key={funcionario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {funcionario.nome}
                          </div>
                          {funcionario.cpf && (
                            <div className="text-sm text-gray-500">
                              {formatCPF(funcionario.cpf)}
                            </div>
                          )}
        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {funcionario.telefone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-1" />
                            {formatPhone(funcionario.telefone)}
                          </div>
                        )}
                        {funcionario.email && (
                          <div className="flex items-center mt-1">
                            <Mail className="h-4 w-4 text-gray-400 mr-1" />
                            {funcionario.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {funcionario.cep && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                            {formatCEP(funcionario.cep)}
                          </div>
                        )}
                        {funcionario.endereco && (
                          <div className="text-sm text-gray-500 mt-1">
                            {funcionario.endereco}
                            {funcionario.numero && `, ${funcionario.numero}`}
                          </div>
                        )}
                        {funcionario.bairro && (
                          <div className="text-sm text-gray-500">
                            {funcionario.bairro}
                          </div>
                        )}
                        {funcionario.cidade && funcionario.estado && (
                          <div className="text-sm text-gray-500">
                            {funcionario.cidade} - {funcionario.estado}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {funcionario.cargo.descricao}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/funcionarios/${funcionario.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditFuncionario(funcionario)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFuncionario(funcionario)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
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
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full border text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full border text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Próxima página"
            >
              <span>Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>
        )}
      </main>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && funcionarioToDelete && (
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
                    Excluir Funcionário
                  </h3>
                  <p className="text-sm text-gray-500">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Tem certeza que deseja excluir o funcionário{' '}
                  <span className="font-semibold text-gray-900">{funcionarioToDelete.nome}</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Cargo: {funcionarioToDelete.cargo.descricao}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteFuncionario}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteFuncionario}
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

export default function FuncionariosPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <FuncionariosPageContent />
    </Suspense>
  );
}
