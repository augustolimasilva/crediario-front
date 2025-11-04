'use client';

import { useSession } from 'next-auth/react';

interface ExtendedSession {
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}
import { useRouter } from 'next/navigation';
import api from '../../lib/axios';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Package,
  Minus,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  valor: number;
}

interface CompraItem {
  produtoId: string;
  quantidade: number;
  valorUnitario: number | string;
}

interface CompraPagamento {
  formaPagamento: string;
  valor: number | string;
  dataVencimento: string;
  dataPagamento?: string;
  quantidadeParcelas?: number;
  observacao?: string;
}

interface CompraForm {
  nomeFornecedor: string;
  dataCompra: string;
  desconto?: number;
  itens: CompraItem[];
  pagamentos: CompraPagamento[];
}

interface Compra {
  id: string;
  nomeFornecedor: string;
  valorTotal: number;
  dataCompra: string;
  usuario: {
    name: string;
  };
  itens: Array<{
    id: string;
    produto: Produto;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
  pagamentos: Array<{
    id: string;
    formaPagamento: string;
    valor: number;
    dataVencimento: string;
    dataPagamento?: string;
    status: string;
    observacao?: string;
  }>;
  createdAt: string;
}

const formasPagamento = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'ESPECIE', label: 'Espécie' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
];

export default function ComprasPage() {
  const { data: session, status } = useSession() as { data: ExtendedSession | null; status: string };
  const router = useRouter();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSearch, setProdutoSearch] = useState<string[]>([]);
  const [openSuggest, setOpenSuggest] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [compraToDelete, setCompraToDelete] = useState<Compra | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [compraDetalhes, setCompraDetalhes] = useState<Compra | null>(null);
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [comprasFiltradas, setComprasFiltradas] = useState<Compra[]>([]);

  const compraForm = useForm<CompraForm>({
    defaultValues: {
      nomeFornecedor: '',
      dataCompra: new Date().toISOString().split('T')[0],
      itens: [{ produtoId: '', quantidade: 1, valorUnitario: '' }],
      pagamentos: [{ formaPagamento: 'PIX', valor: '', dataVencimento: new Date().toISOString().split('T')[0] }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: compraForm.control,
    name: 'itens',
  });

  const { fields: pagamentoFields, append: appendPagamento, remove: removePagamento } = useFieldArray({
    control: compraForm.control,
    name: 'pagamentos',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadCompras();
      loadProdutos();
    }
  }, [session, page, pageSize]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = compras;

    if (filtroDataInicio) {
      filtered = filtered.filter(compra => 
        new Date(compra.dataCompra) >= new Date(filtroDataInicio)
      );
    }

    if (filtroDataFim) {
      filtered = filtered.filter(compra => 
        new Date(compra.dataCompra) <= new Date(filtroDataFim)
      );
    }

    if (filtroFornecedor) {
      filtered = filtered.filter(compra => 
        compra.nomeFornecedor.toLowerCase().includes(filtroFornecedor.toLowerCase())
      );
    }

    setComprasFiltradas(filtered);
  }, [compras, filtroDataInicio, filtroDataFim, filtroFornecedor]);

  const loadCompras = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/compra', { params: { page, pageSize } });
      setCompras(data.data);
      setTotal(data.total);
    } catch (error) {
      toast.error('Erro ao carregar compras');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProdutos = async () => {
    try {
      const { data } = await api.get('/produto', { params: { page: 1, pageSize: 1000 } });
      setProdutos((data.data as Array<Produto & { ativo: boolean }>).filter((p) => (p as any).ativo));
    } catch (error) {
      console.error('Erro ao carregar produtos', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  const calcularValorTotal = () => {
    const itens = compraForm.watch('itens');
    return itens.reduce((total, item) => {
      const quantidade = Number(item.quantidade) || 0;
      const valorUnitario = Number(item.valorUnitario) || 0;
      return total + (quantidade * valorUnitario);
    }, 0);
  };

  const calcularValorTotalPagamentos = () => {
    const pagamentos = compraForm.watch('pagamentos');
    return pagamentos.reduce((total, pagamento) => {
      const valor = Number(pagamento.valor) || 0;
      return total + valor;
    }, 0);
  };

  const isFormValid = () => {
    const valorTotalItens = calcularValorTotal();
    const desconto = Number(compraForm.watch('desconto') || 0);
    const valorTotalCompra = Math.max(0, valorTotalItens - desconto);
    const valorTotalPagamentos = calcularValorTotalPagamentos();
    const pagamentos = compraForm.watch('pagamentos');
    
    // Verificar se os valores coincidem (com tolerância de 0.01) - USANDO VALOR COM DESCONTO
    const valoresCoincidem = Math.abs(valorTotalPagamentos - valorTotalCompra) <= 0.01;
    
    // Verificar se há pelo menos um pagamento
    const temPagamentos = pagamentos.length > 0;
    
    // Verificar se todos os pagamentos têm dados válidos
    const pagamentosValidos = pagamentos.every(pagamento => {
      const temFormaPagamento = pagamento.formaPagamento && pagamento.formaPagamento !== '';
      const temValor = pagamento.valor && Number(pagamento.valor) > 0;
      const temDataVencimento = pagamento.dataVencimento && pagamento.dataVencimento !== '';
      
      // Se for cartão de crédito, verificar se tem quantidade de parcelas
      const temParcelas = pagamento.formaPagamento !== 'CARTAO_CREDITO' || 
                         (pagamento.quantidadeParcelas && Number(pagamento.quantidadeParcelas) > 0);
      
      return temFormaPagamento && temValor && temDataVencimento && temParcelas;
    });
    
    return valoresCoincidem && temPagamentos && pagamentosValidos;
  };

  const handleCreateCompra = async (data: CompraForm) => {
    if (!session?.user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (data.itens.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    if (data.pagamentos.length === 0) {
      toast.error('Adicione pelo menos uma forma de pagamento');
      return;
    }

    // Validar itens
    for (const item of data.itens) {
      if (!item.produtoId) {
        toast.error('Selecione todos os produtos');
        return;
      }
      if (Number(item.quantidade) <= 0) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }
      if (Number(item.valorUnitario) <= 0) {
        toast.error('Valor unitário deve ser maior que zero');
        return;
      }
    }

    // Validar pagamentos
    for (const pagamento of data.pagamentos) {
      if (!pagamento.formaPagamento) {
        toast.error('Selecione a forma de pagamento para todos os pagamentos');
        return;
      }
      if (Number(pagamento.valor) <= 0) {
        toast.error('Valor do pagamento deve ser maior que zero');
        return;
      }
      if (!pagamento.dataVencimento) {
        toast.error('Data de vencimento é obrigatória para todos os pagamentos');
        return;
      }
      if (pagamento.formaPagamento === 'CARTAO_CREDITO' && (!pagamento.quantidadeParcelas || pagamento.quantidadeParcelas <= 0)) {
        toast.error('Quantidade de parcelas é obrigatória para cartão de crédito');
        return;
      }
    }

    // Validar se o valor total dos pagamentos é igual ao valor total da compra (após desconto)
    const valorTotalItens = calcularValorTotal();
    const desconto = Number(compraForm.watch('desconto') || 0);
    const valorTotalCompra = Math.max(0, valorTotalItens - desconto);
    const valorTotalPagamentos = calcularValorTotalPagamentos();
    
    if (Math.abs(valorTotalPagamentos - valorTotalCompra) > 0.01) {
      toast.error(`O valor total dos pagamentos (R$ ${valorTotalPagamentos.toFixed(2)}) deve ser igual ao valor total da compra (R$ ${valorTotalCompra.toFixed(2)})`);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compra`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          desconto: Number(data.desconto || 0),
          usuarioId: session?.user?.id || 'temp-user-id',
        }),
      });

      if (response.ok) {
        toast.success('Compra registrada com sucesso! Estoque atualizado.');
        setShowCreateForm(false);
        compraForm.reset({
          nomeFornecedor: '',
          dataCompra: new Date().toISOString().split('T')[0],
          itens: [{ produtoId: '', quantidade: 1, valorUnitario: '' }],
          pagamentos: [{ formaPagamento: 'PIX', valor: '', dataVencimento: new Date().toISOString().split('T')[0] }],
        });
        loadCompras();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao registrar compra');
      }
    } catch (error) {
      toast.error('Erro ao registrar compra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCompra = (compra: Compra) => {
    setCompraToDelete(compra);
    setShowDeleteModal(true);
  };

  const confirmDeleteCompra = async () => {
    if (!compraToDelete) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compra/${compraToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Compra excluída com sucesso!');
        loadCompras();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir compra');
      }
    } catch (error) {
      toast.error('Erro ao excluir compra');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setCompraToDelete(null);
    }
  };

  const cancelDeleteCompra = () => {
    setShowDeleteModal(false);
    setCompraToDelete(null);
  };

  const handleVerDetalhes = (compra: Compra) => {
    router.push(`/compras/${compra.id}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getFormaPagamentoLabel = (value: string) => {
    return formasPagamento.find(f => f.value === value)?.label || value;
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

  const valorTotalItens = calcularValorTotal();
  const desconto = Number(compraForm.watch('desconto') || 0);
  const valorTotalCompra = Math.max(0, valorTotalItens - desconto);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Compras</h2>
          <p className="text-gray-600 mt-2">
            Registre e gerencie as compras de produtos.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            compraForm.reset({
              nomeFornecedor: '',
              dataCompra: new Date().toISOString().split('T')[0],
              itens: [{ produtoId: '', quantidade: 1, valorUnitario: '' }],
              pagamentos: [{ formaPagamento: 'PIX', valor: '', dataVencimento: new Date().toISOString().split('T')[0] }],
            });
          }}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nova Compra</span>
        </button>
      </div>

      {/* Create Compra Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Registrar Nova Compra
          </h3>
          <form onSubmit={compraForm.handleSubmit(handleCreateCompra)} className="space-y-6">
            {/* Dados da Compra */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Fornecedor *
                </label>
                <input
                  {...compraForm.register('nomeFornecedor', { required: 'Fornecedor é obrigatório' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome do fornecedor"
                />
                {compraForm.formState.errors.nomeFornecedor && (
                  <p className="mt-1 text-sm text-red-600">
                    {compraForm.formState.errors.nomeFornecedor.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Compra *
                </label>
                <input
                  {...compraForm.register('dataCompra', { required: true })}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Itens da Compra */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Produtos *
                </label>
                <button
                  type="button"
                  onClick={() => append({ produtoId: '', quantidade: 1, valorUnitario: '' })}
                  className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Produto</span>
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Produto *
                      </label>
                      <div className="relative">
                        <input
                          value={produtoSearch[index] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const arr = [...produtoSearch];
                            arr[index] = val;
                            setProdutoSearch(arr);
                            const open = [...openSuggest];
                            open[index] = true;
                            setOpenSuggest(open);
                          }}
                          onFocus={() => {
                            const open = [...openSuggest];
                            open[index] = true;
                            setOpenSuggest(open);
                          }}
                          placeholder="Digite para buscar produto (nome/descrição)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {openSuggest[index] && (
                          <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded-lg shadow">
                            {produtos
                              .filter((p) => {
                                const q = (produtoSearch[index] || '').toLowerCase().trim();
                                if (!q) return true;
                                return (
                                  p.nome.toLowerCase().includes(q) ||
                                  (p as any).descricao?.toLowerCase().includes(q) ||
                                  (p as any).marca?.toLowerCase().includes(q)
                                );
                              })
                              .slice(0, 12)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    compraForm.setValue(`itens.${index}.produtoId` as const, p.id, { shouldValidate: true });
                                    const arr = [...produtoSearch];
                                    arr[index] = p.nome;
                                    setProdutoSearch(arr);
                                    const open = [...openSuggest];
                                    open[index] = false;
                                    setOpenSuggest(open);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 focus:bg-indigo-50"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-800 truncate mr-2">{p.nome}</span>
                                  </div>
                                  {p.descricao && (
                                    <div className="text-xs text-gray-500 truncate">{(p as any).descricao}</div>
                                  )}
                                </button>
                              ))}
                            {produtos.length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-500">Nenhum produto carregado</div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Campo oculto controlado pelo RHF para manter produtoId */}
                      <input type="hidden" {...compraForm.register(`itens.${index}.produtoId` as const, { required: true })} />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantidade *
                      </label>
                      <input
                        {...compraForm.register(`itens.${index}.quantidade` as const, { 
                          required: true,
                          min: 1,
                          valueAsNumber: true
                        })}
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Qtd"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Valor Unitário *
                      </label>
                      <input
                        {...compraForm.register(`itens.${index}.valorUnitario` as const, { 
                          required: true,
                          min: 0.01,
                          valueAsNumber: true
                        })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Valor unitário"
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            e.target.value = value.toFixed(2);
                          }
                        }}
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col justify-end space-y-1">
                      <label className="block text-xs font-medium text-gray-600">
                        Total
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency((Number(compraForm.watch(`itens.${index}.quantidade`)) || 0) * (Number(compraForm.watch(`itens.${index}.valorUnitario`)) || 0))}
                        </span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remover item"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formas de Pagamento */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Formas de Pagamento *
                </label>
                <button
                  type="button"
                  onClick={() => appendPagamento({ formaPagamento: 'PIX', valor: '', dataVencimento: new Date().toISOString().split('T')[0] })}
                  className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Pagamento</span>
                </button>
              </div>

              <div className="space-y-3">
                {pagamentoFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Forma de Pagamento *
                      </label>
                      <select
                        {...compraForm.register(`pagamentos.${index}.formaPagamento` as const, { required: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Selecione a forma</option>
                        {formasPagamento.map((forma) => (
                          <option key={forma.value} value={forma.value}>
                            {forma.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Valor *
                      </label>
                      <input
                        {...compraForm.register(`pagamentos.${index}.valor` as const, { 
                          required: true,
                          min: 0.01,
                          valueAsNumber: true
                        })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Valor"
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            e.target.value = value.toFixed(2);
                          }
                        }}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Data Vencimento *
                      </label>
                      <input
                        {...compraForm.register(`pagamentos.${index}.dataVencimento` as const, { required: true })}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Data Pagamento
                      </label>
                      <input
                        {...compraForm.register(`pagamentos.${index}.dataPagamento` as const)}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Data Pagamento (opcional)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Observação
                      </label>
                      <input
                        {...compraForm.register(`pagamentos.${index}.observacao` as const)}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Observação (opcional)"
                      />
                    </div>

                    {/* Campo de quantidade de parcelas - só aparece para cartão de crédito */}
                    {compraForm.watch(`pagamentos.${index}.formaPagamento`) === 'CARTAO_CREDITO' && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantidade de Parcelas *
                        </label>
                        <input
                          {...compraForm.register(`pagamentos.${index}.quantidadeParcelas` as const, { 
                            required: compraForm.watch(`pagamentos.${index}.formaPagamento`) === 'CARTAO_CREDITO',
                            min: 1,
                            max: 24,
                            valueAsNumber: true
                          })}
                          type="number"
                          min="1"
                          max="24"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Ex: 12"
                        />
                      </div>
                    )}

                    <div className="md:col-span-1 flex items-center justify-end">
                      {pagamentoFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePagamento(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remover pagamento"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desconto */}
            <div className="max-w-xs">
              <label className="block text-xs text-gray-500 mb-1">
                Desconto (opcional)
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  {...compraForm.register('desconto', { valueAsNumber: true })}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Resumo dos Valores */}
            <div className="flex justify-end space-x-4">
              <div className="bg-gray-50 px-6 py-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Valor Total dos Itens</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(valorTotalItens)}
                </p>
                {desconto > 0 && (
                  <>
                    <p className="text-xs text-red-600 mt-1">
                      Desconto: -{formatCurrency(desconto)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 pt-1 border-t border-gray-300">
                      Total com desconto: <span className="font-bold">{formatCurrency(valorTotalCompra)}</span>
                    </p>
                  </>
                )}
              </div>
              <div className={`px-6 py-4 rounded-lg ${
                Math.abs(calcularValorTotalPagamentos() - valorTotalCompra) <= 0.01 
                  ? 'bg-green-50' 
                  : 'bg-red-50'
              }`}>
                <p className="text-sm text-gray-600 mb-1">Valor Total dos Pagamentos</p>
                <p className={`text-xl font-bold ${
                  Math.abs(calcularValorTotalPagamentos() - valorTotalCompra) <= 0.01 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatCurrency(calcularValorTotalPagamentos())}
                </p>
                {Math.abs(calcularValorTotalPagamentos() - valorTotalCompra) > 0.01 && (
                  <p className="text-xs text-red-600 mt-1">
                    Deve ser igual ao total {desconto > 0 ? 'com desconto' : 'da compra'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  compraForm.reset();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Registrando...' : 'Registrar Compra'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      {!showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fornecedor
              </label>
              <input
                type="text"
                placeholder="Nome do fornecedor"
                value={filtroFornecedor}
                onChange={(e) => setFiltroFornecedor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFiltroDataInicio('');
                  setFiltroDataFim('');
                  setFiltroFornecedor('');
                }}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compras List */}
      {!showCreateForm && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Lista de Compras ({total})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagamentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qtd. Itens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comprasFiltradas.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      Nenhuma compra registrada.
                    </td>
                  </tr>
                ) : (
                  comprasFiltradas.map((compra) => (
                    <tr key={compra.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {formatDate(compra.dataCompra)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {compra.nomeFornecedor}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {compra.pagamentos?.length > 0 ? (
                            <div className="space-y-1">
                              {compra.pagamentos.slice(0, 2).map((pagamento, index) => (
                                <div key={index} className="flex items-center">
                                  <CreditCard className="h-3 w-3 text-gray-400 mr-1" />
                                  <span className="text-xs">
                                    {getFormaPagamentoLabel(pagamento.formaPagamento)} - {formatCurrency(pagamento.valor)}
                                  </span>
                                </div>
                              ))}
                              {compra.pagamentos.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{compra.pagamentos.length - 2} mais
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Package className="h-4 w-4 text-gray-400 mr-2" />
                          {compra.itens.length}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-green-600">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatCurrency(compra.valorTotal)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          {compra.usuario.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleVerDetalhes(compra)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompra(compra)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!showCreateForm && (
        <div className="mt-4 px-6 py-4 bg-white rounded-lg shadow flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
      )}

      {/* Modal de Detalhes */}
      {showDetalhesModal && compraDetalhes && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Detalhes da Compra
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(compraDetalhes.dataCompra)}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetalhesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Fornecedor</p>
                  <p className="text-lg font-medium text-gray-900">{compraDetalhes.nomeFornecedor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Usuário</p>
                  <p className="text-lg font-medium text-gray-900">{compraDetalhes.usuario.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(compraDetalhes.valorTotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Qtd. Pagamentos</p>
                  <p className="text-lg font-medium text-gray-900">{compraDetalhes.pagamentos?.length || 0}</p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Produtos</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qtd</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Unit.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {compraDetalhes.itens.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.produto.nome}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.quantidade}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.valorUnitario)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(item.valorTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagamentos */}
              {compraDetalhes.pagamentos && compraDetalhes.pagamentos.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Pagamentos</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma de Pagamento</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {compraDetalhes.pagamentos.map((pagamento) => (
                          <tr key={pagamento.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {getFormaPagamentoLabel(pagamento.formaPagamento)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {formatCurrency(pagamento.valor)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(pagamento.dataVencimento)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {pagamento.dataPagamento ? formatDate(pagamento.dataPagamento) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                pagamento.status === 'PAGO' 
                                  ? 'bg-green-100 text-green-800' 
                                  : pagamento.status === 'VENCIDO'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {pagamento.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetalhesModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && compraToDelete && (
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
                    Excluir Compra
                  </h3>
                  <p className="text-sm text-gray-500">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Tem certeza que deseja excluir a compra do fornecedor{' '}
                  <span className="font-semibold text-gray-900">{compraToDelete.nomeFornecedor}</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Valor: {formatCurrency(compraToDelete.valorTotal)}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteCompra}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteCompra}
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

