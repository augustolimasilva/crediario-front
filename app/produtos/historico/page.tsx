'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Package, 
  Edit, 
  Trash2, 
  Plus, 
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface ExtendedSession {
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

interface ProdutoHistorico {
  id: string;
  tipoAlteracao: 'CRIADO' | 'ATUALIZADO' | 'EXCLUIDO' | 'ATIVADO' | 'DESATIVADO';
  descricao: string;
  dadosAnteriores?: Record<string, any>;
  dadosNovos?: Record<string, any>;
  observacao?: string;
  createdAt: string;
  usuario: {
    id: string;
    name: string;
  };
  produto: {
    id: string;
    nome: string;
  };
}

function HistoricoProdutosPageContent() {
  const { data: session, status } = useSession() as { data: ExtendedSession | null; status: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const [historico, setHistorico] = useState<ProdutoHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<string>('');
  const [produtos, setProdutos] = useState<Array<{ id: string; nome: string }>>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadProdutos();
    }
  }, [session]);

  // Verificar se há um produto específico na URL
  useEffect(() => {
    const produtoId = searchParams.get('produto');
    if (produtoId && produtos.length > 0) {
      const produto = produtos.find(p => p.id === produtoId);
      if (produto) {
        setSelectedProduto(produtoId);
        setProdutoSelecionado(produto);
      }
    }
  }, [searchParams, produtos]);

  useEffect(() => {
    if (selectedProduto) {
      loadHistorico();
    }
  }, [selectedProduto]);

  const loadHistorico = async () => {
    try {
      setIsLoading(true);
      const url = selectedProduto 
        ? `/api/produto-historico/produto/${selectedProduto}`
        : '/api/produto-historico';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setHistorico(data);
      } else {
        toast.error('Erro ao carregar histórico');
      }
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProdutos = async () => {
    try {
      const response = await fetch('/api/produtos');
      if (response.ok) {
        const data = await response.json();
        setProdutos(data);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos');
    }
  };

  const getTipoAlteracaoIcon = (tipo: string) => {
    switch (tipo) {
      case 'CRIADO':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'ATUALIZADO':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'EXCLUIDO':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'ATIVADO':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'DESATIVADO':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTipoAlteracaoColor = (tipo: string) => {
    switch (tipo) {
      case 'CRIADO':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'ATUALIZADO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EXCLUIDO':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'ATIVADO':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'DESATIVADO':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTipoAlteracaoLabel = (tipo: string) => {
    switch (tipo) {
      case 'CRIADO':
        return 'Criado';
      case 'ATUALIZADO':
        return 'Atualizado';
      case 'EXCLUIDO':
        return 'Excluído';
      case 'ATIVADO':
        return 'Ativado';
      case 'DESATIVADO':
        return 'Desativado';
      default:
        return tipo;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const renderDadosAlteracao = (dados: Record<string, any>, label: string) => {
    if (!dados || Object.keys(dados).length === 0) return null;

    return (
      <div className="mt-2">
        <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          {Object.entries(dados).map(([key, value]) => (
            <div key={key} className="flex justify-between py-1">
              <span className="font-medium text-gray-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span className="text-gray-900">
                {key === 'valor' ? formatCurrency(value) : 
                 key === 'ativo' ? (value ? 'Sim' : 'Não') :
                 key === 'temEstoque' ? (value ? 'Sim' : 'Não') :
                 String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
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

  if (status === 'unauthenticated' || !session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.push('/produtos')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar para Produtos</span>
          </button>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          {produtoSelecionado ? `Histórico - ${produtoSelecionado.nome}` : 'Histórico de Alterações'}
        </h1>
        <p className="text-gray-600 mt-2">
          {produtoSelecionado 
            ? `Acompanhe todas as alterações realizadas no produto ${produtoSelecionado.nome}`
            : 'Acompanhe todas as alterações realizadas nos produtos'
          }
        </p>
      </div>

      {/* Filtros - só mostra se não há produto específico */}
      {!produtoSelecionado && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Produto
              </label>
              <select
                value={selectedProduto}
                onChange={(e) => setSelectedProduto(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Todos os produtos</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadHistorico}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Histórico */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Registros de Alteração ({historico.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando histórico...</p>
          </div>
        ) : historico.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Nenhum registro de alteração encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {historico.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-full border ${getTipoAlteracaoColor(item.tipoAlteracao)}`}>
                      {getTipoAlteracaoIcon(item.tipoAlteracao)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {item.produto.nome}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.descricao}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTipoAlteracaoColor(item.tipoAlteracao)}`}>
                          {getTipoAlteracaoLabel(item.tipoAlteracao)}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{item.usuario.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Dados Anteriores */}
                    {item.dadosAnteriores && renderDadosAlteracao(item.dadosAnteriores, 'Dados Anteriores')}

                    {/* Dados Novos */}
                    {item.dadosNovos && renderDadosAlteracao(item.dadosNovos, 'Dados Novos')}

                    {/* Observação */}
                    {item.observacao && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Observação</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {item.observacao}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoricoProdutosPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <HistoricoProdutosPageContent />
    </Suspense>
  );
}
