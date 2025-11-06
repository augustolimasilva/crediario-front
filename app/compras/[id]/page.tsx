'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../../../lib/axios';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Calendar,
  User,
  DollarSign,
  CreditCard,
  Package,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  valor: number;
}

interface LancamentoFinanceiro {
  id: string;
  compraId: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO';
  observacao?: string;
  createdAt: string;
  updatedAt: string;
}

interface CompraItem {
  id: string;
  produto: Produto;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface Compra {
  id: string;
  nomeFornecedor: string;
  dataCompra: string;
  valorTotal: number;
  desconto?: number;
  observacao?: string;
  usuario: {
    name: string;
  };
  itens: CompraItem[];
  lancamentosFinanceiros: LancamentoFinanceiro[];
  createdAt: string;
}

export default function CompraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [compra, setCompra] = useState<Compra | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditLancamento, setShowEditLancamento] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] = useState<LancamentoFinanceiro | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const loadCompra = async () => {
      try {
        const resolvedParams = await params;
        const response = await api.get(`/compra/${resolvedParams.id}`);
        setCompra(response.data);
      } catch (error: any) {
        console.error('Erro ao carregar compra:', error);
        if (error.response?.status === 404) {
          toast.error('Compra não encontrada');
        } else {
          toast.error('Erro ao carregar compra');
        }
        router.push('/compras');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      loadCompra();
    }
  }, [session, params, router]);

  const formatCurrency = (value: number) => {
    const numValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Se a string já está no formato YYYY-MM-DD, usar diretamente
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    // Se é uma string ISO (YYYY-MM-DDTHH:mm:ss.sssZ), extrair apenas a parte da data
    const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}/${month}/${year}`;
    }
    // Fallback: usar new Date (pode ter problemas de timezone)
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  };

  const computeLancamentoStatus = (l: LancamentoFinanceiro) => {
    // Pago se tem dataPagamento
    if (l.dataPagamento) {
      return { label: 'Pago', color: 'bg-green-100 text-green-800' };
    }
    // Se não tem pagamento: vencido se dataVencimento passada, senão pendente
    if (l.dataVencimento) {
      const hoje = new Date();
      const venc = new Date(l.dataVencimento);
      // Normalizar horas para comparar só data
      hoje.setHours(0, 0, 0, 0);
      venc.setHours(0, 0, 0, 0);
      if (venc < hoje) {
        return { label: 'Vencido', color: 'bg-red-100 text-red-800' };
      }
    }
    return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' };
  };

  const handleEditLancamento = (lancamento: LancamentoFinanceiro) => {
    setLancamentoEditando(lancamento);
    setShowEditLancamento(true);
  };

  const handleUpdateLancamento = async (lancamentoData: any) => {
    if (!lancamentoEditando) return;

    try {
      await api.patch(`/lancamentos-financeiros/${lancamentoEditando.id}`, lancamentoData);
      toast.success('Lançamento atualizado com sucesso!');
      setShowEditLancamento(false);
      setLancamentoEditando(null);
      // Recarregar a compra
      const response = await api.get(`/compra/${compra?.id}`);
      setCompra(response.data);
    } catch (error: any) {
      console.error('Erro ao atualizar lançamento:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar lançamento');
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

  if (!session || !compra) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/compras')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar para Compras
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Detalhes da Compra</h1>
      </div>

      {/* Informações da Compra */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações da Compra</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Fornecedor</p>
            <p className="text-lg text-gray-900">{compra.nomeFornecedor}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Data da Compra</p>
            <p className="text-lg text-gray-900">{formatDate(compra.dataCompra)}</p>
          </div>
        </div>
        
        {/* Resumo Financeiro */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Valor Original</p>
              <p className="text-lg font-semibold text-gray-700">
                {formatCurrency(compra.itens.reduce((sum, item) => sum + (Number(item.valorTotal) || 0), 0))}
              </p>
            </div>
            {compra.desconto && compra.desconto > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Desconto</p>
                <p className="text-lg font-semibold text-red-600">- {formatCurrency(Number(compra.desconto) || 0)}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Valor Total</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(Number(compra.valorTotal) || 0)}</p>
            </div>
          </div>
        </div>
        {compra.observacao && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Observação</p>
            <p className="text-gray-900">{compra.observacao}</p>
          </div>
        )}
      </div>

      {/* Itens da Compra */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Itens da Compra</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Unitário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {compra.itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.produto.nome}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantidade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(Number(item.valorUnitario) || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(Number(item.valorTotal) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lançamentos Financeiros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Lançamentos Financeiros</h2>
          <span className="text-sm text-gray-500">
            {compra.lancamentosFinanceiros?.length || 0} lançamento(s)
          </span>
        </div>

        {!compra.lancamentosFinanceiros || compra.lancamentosFinanceiros.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum lançamento financeiro encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {compra.lancamentosFinanceiros?.map((lancamento) => (
              <div key={lancamento.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      {(() => { const s = computeLancamentoStatus(lancamento); return (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${s.color}`}>
                          {s.label}
                        </span>
                      ); })()}
                      <span className="text-sm text-gray-500">
                        Vencimento: {formatDate(lancamento.dataVencimento)}
                      </span>
                      {lancamento.dataPagamento && (
                        <span className="text-sm text-gray-500">
                          Pago em: {formatDate(lancamento.dataPagamento)}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(Number(lancamento.valor) || 0)}
                    </div>
                    {lancamento.observacao && (
                      <div className="text-sm text-gray-600 mt-1">
                        {lancamento.observacao}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditLancamento(lancamento)}
                      className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar lançamento"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edição de Lançamento */}
      {showEditLancamento && lancamentoEditando && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Editar Lançamento Financeiro
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  dataPagamento: formData.get('dataPagamento') || null,
                  observacao: formData.get('observacao') || null
                };
                handleUpdateLancamento(data);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Pagamento
                    </label>
                    <input
                      type="date"
                      name="dataPagamento"
                      defaultValue={lancamentoEditando.dataPagamento ? lancamentoEditando.dataPagamento.split('T')[0] : ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observação
                    </label>
                    <textarea
                      name="observacao"
                      defaultValue={lancamentoEditando.observacao || ''}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditLancamento(false);
                      setLancamentoEditando(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
