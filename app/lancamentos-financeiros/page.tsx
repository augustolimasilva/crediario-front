'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, DollarSign, Calendar, User, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface LancamentoFinanceiro {
  id: string;
  tipoLancamento: 'DEBITO' | 'CREDITO';
  valor: number;
  dataLancamento: string;
  dataVencimento?: string;
  dataPagamento?: string;
  formaPagamento?: 'PIX' | 'CARTAO_CREDITO' | 'ESPECIE' | 'BOLETO' | 'CARTAO_DEBITO' | 'TRANSFERENCIA' | 'CHEQUE';
  observacao?: string;
  funcionario?: {
    id: string;
    nome: string;
  };
  compra?: {
    id: string;
    numero: string;
  };
  usuario: {
    id: string;
    nome: string;
  };
}

interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  saldoDevedor: number;
  totalLancamentos: number;
  receitasRecebidas: number;
  receitasAReceber: number;
  despesasPagas: number;
  despesasAPagar: number;
}

// Funções utilitárias
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const getTipoLancamentoColor = (tipo: string) => {
  return tipo === 'CREDITO' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
};

const getFormaPagamentoLabel = (forma: string) => {
  const formas = {
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartão de Crédito',
    ESPECIE: 'Espécie',
    BOLETO: 'Boleto',
    CARTAO_DEBITO: 'Cartão de Débito',
    TRANSFERENCIA: 'Transferência',
    CHEQUE: 'Cheque',
  };
  return formas[forma as keyof typeof formas] || forma;
};

export default function LancamentosFinanceirosPage() {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [selectedLancamento, setSelectedLancamento] = useState<LancamentoFinanceiro | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('create');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tipoLancamento: '',
    formaPagamento: '',
    dataInicio: '',
    dataFim: '',
    funcionarioId: '',
  });

  useEffect(() => {
    loadLancamentos();
    loadResumo();
  }, [filters, page, pageSize]);

  const loadLancamentos = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.tipoLancamento) queryParams.append('tipoLancamento', filters.tipoLancamento);
      if (filters.formaPagamento) queryParams.append('formaPagamento', filters.formaPagamento);
      if (filters.dataInicio) queryParams.append('dataInicio', filters.dataInicio);
      if (filters.dataFim) queryParams.append('dataFim', filters.dataFim);
      if (filters.funcionarioId) queryParams.append('funcionarioId', filters.funcionarioId);

      const skip = (Math.max(1, page) - 1) * pageSize;
      queryParams.append('skip', String(skip));
      queryParams.append('take', String(pageSize));
      const response = await fetch(`/api/lancamentos-financeiros?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLancamentos(data.data || []);
        if (typeof data.total === 'number') {
          setTotal(data.total);
        }
      } else {
        toast.error('Erro ao carregar lançamentos financeiros');
      }
    } catch (error) {
      toast.error('Erro ao carregar lançamentos financeiros');
    } finally {
      setLoading(false);
    }
  };

  const loadResumo = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.dataInicio) queryParams.append('dataInicio', filters.dataInicio);
      if (filters.dataFim) queryParams.append('dataFim', filters.dataFim);

      const response = await fetch(`/api/lancamentos-financeiros/resumo?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setResumo(data);
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;

    try {
      const response = await fetch(`/api/lancamentos-financeiros/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Lançamento excluído com sucesso');
        loadLancamentos();
        loadResumo();
      } else {
        toast.error('Erro ao excluir lançamento');
      }
    } catch (error) {
      toast.error('Erro ao excluir lançamento');
    }
  };


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lançamentos Financeiros</h1>
            <p className="text-gray-600 mt-2">Gerencie receitas e despesas do sistema</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
            <button
              onClick={() => {
                setSelectedLancamento(null);
                setModalMode('create');
                setShowModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro */}
      {resumo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Linha 1: Receitas */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receitas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(resumo.totalReceitas)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receitas Recebidas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(resumo.receitasRecebidas)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receitas a Receber</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(resumo.receitasAReceber)}</p>
              </div>
            </div>
          </div>
          {/* Saldo: ocupa duas linhas */}
          <div className={`relative overflow-hidden md:row-span-2 rounded-xl shadow-sm border ${resumo.saldo >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <div className={`absolute inset-0 ${resumo.saldo >= 0 ? 'bg-gradient-to-br from-green-50 via-white to-green-100' : 'bg-gradient-to-br from-red-50 via-white to-red-100'}`}></div>
              <div className="relative p-5 h-full flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2.5 rounded-lg ${resumo.saldo >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <DollarSign className={`w-5 h-5 ${resumo.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-600">Saldo</p>
                    <p className={`text-xl md:text-2xl font-extrabold tracking-tight ${resumo.saldo >= 0 ? 'text-green-700' : 'text-red-700'} leading-tight break-words whitespace-normal`}>{formatCurrency(resumo.saldo)}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${resumo.saldo >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {resumo.saldo >= 0 ? 'Positivo' : 'Negativo'}
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500">Receitas (provisionadas)</p>
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(resumo.totalReceitas)}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500">Despesas (provisionadas)</p>
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(resumo.totalDespesas)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Linha 2: Despesas */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Despesas</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(resumo.totalDespesas)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Despesas Pagas</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(resumo.despesasPagas)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Despesas a Pagar</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(resumo.despesasAPagar)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={filters.tipoLancamento}
                onChange={(e) => setFilters({ ...filters, tipoLancamento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Todos</option>
                <option value="CREDITO">Crédito</option>
                <option value="DEBITO">Débito</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
              <select
                value={filters.formaPagamento}
                onChange={(e) => setFilters({ ...filters, formaPagamento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Todas</option>
                <option value="PIX">PIX</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="ESPECIE">Espécie</option>
                <option value="BOLETO">Boleto</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="TRANSFERENCIA">Transferência</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
              <input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
              <input
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  tipoLancamento: '',
                  formaPagamento: '',
                  dataInicio: '',
                  dataFim: '',
                  funcionarioId: '',
                })}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Lançamentos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Lançamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Forma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Funcionário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : lancamentos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              ) : (
                lancamentos.map((lancamento) => (
                  <tr key={lancamento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoLancamentoColor(lancamento.tipoLancamento)}`}>
                        {lancamento.tipoLancamento === 'CREDITO' ? 'Crédito' : 'Débito'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(lancamento.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(lancamento.dataLancamento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lancamento.dataVencimento ? formatDate(lancamento.dataVencimento) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lancamento.dataPagamento ? formatDate(lancamento.dataPagamento) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lancamento.formaPagamento ? getFormaPagamentoLabel(lancamento.formaPagamento) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lancamento.funcionario?.nome || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedLancamento(lancamento);
                            setModalMode('view');
                            setShowModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLancamento(lancamento);
                            setModalMode('edit');
                            setShowModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lancamento.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

      {/* Modal para criar/editar lançamento */}
      {showModal && (
        <LancamentoModal
          lancamento={selectedLancamento}
          mode={modalMode}
          onClose={() => {
            setShowModal(false);
            setSelectedLancamento(null);
            setModalMode('create');
          }}
          onSave={() => {
            setShowModal(false);
            setSelectedLancamento(null);
            setModalMode('create');
            loadLancamentos();
            loadResumo();
          }}
        />
      )}
    </div>
  );
}

// Componente Modal para criar/editar/visualizar lançamento
function LancamentoModal({ 
  lancamento, 
  mode,
  onClose, 
  onSave 
}: { 
  lancamento: LancamentoFinanceiro | null; 
  mode: 'view' | 'edit' | 'create';
  onClose: () => void; 
  onSave: () => void; 
}) {
  const [formData, setFormData] = useState({
    tipoLancamento: lancamento?.tipoLancamento || 'CREDITO',
    valor: lancamento?.valor || '',
    dataLancamento: lancamento?.dataLancamento ? lancamento.dataLancamento.split('T')[0] : '',
    dataVencimento: lancamento?.dataVencimento ? lancamento.dataVencimento.split('T')[0] : '',
    dataPagamento: lancamento?.dataPagamento ? lancamento.dataPagamento.split('T')[0] : '',
    formaPagamento: lancamento?.formaPagamento || '',
    observacao: lancamento?.observacao || '',
  });

  const [loading, setLoading] = useState(false);
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const handleSubmit = async (e: React.FormEvent) => {
    if (isViewMode) return;
    
    e.preventDefault();
    setLoading(true);

    try {
      // Validação e correção do valor
      const valorNum = typeof formData.valor === 'number' ? formData.valor : Number(formData.valor);
      if (isNaN(valorNum) || valorNum < 0.01) {
        toast.error('O valor deve ser maior que R$ 0,01');
        setLoading(false);
        return;
      }

      // Garantir que o valor seja um número válido
      const valorFinal = valorNum;
      if (isNaN(valorFinal) || valorFinal < 0.01) {
        toast.error('Valor inválido');
        setLoading(false);
        return;
      }

      const url = lancamento 
        ? `/api/lancamentos-financeiros/${lancamento.id}`
        : '/api/lancamentos-financeiros';
      
      const method = lancamento ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          valor: valorFinal
        }),
      });

      if (response.ok) {
        toast.success(lancamento ? 'Lançamento atualizado com sucesso' : 'Lançamento criado com sucesso');
        onSave();
      } else {
        toast.error('Erro ao salvar lançamento');
      }
    } catch (error) {
      toast.error('Erro ao salvar lançamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isViewMode ? 'Detalhes do Lançamento' : 
             isEditMode ? 'Editar Lançamento' : 
             'Novo Lançamento'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Lançamento</label>
              {isViewMode ? (
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {formData.tipoLancamento === 'CREDITO' ? 'Crédito' : 'Débito'}
                </div>
              ) : (
                <select
                  value={formData.tipoLancamento}
                  onChange={(e) => setFormData({ ...formData, tipoLancamento: e.target.value as 'CREDITO' | 'DEBITO' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="CREDITO">Crédito</option>
                  <option value="DEBITO">Débito</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
              {isViewMode ? (
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {typeof formData.valor === 'number' ? formatCurrency(formData.valor) : '-'}
                </div>
              ) : (
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.valor}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Permitir valor vazio durante a digitação
                    if (value === '' || value === '.') {
                      setFormData({ ...formData, valor: '' });
                      return;
                    }
                    const valor = parseFloat(value);
                    // Só atualizar se for um número válido
                    if (!isNaN(valor)) {
                      setFormData({ ...formData, valor: valor });
                    }
                  }}
                  onBlur={(e) => {
                    // Validar apenas quando sair do campo
                    const value = e.target.value;
                    if (value === '' || value === '.') {
                      setFormData({ ...formData, valor: '' });
                    } else {
                      const valor = parseFloat(value);
                      if (isNaN(valor) || valor < 0.01) {
                        setFormData({ ...formData, valor: '' });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Lançamento</label>
              {isViewMode ? (
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {formData.dataLancamento ? formatDate(formData.dataLancamento) : '-'}
                </div>
              ) : (
                <input
                  type="date"
                  value={formData.dataLancamento}
                  onChange={(e) => setFormData({ ...formData, dataLancamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Vencimento</label>
              {isViewMode ? (
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {formData.dataVencimento ? formatDate(formData.dataVencimento) : '-'}
                </div>
              ) : (
                <input
                  type="date"
                  value={formData.dataVencimento}
                  onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Pagamento</label>
              {isViewMode ? (
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {formData.dataPagamento ? formatDate(formData.dataPagamento) : '-'}
                </div>
              ) : (
                <input
                  type="date"
                  value={formData.dataPagamento}
                  onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
              {isViewMode ? (
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {formData.formaPagamento ? getFormaPagamentoLabel(formData.formaPagamento) : '-'}
                </div>
              ) : (
                <select
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecione</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="ESPECIE">Espécie</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observação</label>
            {isViewMode ? (
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 min-h-[80px]">
                {formData.observacao || '-'}
              </div>
            ) : (
              <textarea
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isViewMode ? 'Fechar' : 'Cancelar'}
            </button>
            {!isViewMode && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : (lancamento ? 'Atualizar' : 'Criar')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
