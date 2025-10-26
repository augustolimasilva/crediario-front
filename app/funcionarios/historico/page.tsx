'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  History, 
  ArrowLeft,
  LogOut,
  User,
  Calendar,
  UserCheck,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search
} from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  cargo?: {
    descricao: string;
  };
}

interface HistoricoItem {
  id: string;
  funcionarioId: string;
  funcionario: Funcionario;
  tipoAlteracao: 'CREATE' | 'UPDATE' | 'DELETE';
  dadosAnteriores: any;
  dadosNovos: any;
  usuarioAlteracao?: string;
  ipAlteracao?: string;
  userAgent?: string;
  dataAlteracao: string;
  observacoes?: string;
}

export default function HistoricoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroFuncionario, setFiltroFuncionario] = useState<string>('');
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadHistorico();
    }
  }, [session]);

  const loadHistorico = async () => {
    try {
      setIsLoading(true);
      let url = `${process.env.NEXT_PUBLIC_API_URL}/funcionario-historico`;
      
      const params = new URLSearchParams();
      if (filtroTipo) params.append('tipo', filtroTipo);
      if (filtroFuncionario) params.append('funcionario', filtroFuncionario);
      if (filtroDataInicio) params.append('dataInicio', filtroDataInicio);
      if (filtroDataFim) params.append('dataFim', filtroDataFim);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        const historicoData = await response.json();
        setHistorico(historicoData);
      } else {
        toast.error('Erro ao carregar histórico');
      }
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  const getTipoAlteracaoInfo = (tipo: string) => {
    switch (tipo) {
      case 'CREATE':
        return { label: 'Criado', color: 'bg-green-100 text-green-800', icon: Plus };
      case 'UPDATE':
        return { label: 'Atualizado', color: 'bg-blue-100 text-blue-800', icon: Edit };
      case 'DELETE':
        return { label: 'Excluído', color: 'bg-red-100 text-red-800', icon: Trash2 };
      default:
        return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800', icon: History };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDiferencas = (dadosAnteriores: any, dadosNovos: any) => {
    if (!dadosAnteriores || !dadosNovos) return [];
    
    const diferencas = [];
    const campos = ['nome', 'telefone', 'email', 'cep', 'endereco', 'cidade', 'estado', 'comissao'];
    
    for (const campo of campos) {
      const anterior = dadosAnteriores[campo];
      const novo = dadosNovos[campo];
      
      if (anterior !== novo) {
        diferencas.push({
          campo,
          anterior,
          novo
        });
      }
    }
    
    return diferencas;
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
                onClick={() => router.push('/funcionarios')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Voltar</span>
              </button>
              <div className="flex items-center">
                <History className="h-8 w-8 text-indigo-600" />
                <h1 className="ml-2 text-2xl font-bold text-gray-900">
                  Histórico de Funcionários
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Histórico de Alterações
          </h2>
          <p className="text-gray-600 mt-2">
            Acompanhe todas as alterações realizadas nos funcionários.
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Alteração
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos os tipos</option>
                <option value="CREATE">Criação</option>
                <option value="UPDATE">Atualização</option>
                <option value="DELETE">Exclusão</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={loadHistorico}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Filtrar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Histórico */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Registros de Alteração ({historico.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            {historico.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum registro de histórico encontrado.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {historico.map((item) => {
                  const tipoInfo = getTipoAlteracaoInfo(item.tipoAlteracao);
                  const IconComponent = tipoInfo.icon;
                  
                  return (
                    <div key={item.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <IconComponent className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tipoInfo.color}`}>
                                {tipoInfo.label}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatDate(item.dataAlteracao)}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {item.funcionario.nome}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {item.funcionario.cargo?.descricao || 'Cargo não informado'}
                              </p>
                            </div>

                            {item.tipoAlteracao === 'UPDATE' && item.dadosAnteriores && item.dadosNovos && (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">
                                  Alterações realizadas:
                                </h5>
                                <div className="space-y-1">
                                  {getDiferencas(item.dadosAnteriores, item.dadosNovos).map((diff, index) => (
                                    <div key={index} className="text-sm">
                                      <span className="font-medium text-gray-700">{diff.campo}:</span>
                                      <span className="text-red-600 line-through ml-1">
                                        {diff.anterior || 'vazio'}
                                      </span>
                                      <span className="text-green-600 ml-1">
                                        → {diff.novo || 'vazio'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.observacoes && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Observações:</span> {item.observacoes}
                                </p>
                              </div>
                            )}

                            <div className="mt-2 text-xs text-gray-500">
                              {item.usuarioAlteracao && (
                                <span>Usuário: {item.usuarioAlteracao}</span>
                              )}
                              {item.ipAlteracao && (
                                <span className="ml-4">IP: {item.ipAlteracao}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
