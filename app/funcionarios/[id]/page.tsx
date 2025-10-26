'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  LogOut,
  User,
  Phone,
  MapPin,
  Mail,
  CreditCard,
  Percent,
  Calendar,
  Edit,
  History,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  cargo?: Cargo;
  createdAt: string;
  updatedAt: string;
}

interface HistoricoItem {
  id: string;
  funcionarioId: string;
  tipoAlteracao: 'CREATE' | 'UPDATE' | 'DELETE';
  dadosAnteriores: any;
  dadosNovos: any;
  usuarioAlteracao?: string;
  ipAlteracao?: string;
  userAgent?: string;
  dataAlteracao: string;
  observacoes?: string;
}

interface ChartData {
  data: string;
  comissao: number;
  tipo: string;
}

export default function FuncionarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  
  const resolvedParams = use(params);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session && resolvedParams.id) {
      loadFuncionario();
      loadHistorico();
    }
  }, [session, resolvedParams.id]);

  const loadFuncionario = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/funcionario/${resolvedParams.id}`);

      if (response.ok) {
        const funcionarioData = await response.json();
        setFuncionario(funcionarioData);
      } else {
        toast.error('Erro ao carregar funcionário');
        router.push('/funcionarios');
      }
    } catch (error) {
      toast.error('Erro ao carregar funcionário');
      router.push('/funcionarios');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistorico = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/funcionario-historico/funcionario/${resolvedParams.id}`);

      if (response.ok) {
        const historicoData = await response.json();
        setHistorico(historicoData);
        
        // Não há mais dados de comissão para processar
        setChartData([]);
      } else {
        toast.error('Erro ao carregar histórico');
      }
    } catch (error) {
      toast.error('Erro ao carregar histórico');
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

  const getTipoAlteracaoInfo = (tipo: string) => {
    switch (tipo) {
      case 'CREATE':
        return { label: 'Criado', color: 'bg-green-100 text-green-800', icon: UserCheck };
      case 'UPDATE':
        return { label: 'Atualizado', color: 'bg-blue-100 text-blue-800', icon: Edit };
      case 'DELETE':
        return { label: 'Excluído', color: 'bg-red-100 text-red-800', icon: History };
      default:
        return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800', icon: History };
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session || !funcionario) {
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
                <User className="h-8 w-8 text-indigo-600" />
                <h1 className="ml-2 text-2xl font-bold text-gray-900">
                  Detalhes do Funcionário
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
              {funcionario.nome}
            </h2>
            <p className="text-gray-600 mt-2">
              {funcionario.cargo && typeof funcionario.cargo === 'object' 
                ? funcionario.cargo.descricao 
                : 'Cargo não informado'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowHistorico(!showHistorico)}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <History className="h-5 w-5" />
              <span>{showHistorico ? 'Ocultar' : 'Ver'} Histórico</span>
            </button>
            <button
              onClick={() => router.push(`/funcionarios?edit=${funcionario.id}`)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Edit className="h-5 w-5" />
              <span>Editar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informações Pessoais */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informações Pessoais
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Nome</p>
                  <p className="text-sm text-gray-900">{funcionario.nome}</p>
                </div>
              </div>

              {funcionario.telefone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Telefone</p>
                    <p className="text-sm text-gray-900">{formatPhone(funcionario.telefone)}</p>
                  </div>
                </div>
              )}

              {funcionario.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{funcionario.email}</p>
                  </div>
                </div>
              )}

              {funcionario.cpf && (
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">CPF</p>
                    <p className="text-sm text-gray-900">{formatCPF(funcionario.cpf)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações Profissionais */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informações Profissionais
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <UserCheck className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Cargo</p>
                  <p className="text-sm text-gray-900">
                    {funcionario.cargo && typeof funcionario.cargo === 'object' 
                      ? funcionario.cargo.descricao 
                      : funcionario.cargo || 'Não informado'}
                  </p>
                </div>
              </div>


              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Data de Cadastro</p>
                  <p className="text-sm text-gray-900">
                    {new Date(funcionario.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Endereço */}
        {(funcionario.cep || funcionario.endereco || funcionario.cidade) && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Endereço
            </h3>
            <div className="space-y-4">
              {funcionario.cep && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">CEP</p>
                    <p className="text-sm text-gray-900">{formatCEP(funcionario.cep)}</p>
                  </div>
                </div>
              )}

              {funcionario.endereco && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Endereço</p>
                    <p className="text-sm text-gray-900">
                      {funcionario.endereco}
                      {funcionario.numero && `, ${funcionario.numero}`}
                    </p>
                  </div>
                </div>
              )}

              {funcionario.bairro && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bairro</p>
                    <p className="text-sm text-gray-900">{funcionario.bairro}</p>
                  </div>
                </div>
              )}

              {funcionario.cidade && funcionario.estado && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cidade/Estado</p>
                    <p className="text-sm text-gray-900">
                      {funcionario.cidade} - {funcionario.estado}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Histórico e Gráfico */}
        {showHistorico && (
          <div className="mt-8 space-y-8">

            {/* Lista de Histórico */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Histórico de Alterações ({historico.length})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {historico.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum registro de histórico encontrado.</p>
                  </div>
                ) : (
                  historico.map((item) => {
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

                              {item.tipoAlteracao === 'UPDATE' && item.dadosAnteriores && item.dadosNovos && (
                                <div className="mt-3">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    Alterações realizadas:
                                  </h5>
                                  <div className="space-y-1">
                                    {Object.keys(item.dadosNovos).map((key) => {
                                      const anterior = item.dadosAnteriores[key];
                                      const novo = item.dadosNovos[key];
                                      
                                      // Pular campos que não mudaram, updatedAt e cargo (objeto)
                                      if (anterior !== novo && key !== 'updatedAt' && key !== 'cargo' && key !== 'cargoId') {
                                        // Formatar valores para exibição
                                        const formatValue = (val: any) => {
                                          if (val === null || val === undefined) return 'vazio';
                                          if (typeof val === 'object') return JSON.stringify(val);
                                          return String(val);
                                        };
                                        
                                        return (
                                          <div key={key} className="text-sm">
                                            <span className="font-medium text-gray-700">{key}:</span>
                                            <span className="text-red-600 line-through ml-1">
                                              {formatValue(anterior)}
                                            </span>
                                            <span className="text-green-600 ml-1">
                                              → {formatValue(novo)}
                                            </span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })}
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
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
