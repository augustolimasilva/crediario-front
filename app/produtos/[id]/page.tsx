'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../../../lib/axios';
import { 
  ArrowLeft, 
  Package, 
  Edit, 
  DollarSign,
  Hash,
  Tag,
  Palette,
  CheckCircle,
  XCircle,
  History,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  User
} from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  marca?: string;
  cor?: string;
  valor: number;
  precoMedio?: number;
  percentualComissao?: number;
  classificacao?: string;
  temEstoque: boolean;
  quantidadeMinimaEstoque: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
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

export default function ProdutoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historico, setHistorico] = useState<ProdutoHistorico[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showMovimentacoes, setShowMovimentacoes] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [quantidadeEstoque, setQuantidadeEstoque] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const loadProduto = async () => {
      try {
        const resolvedParams = await params;
        const response = await api.get(`/produto/${resolvedParams.id}`);
        setProduto(response.data);
        
        // Carregar quantidade em estoque se o produto tiver controle de estoque
        if (response.data.temEstoque) {
          try {
            const estoqueResponse = await api.get(`/compra/estoque/produto/${resolvedParams.id}`);
            setQuantidadeEstoque(estoqueResponse.data.quantidadeTotal || 0);
          } catch (estoqueError) {
            console.error('Erro ao carregar estoque:', estoqueError);
            setQuantidadeEstoque(0);
          }
        }
      } catch (error: any) {
        console.error('Erro ao carregar produto:', error);
        if (error.response?.status === 404) {
          toast.error('Produto não encontrado');
        } else {
          toast.error('Erro ao carregar produto');
        }
        router.push('/produtos');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      loadProduto();
    }
  }, [session, params, router]);

  const loadHistorico = async () => {
    if (!produto) return;
    
    try {
      const response = await api.get(`/produto-historico/produto/${produto.id}`);
      setHistorico(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico');
    }
  };

  const loadMovimentacoes = async () => {
    if (!produto) return;
    
    try {
      const response = await api.get(`/compra/estoque/produto/${produto.id}`);
      // A resposta vem como { movimentacoes: [...], quantidadeTotal: ..., ... }
      const movs = response.data.movimentacoes || response.data || [];
      setMovimentacoes(Array.isArray(movs) ? movs : []);
    } catch (error: any) {
      console.error('Erro ao carregar movimentações:', error);
      toast.error('Erro ao carregar movimentações de estoque');
      setMovimentacoes([]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoAlteracaoIcon = (tipo: string) => {
    switch (tipo) {
      case 'CRIADO':
        return <Plus className="h-4 w-4" />;
      case 'ATUALIZADO':
        return <Edit className="h-4 w-4" />;
      case 'EXCLUIDO':
        return <Trash2 className="h-4 w-4" />;
      case 'ATIVADO':
        return <CheckCircle className="h-4 w-4" />;
      case 'DESATIVADO':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getTipoAlteracaoColor = (tipo: string) => {
    switch (tipo) {
      case 'CRIADO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ATUALIZADO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EXCLUIDO':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ATIVADO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DESATIVADO':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTipoAlteracaoInfo = (tipo: string) => {
    switch (tipo) {
      case 'CRIADO':
        return { label: 'Criado', color: 'bg-green-100 text-green-800', icon: Plus };
      case 'ATUALIZADO':
        return { label: 'Atualizado', color: 'bg-blue-100 text-blue-800', icon: Edit };
      case 'EXCLUIDO':
        return { label: 'Excluído', color: 'bg-red-100 text-red-800', icon: Trash2 };
      case 'ATIVADO':
        return { label: 'Ativado', color: 'bg-green-100 text-green-800', icon: Eye };
      case 'DESATIVADO':
        return { label: 'Desativado', color: 'bg-red-100 text-red-800', icon: EyeOff };
      default:
        return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800', icon: History };
    }
  };

  const getDiferencas = (dadosAnteriores: any, dadosNovos: any) => {
    if (!dadosAnteriores || !dadosNovos) return [];
    
    const diferencas = [];
    // Incluir todos os campos da entidade Produto
    const campos = [
      'nome', 
      'descricao', 
      'marca', 
      'cor', 
      'valor', 
      'precoMedio', 
      'percentualComissao',
      'classificacao',
      'temEstoque', 
      'quantidadeMinimaEstoque', 
      'ativo'
    ];
    
    for (const campo of campos) {
      const anterior = dadosAnteriores[campo];
      const novo = dadosNovos[campo];
      
      // Converter para número para comparação correta de valores decimais
      const anteriorNum = typeof anterior === 'number' ? anterior : (anterior !== null && anterior !== undefined && anterior !== '' ? Number(anterior) : null);
      const novoNum = typeof novo === 'number' ? novo : (novo !== null && novo !== undefined && novo !== '' ? Number(novo) : null);
      
      // Comparar valores numéricos ou valores não-numéricos
      let valoresDiferentes = false;
      
      if (typeof anteriorNum === 'number' && typeof novoNum === 'number') {
        valoresDiferentes = Math.abs(anteriorNum - novoNum) > 0.0001; // Comparação para decimais
      } else if ((anteriorNum !== null || novoNum !== null) && anteriorNum !== novoNum) {
        valoresDiferentes = true;
      } else {
        valoresDiferentes = anterior !== novo;
      }
      
      if (valoresDiferentes) {
        diferencas.push({
          campo: getCampoLabel(campo),
          anterior: formatarValor(campo, anterior),
          novo: formatarValor(campo, novo)
        });
      }
    }
    
    return diferencas;
  };

  const getCampoLabel = (campo: string) => {
    const labels: { [key: string]: string } = {
      'nome': 'Nome',
      'descricao': 'Descrição',
      'marca': 'Marca',
      'cor': 'Cor',
      'valor': 'Valor',
      'precoMedio': 'Preço Médio',
      'percentualComissao': 'Percentual de Comissão',
      'classificacao': 'Classificação',
      'temEstoque': 'Tem Estoque',
      'quantidadeMinimaEstoque': 'Quantidade Mínima',
      'ativo': 'Status'
    };
    return labels[campo] || campo;
  };

  const formatarValor = (campo: string, valor: any) => {
    if (valor === null || valor === undefined || valor === '') return 'vazio';
    
    switch (campo) {
      case 'valor':
      case 'precoMedio':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(valor));
      case 'percentualComissao':
        return `${Number(valor).toFixed(2)}%`;
      case 'classificacao':
        const classificacoes: { [key: string]: string } = {
          'PRODUTO_ESTOQUE': 'Produto de Estoque',
          'ATIVO_IMOBILIZADO': 'Ativo Imobilizado',
          'SERVICO': 'Serviço',
          'MATERIAL_CONSUMO': 'Material de Consumo'
        };
        return classificacoes[valor] || valor.toString();
      case 'temEstoque':
        return valor ? 'Sim' : 'Não';
      case 'ativo':
        return valor ? 'Ativo' : 'Inativo';
      case 'quantidadeMinimaEstoque':
        return valor.toString();
      default:
        return valor.toString();
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

  if (!session || !produto) {
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
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{produto.nome}</h1>
            <p className="text-gray-600 mt-2">
              {produto.descricao || 'Sem descrição'}
            </p>
          </div>
          <div className="flex space-x-3">
            {produto.temEstoque && (
              <button
                onClick={() => {
                  setShowMovimentacoes(!showMovimentacoes);
                  if (!showMovimentacoes && movimentacoes.length === 0) {
                    loadMovimentacoes();
                  }
                }}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Package className="h-5 w-5" />
                <span>{showMovimentacoes ? 'Ocultar' : 'Ver'} Movimentações</span>
              </button>
            )}
            <button
              onClick={() => {
                setShowHistorico(!showHistorico);
                if (!showHistorico && historico.length === 0) {
                  loadHistorico();
                }
              }}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <History className="h-5 w-5" />
              <span>{showHistorico ? 'Ocultar' : 'Ver'} Histórico</span>
            </button>
            <button
              onClick={() => router.push(`/produtos?edit=${produto.id}`)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Edit className="h-5 w-5" />
              <span>Editar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Informações Básicas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informações Básicas
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Package className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Nome</p>
                <p className="text-sm text-gray-900">{produto.nome}</p>
              </div>
            </div>

            {produto.descricao && (
              <div className="flex items-start space-x-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Descrição</p>
                  <p className="text-sm text-gray-900">{produto.descricao}</p>
                </div>
              </div>
            )}

            {produto.marca && (
              <div className="flex items-center space-x-3">
                <Tag className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Marca</p>
                  <p className="text-sm text-gray-900">{produto.marca}</p>
                </div>
              </div>
            )}

            {produto.cor && (
              <div className="flex items-center space-x-3">
                <Palette className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Cor</p>
                  <p className="text-sm text-gray-900">{produto.cor}</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Informações Financeiras e Estoque */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informações Financeiras e Estoque
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Valor</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(produto.valor)}
                </p>
              </div>
            </div>

            {(produto.precoMedio !== null && produto.precoMedio !== undefined && Number(produto.precoMedio) > 0) && (
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Preço Médio</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(Number(produto.precoMedio))}
                  </p>
                </div>
              </div>
            )}

          {produto.temEstoque && typeof produto.percentualComissao === 'number' && (
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Comissão</p>
                <p className="text-sm text-gray-900">{produto.percentualComissao.toFixed(2)}%</p>
              </div>
            </div>
          )}

            <div className="flex items-center space-x-3">
              <Hash className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Controle de Estoque</p>
                <p className="text-sm text-gray-900">
                  {produto.temEstoque ? 'Sim' : 'Não'}
                </p>
              </div>
            </div>

            {produto.temEstoque && (
              <>
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Quantidade em Estoque</p>
                    <p className={`text-lg font-semibold ${quantidadeEstoque !== null && quantidadeEstoque < produto.quantidadeMinimaEstoque ? 'text-red-600' : 'text-blue-600'}`}>
                      {quantidadeEstoque !== null ? quantidadeEstoque : 'Carregando...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Quantidade Mínima</p>
                    <p className="text-sm text-gray-900">{produto.quantidadeMinimaEstoque}</p>
                  </div>
                </div>
              </>
            )}

            {produto.classificacao && (
              <div className="flex items-center space-x-3">
                <Tag className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Classificação</p>
                  <p className="text-sm text-gray-900">
                    {produto.classificacao === 'PRODUTO_ESTOQUE' ? 'Produto de estoque' :
                     produto.classificacao === 'ATIVO_IMOBILIZADO' ? 'Ativo imobilizado' :
                     produto.classificacao === 'SERVICO' ? 'Serviço' :
                     produto.classificacao === 'MATERIAL_CONSUMO' ? 'Material de consumo' : produto.classificacao}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              {produto.ativo ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className={`text-sm font-medium ${produto.ativo ? 'text-green-600' : 'text-red-600'}`}>
                  {produto.ativo ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informações de Sistema */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Informações de Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Data de Criação</p>
            <p className="text-sm text-gray-900">{formatDate(produto.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Última Atualização</p>
            <p className="text-sm text-gray-900">{formatDate(produto.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Movimentações de Estoque */}
      {showMovimentacoes && produto.temEstoque && (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Movimentações de Estoque ({movimentacoes.length})
              </h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {movimentacoes.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma movimentação de estoque encontrada.</p>
                </div>
              ) : (
                movimentacoes.map((mov) => {
                  const isEntrada = mov.tipoMovimentacao === 'ENTRADA';
                  const isSaida = mov.tipoMovimentacao === 'SAIDA';
                  const isAjuste = mov.tipoMovimentacao === 'AJUSTE';
                  
                  return (
                    <div key={mov.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              isEntrada ? 'bg-green-100' : isSaida ? 'bg-red-100' : 'bg-yellow-100'
                            }`}>
                              {isEntrada ? (
                                <Plus className="h-5 w-5 text-green-600" />
                              ) : isSaida ? (
                                <Minus className="h-5 w-5 text-red-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                isEntrada ? 'bg-green-100 text-green-800' : 
                                isSaida ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {isEntrada ? 'Entrada' : isSaida ? 'Saída' : 'Ajuste'}
                              </span>
                              <span className="text-sm text-gray-500 flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatDate(mov.dataMovimentacao)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                              <div>
                                <p className="text-xs font-medium text-gray-500">Quantidade</p>
                                <p className={`text-sm font-semibold ${
                                  isEntrada ? 'text-green-600' : isSaida ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                  {isEntrada ? '+' : isSaida ? '-' : ''}{mov.quantidade}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Valor Unitário</p>
                                <p className="text-sm text-gray-900">{formatCurrency(mov.valorUnitario)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Valor Total</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(mov.quantidade * mov.valorUnitario)}
                                </p>
                              </div>
                            </div>

                            {mov.observacao && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Observação:</span> {mov.observacao}
                                </p>
                              </div>
                            )}

                            {mov.compra && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Compra:</span> {mov.compra.nomeFornecedor || 'N/A'}
                                </p>
                              </div>
                            )}

                            <div className="mt-2 text-xs text-gray-500 flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              <span>Usuário: {mov.usuario?.name || 'N/A'}</span>
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

      {/* Histórico */}
      {showHistorico && (
        <div className="mt-8">
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
                              <span className="text-sm text-gray-500 flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {item.produto?.nome || 'Produto não encontrado'}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {item.descricao}
                              </p>
                            </div>

                            {item.tipoAlteracao === 'ATUALIZADO' && item.dadosAnteriores && item.dadosNovos && (
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

                            {item.observacao && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Observações:</span> {item.observacao}
                                </p>
                              </div>
                            )}

                            <div className="mt-2 text-xs text-gray-500 flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              <span>Usuário: {item.usuario.name}</span>
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
    </div>
  );
}
