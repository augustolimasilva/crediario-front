'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../../lib/axios';
import { Plus, Calendar, DollarSign, User, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
}

interface PagamentoFuncionario {
  id: string;
  funcionario?: Funcionario;
  funcionarioId: string;
  valor: number;
  dataLancamento: string;
  dataPagamento?: string;
  formaPagamento?: string;
  observacao?: string;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export default function PagamentosFuncionariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pagamentos, setPagamentos] = useState<PagamentoFuncionario[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    funcionarioId: '',
    dataInicio: '',
    dataFim: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadPagamentos();
      loadFuncionarios();
    }
  }, [session, page, pageSize, filters]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    if (session) {
      setPage(1);
    }
  }, [filters, session]);

  const loadPagamentos = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      
      // Buscar apenas lançamentos de débito com funcionarioId
      queryParams.append('tipoLancamento', 'DEBITO');
      if (filters.funcionarioId) queryParams.append('funcionarioId', filters.funcionarioId);
      if (filters.dataInicio) queryParams.append('dataInicio', filters.dataInicio);
      if (filters.dataFim) queryParams.append('dataFim', filters.dataFim);

      const skip = (Math.max(1, page) - 1) * pageSize;
      queryParams.append('skip', String(skip));
      queryParams.append('take', String(pageSize));

      const response = await fetch(`/api/lancamentos-financeiros?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Filtrar apenas os que têm funcionarioId (pagamentos de funcionário)
        const pagamentosFuncionario = (data.data || []).filter((l: any) => l.funcionarioId);
        setPagamentos(pagamentosFuncionario);
        setTotal(data.total || 0);
      } else {
        toast.error('Erro ao carregar pagamentos');
      }
    } catch (error) {
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFuncionarios = async () => {
    try {
      const { data } = await api.get('/funcionario');
      setFuncionarios(data.data || data);
    } catch {
      // Silencioso
    }
  };

  const getFormaPagamentoLabel = (forma: string) => {
    const formas: { [key: string]: string } = {
      PIX: 'PIX',
      CARTAO_CREDITO: 'Cartão de Crédito',
      ESPECIE: 'Espécie',
      BOLETO: 'Boleto',
      CARTAO_DEBITO: 'Cartão de Débito',
      TRANSFERENCIA: 'Transferência',
      CHEQUE: 'Cheque',
    };
    return formas[forma] || forma;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Pagamentos de Funcionários</h2>
          <p className="text-gray-600 mt-2">Gerencie os pagamentos de funcionários.</p>
        </div>
        <button
          onClick={() => router.push('/pagamentos-funcionarios/novo')}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Pagamento</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Funcionário</label>
            <select
              value={filters.funcionarioId}
              onChange={(e) => setFilters({ ...filters, funcionarioId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
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
                funcionarioId: '',
                dataInicio: '',
                dataFim: '',
              })}
              className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lista de Pagamentos ({total})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Lançamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Funcionário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma de Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : pagamentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              ) : (
                pagamentos.map((pagamento) => (
                  <tr key={pagamento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate(pagamento.dataLancamento)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        {pagamento.funcionario?.nome || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(pagamento.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pagamento.dataPagamento ? formatDate(pagamento.dataPagamento) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pagamento.formaPagamento ? getFormaPagamentoLabel(pagamento.formaPagamento) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {pagamento.observacao || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => router.push(`/pagamentos-funcionarios/${pagamento.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Detalhar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
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
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full border text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
