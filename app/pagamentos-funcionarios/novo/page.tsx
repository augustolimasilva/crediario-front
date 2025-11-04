'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../../../lib/axios';
import { Plus, Calendar, DollarSign, User, Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  salario?: number;
}

interface Produto {
  id: string;
  nome: string;
  percentualComissao: number;
}

interface VendaItem {
  id: string;
  produto: Produto;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface Venda {
  id: string;
  nomeCliente: string;
  dataVenda: string;
  valorTotal: number;
  itens: VendaItem[];
}

interface VendasResponse {
  vendas: Venda[];
  valorTotalComissao: number;
  salario: number;
  valorTotalPagamento: number;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export default function NovoPagamentoFuncionarioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<string>('');
  const [funcionarioSelecionadoObj, setFuncionarioSelecionadoObj] = useState<Funcionario | null>(null);
  const [dataLancamento, setDataLancamento] = useState<string>('');
  const [dataPagamento, setDataPagamento] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [desconto, setDesconto] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [dataInicioVendas, setDataInicioVendas] = useState<string>('');
  const [dataFimVendas, setDataFimVendas] = useState<string>('');
  const [vendasData, setVendasData] = useState<VendasResponse | null>(null);
  const [valorPagamento, setValorPagamento] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVendas, setIsLoadingVendas] = useState(false);
  const [vendasPage, setVendasPage] = useState(1);
  const [vendasPageSize, setVendasPageSize] = useState(10);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadFuncionarios();
      // Set data de lançamento para hoje
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setDataLancamento(`${year}-${month}-${day}`);
    }
  }, [session]);

  // Quando selecionar funcionário, carregar salário e inicializar valor
  useEffect(() => {
    if (funcionarioSelecionado) {
      const funcionario = funcionarios.find(f => f.id === funcionarioSelecionado);
      if (funcionario) {
        setFuncionarioSelecionadoObj(funcionario);
        const salario = funcionario.salario ? Number(funcionario.salario) : 0;
        setValorPagamento(salario.toFixed(2));
      }
    } else {
      setFuncionarioSelecionadoObj(null);
      setValorPagamento('0.00');
    }
  }, [funcionarioSelecionado, funcionarios]);

  // Atualizar valor quando vendasData, funcionarioSelecionadoObj ou desconto mudarem
  useEffect(() => {
    // Calcular valor base (comissão + salário)
    const valorBase = vendasData 
      ? vendasData.valorTotalPagamento 
      : (funcionarioSelecionadoObj?.salario ? Number(funcionarioSelecionadoObj.salario) : 0);
    
    // Aplicar desconto
    const descontoValue = desconto ? parseFloat(desconto.replace(',', '.')) : 0;
    const valorFinal = Math.max(0, valorBase - descontoValue);
    setValorPagamento(valorFinal.toFixed(2));
  }, [vendasData, funcionarioSelecionadoObj, desconto]);

  const loadFuncionarios = async () => {
    try {
      const { data } = await api.get('/funcionario');
      setFuncionarios(data.data || data);
    } catch {
      toast.error('Erro ao carregar funcionários');
    }
  };

  const loadVendas = async () => {
    if (!funcionarioSelecionado || !dataInicioVendas || !dataFimVendas) {
      toast.error('Selecione o funcionário e o período de vendas');
      return;
    }

    try {
      setIsLoadingVendas(true);
      const { data } = await api.get(`/venda/funcionario/${funcionarioSelecionado}`, {
        params: {
          dataInicio: dataInicioVendas,
          dataFim: dataFimVendas,
        },
      });
      setVendasData(data);
      setVendasPage(1); // Resetar página quando carregar novas vendas
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao carregar vendas');
      setVendasData(null);
    } finally {
      setIsLoadingVendas(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!funcionarioSelecionado) {
      toast.error('Selecione o funcionário');
      return;
    }

    if (!dataLancamento) {
      toast.error('Informe a data de lançamento');
      return;
    }

    if (!formaPagamento) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    const valorPagamentoNum = parseFloat(valorPagamento.replace(',', '.'));
    if (isNaN(valorPagamentoNum) || valorPagamentoNum <= 0) {
      toast.error('Valor do pagamento inválido');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/lancamentos-financeiros/pagamento-funcionario', {
        funcionarioId: funcionarioSelecionado,
        dataLancamento,
        dataPagamento: dataPagamento || undefined,
        formaPagamento,
        valor: valorPagamentoNum,
        desconto: desconto ? parseFloat(desconto.replace(',', '.')) : undefined,
        observacao: observacao || undefined,
      });

      toast.success('Pagamento registrado com sucesso!');
      router.push('/pagamentos-funcionarios');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao registrar pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  const FORMAS_PAGAMENTO = [
    { value: 'PIX', label: 'PIX' },
    { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
    { value: 'ESPECIE', label: 'Espécie' },
    { value: 'BOLETO', label: 'Boleto' },
    { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
    { value: 'TRANSFERENCIA', label: 'Transferência' },
    { value: 'CHEQUE', label: 'Cheque' },
  ];

  // Paginação das vendas
  const vendasPaginadas = vendasData ? (() => {
    const start = (vendasPage - 1) * vendasPageSize;
    const end = start + vendasPageSize;
    const allItems: Array<{ venda: Venda; item: VendaItem; idx: number }> = [];
    vendasData.vendas.forEach((venda) => {
      venda.itens.forEach((item, idx) => {
        allItems.push({ venda, item, idx });
      });
    });
    return allItems.slice(start, end);
  })() : [];

  const totalVendasItens = vendasData ? vendasData.vendas.reduce((total, venda) => total + venda.itens.length, 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <button
          onClick={() => router.push('/pagamentos-funcionarios')}
          className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </button>
        <h2 className="text-3xl font-bold text-gray-900">Novo Pagamento de Funcionário</h2>
        <p className="text-gray-600 mt-2">Registre pagamentos de salário e comissões para funcionários.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações do Pagamento */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Pagamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Funcionário *
              </label>
              <select
                value={funcionarioSelecionado}
                onChange={(e) => setFuncionarioSelecionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Selecione o funcionário</option>
                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Lançamento *
              </label>
              <input
                type="date"
                value={dataLancamento}
                onChange={(e) => setDataLancamento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Pagamento
              </label>
              <input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento *
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                {FORMAS_PAGAMENTO.map((forma) => (
                  <option key={forma.value} value={forma.value}>
                    {forma.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desconto
              </label>
              <input
                type="text"
                value={desconto}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9,]/g, '').replace(',', '.');
                  setDesconto(value);
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(',', '.');
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue) && numValue >= 0) {
                    setDesconto(numValue.toFixed(2));
                  } else if (value === '' || value === '.') {
                    setDesconto('');
                  }
                }}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observação
              </label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Observações sobre o pagamento"
              />
            </div>
          </div>
        </div>

        {/* Período de Vendas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Período de Vendas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início *
              </label>
              <input
                type="date"
                value={dataInicioVendas}
                onChange={(e) => setDataInicioVendas(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim *
              </label>
              <input
                type="date"
                value={dataFimVendas}
                onChange={(e) => setDataFimVendas(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={loadVendas}
                disabled={isLoadingVendas || !funcionarioSelecionado || !dataInicioVendas || !dataFimVendas}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Buscar Vendas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Vendas */}
        {isLoadingVendas && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">Carregando vendas...</p>
          </div>
        )}

        {vendasData && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas do Período</h3>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total de Comissão</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(vendasData.valorTotalComissao)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Salário</p>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(vendasData.salario)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-lg font-semibold text-indigo-600">{formatCurrency(vendasData.valorTotalPagamento)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Unitário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Comissão</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comissão</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendasPaginadas.map(({ venda, item, idx }) => {
                    const percentualComissao = Number(item.produto?.percentualComissao || 0);
                    const comissaoItem = (Number(item.valorTotal) * percentualComissao) / 100;
                    return (
                      <tr key={`${venda.id}-${item.id}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(venda.dataVenda)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {venda.nomeCliente}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.produto?.nome || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.quantidade}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.valorUnitario)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.valorTotal)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {percentualComissao.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(comissaoItem)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação das vendas */}
            {totalVendasItens > vendasPageSize && (
              <div className="mt-4 px-4 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Por página:</span>
                  <select
                    value={vendasPageSize}
                    onChange={(e) => {
                      setVendasPageSize(Number(e.target.value));
                      setVendasPage(1);
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
                  Página {vendasPage} de {Math.max(1, Math.ceil(totalVendasItens / vendasPageSize))}
                </div>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVendasPage((p) => Math.max(1, p - 1))}
                    disabled={vendasPage <= 1}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full border text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendasPage((p) => p + 1)}
                    disabled={vendasPage >= Math.ceil(totalVendasItens / vendasPageSize)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full border text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Valor do Pagamento */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Valor do Pagamento</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor *
            </label>
            <input
              type="text"
              value={valorPagamento}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9,]/g, '').replace(',', '.');
                setValorPagamento(value);
              }}
              onBlur={(e) => {
                const value = parseFloat(e.target.value.replace(',', '.'));
                if (!isNaN(value)) {
                  setValorPagamento(value.toFixed(2));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-lg font-semibold"
              placeholder="0,00"
              required
            />
            {vendasData && (
              <p className="mt-1 text-xs text-gray-500">
                Valor base: {formatCurrency(vendasData.valorTotalPagamento)} (Comissão: {formatCurrency(vendasData.valorTotalComissao)} + Salário: {formatCurrency(vendasData.salario)})
                {desconto && parseFloat(desconto.replace(',', '.')) > 0 && (
                  <span className="block text-red-600">
                    Desconto: -{formatCurrency(parseFloat(desconto.replace(',', '.')))}
                  </span>
                )}
              </p>
            )}
            {!vendasData && funcionarioSelecionadoObj && (
              <p className="mt-1 text-xs text-gray-500">
                Salário base: {formatCurrency(funcionarioSelecionadoObj.salario || 0)} (sem vendas no período)
                {desconto && parseFloat(desconto.replace(',', '.')) > 0 && (
                  <span className="block text-red-600">
                    Desconto: -{formatCurrency(parseFloat(desconto.replace(',', '.')))}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/pagamentos-funcionarios')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || !funcionarioSelecionado}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <DollarSign className="w-4 h-4" />
            <span>{isLoading ? 'Salvando...' : 'Registrar Pagamento'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

