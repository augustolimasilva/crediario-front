'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Eye
} from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  valorVenda: number;
}

interface CompraItem {
  produtoId: string;
  quantidade: number;
  valorUnitario: number;
}

interface CompraForm {
  nomeFornecedor: string;
  formaPagamento: string;
  dataCompra: string;
  itens: CompraItem[];
}

interface Compra {
  id: string;
  nomeFornecedor: string;
  formaPagamento: string;
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [compraToDelete, setCompraToDelete] = useState<Compra | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [compraDetalhes, setCompraDetalhes] = useState<Compra | null>(null);

  const compraForm = useForm<CompraForm>({
    defaultValues: {
      nomeFornecedor: '',
      formaPagamento: 'PIX',
      dataCompra: new Date().toISOString().split('T')[0],
      itens: [{ produtoId: '', quantidade: 1, valorUnitario: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: compraForm.control,
    name: 'itens',
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
  }, [session]);

  const loadCompras = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compra`);

      if (response.ok) {
        const comprasData = await response.json();
        setCompras(comprasData);
      } else {
        toast.error('Erro ao carregar compras');
      }
    } catch (error) {
      toast.error('Erro ao carregar compras');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProdutos = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/produto`, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });

      if (response.ok) {
        const produtosData = await response.json();
        setProdutos(produtosData.filter((p: Produto & { ativo: boolean }) => p.ativo));
      }
    } catch (error) {
      console.error('Erro ao carregar produtos');
    }
  };

  const calcularValorTotal = () => {
    const itens = compraForm.watch('itens');
    return itens.reduce((total, item) => {
      return total + (item.quantidade * item.valorUnitario);
    }, 0);
  };

  const handleCreateCompra = async (data: CompraForm) => {
    if (data.itens.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    // Validar itens
    for (const item of data.itens) {
      if (!item.produtoId) {
        toast.error('Selecione todos os produtos');
        return;
      }
      if (item.quantidade <= 0) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }
      if (item.valorUnitario <= 0) {
        toast.error('Valor unitário deve ser maior que zero');
        return;
      }
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
          usuarioId: session?.user?.id,
        }),
      });

      if (response.ok) {
        toast.success('Compra registrada com sucesso! Estoque atualizado.');
        setShowCreateForm(false);
        compraForm.reset({
          nomeFornecedor: '',
          formaPagamento: 'PIX',
          dataCompra: new Date().toISOString().split('T')[0],
          itens: [{ produtoId: '', quantidade: 1, valorUnitario: 0 }],
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
    setCompraDetalhes(compra);
    setShowDetalhesModal(true);
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

  const valorTotalCompra = calcularValorTotal();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Compras
          </h2>
          <p className="text-gray-600 mt-2">
            Registre e gerencie as compras de produtos.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            compraForm.reset({
              nomeFornecedor: '',
              formaPagamento: 'PIX',
              dataCompra: new Date().toISOString().split('T')[0],
              itens: [{ produtoId: '', quantidade: 1, valorUnitario: 0 }],
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Forma de Pagamento *
                </label>
                <select
                  {...compraForm.register('formaPagamento', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {formasPagamento.map((forma) => (
                    <option key={forma.value} value={forma.value}>
                      {forma.label}
                    </option>
                  ))}
                </select>
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
                  onClick={() => append({ produtoId: '', quantidade: 1, valorUnitario: 0 })}
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
                      <select
                        {...compraForm.register(`itens.${index}.produtoId` as const, { required: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Selecione o produto</option>
                        {produtos.map((produto) => (
                          <option key={produto.id} value={produto.id}>
                            {produto.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
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

                    <div className="md:col-span-2 flex items-center justify-end space-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency((compraForm.watch(`itens.${index}.quantidade`) || 0) * (compraForm.watch(`itens.${index}.valorUnitario`) || 0))}
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
                ))}
              </div>
            </div>

            {/* Valor Total */}
            <div className="flex justify-end">
              <div className="bg-indigo-50 px-6 py-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Valor Total da Compra</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(valorTotalCompra)}
                </p>
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
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Registrando...' : 'Registrar Compra'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Compras List */}
      {!showCreateForm && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Histórico de Compras ({compras.length})
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
                    Forma de Pagamento
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
                {compras.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      Nenhuma compra registrada.
                    </td>
                  </tr>
                ) : (
                  compras.map((compra) => (
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
                        <div className="flex items-center text-sm text-gray-900">
                          <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                          {getFormaPagamentoLabel(compra.formaPagamento)}
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
                  <p className="text-sm text-gray-500">Forma de Pagamento</p>
                  <p className="text-lg font-medium text-gray-900">{getFormaPagamentoLabel(compraDetalhes.formaPagamento)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Usuário</p>
                  <p className="text-lg font-medium text-gray-900">{compraDetalhes.usuario.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(compraDetalhes.valorTotal)}</p>
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
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
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

