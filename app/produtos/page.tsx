'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import api from '../../lib/axios';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Hash,
  Tag,
  Palette,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
    Eye,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  marca?: string;
  cor?: string;
  valor: number;
  percentualComissao?: number;
  classificacao?: string;
  temEstoque: boolean;
  quantidadeMinimaEstoque: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProdutoForm {
  nome: string;
  descricao?: string;
  marca?: string;
  cor?: string;
  valor: number | string;
  percentualComissao?: number | string;
  classificacao: string;
  temEstoque: boolean;
  quantidadeMinimaEstoque: number;
  ativo: boolean;
}

function ProdutosPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [filteredProdutos, setFilteredProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const produtoForm = useForm<ProdutoForm>({
    defaultValues: {
      ativo: true,
      temEstoque: false,
      quantidadeMinimaEstoque: 0,
      valor: '',
      percentualComissao: '',
      classificacao: 'PRODUTO_ESTOQUE'
    }
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadProdutos();
    }
  }, [session, page, pageSize]);

  // Filtrar produtos baseado no termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProdutos(produtos);
    } else {
      const filtered = produtos.filter(produto =>
        produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.cor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProdutos(filtered);
    }
  }, [produtos, searchTerm]);

  // Detectar parâmetro de edição na URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && produtos.length > 0 && !editingProduto) {
      const produtoToEdit = produtos.find(p => p.id === editId);
      if (produtoToEdit) {
        handleEditProduto(produtoToEdit);
      }
    } else if (!editId && editingProduto) {
      setShowCreateForm(false);
      setEditingProduto(null);
      produtoForm.reset();
    }
  }, [searchParams, produtos]);

  const loadProdutos = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/produto', { params: { page, pageSize } });
      setProdutos(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduto = async (data: ProdutoForm) => {
    try {
      setIsLoading(true);
      const payload: any = { ...data };
      // Normalizar valores
      if (!payload.temEstoque) {
        delete payload.quantidadeMinimaEstoque;
        delete payload.percentualComissao;
      }
      if (payload.percentualComissao === '' || isNaN(Number(payload.percentualComissao))) {
        delete payload.percentualComissao;
      }
      if (payload.valor === '' || isNaN(Number(payload.valor))) {
        payload.valor = 0;
      }
      await api.post('/produto', payload);
      toast.success('Produto criado com sucesso!');
      setShowCreateForm(false);
      produtoForm.reset({
        ativo: true,
        temEstoque: false,
        quantidadeMinimaEstoque: 0,
        valor: ''
      });
      loadProdutos();
    } catch (error: any) {
      console.error('Erro ao criar produto:', error);
      toast.error(error.response?.data?.message || 'Erro ao criar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProduto = (produto: Produto) => {
    setEditingProduto(produto);
    produtoForm.reset({
      nome: produto.nome,
      descricao: produto.descricao || '',
      marca: produto.marca || '',
      cor: produto.cor || '',
      valor: Number(produto.valor),
      percentualComissao: typeof produto.percentualComissao === 'number' ? Number(produto.percentualComissao) : ('' as any),
      classificacao: produto.classificacao || 'PRODUTO_ESTOQUE',
      temEstoque: produto.temEstoque,
      quantidadeMinimaEstoque: produto.quantidadeMinimaEstoque,
      ativo: produto.ativo
    });
    setShowCreateForm(true);
  };

  const handleUpdateProduto = async (data: ProdutoForm) => {
    if (!editingProduto) return;

    // Verificar se houve alterações
    const hasChanges = 
      data.nome !== editingProduto.nome ||
      data.descricao !== (editingProduto.descricao || '') ||
      data.marca !== (editingProduto.marca || '') ||
      data.cor !== (editingProduto.cor || '') ||
      Number(data.valor) !== Number(editingProduto.valor) ||
      (data.classificacao || '') !== (editingProduto as any).classificacao ||
      (data.percentualComissao !== undefined && Number(data.percentualComissao) !== Number((editingProduto as any).percentualComissao || 0)) ||
      data.temEstoque !== editingProduto.temEstoque ||
      data.quantidadeMinimaEstoque !== editingProduto.quantidadeMinimaEstoque ||
      data.ativo !== editingProduto.ativo;

    if (!hasChanges) {
      toast.info('Nenhuma alteração foi realizada');
      setShowCreateForm(false);
      setEditingProduto(null);
      produtoForm.reset();
      router.push('/produtos');
      return;
    }

    try {
      setIsLoading(true);
      const payload: any = { ...data };
      // Normalizar valores para evitar erros no backend/DB
      if (!payload.temEstoque) {
        delete payload.quantidadeMinimaEstoque;
        delete payload.percentualComissao;
      }
      if (payload.percentualComissao === '' || isNaN(Number(payload.percentualComissao))) {
        delete payload.percentualComissao;
      }
      if (payload.valor === '' || isNaN(Number(payload.valor))) {
        delete payload.valor;
      }
      await api.put(`/produto/${editingProduto.id}`, payload);
      toast.success('Produto atualizado com sucesso!');
      setShowCreateForm(false);
      setEditingProduto(null);
      produtoForm.reset();
      loadProdutos();
      router.push('/produtos');
    } catch (error: any) {
      console.error('Erro ao atualizar produto:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduto = (produto: Produto) => {
    setProdutoToDelete(produto);
    setShowDeleteModal(true);
  };

  const confirmDeleteProduto = async () => {
    if (!produtoToDelete) return;

    try {
      setIsLoading(true);
      await api.delete(`/produto/${produtoToDelete.id}`);
      toast.success('Produto excluído com sucesso!');
      loadProdutos();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast.error(error.response?.data?.message || 'Erro ao excluir produto');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setProdutoToDelete(null);
    }
  };

  const cancelDeleteProduto = () => {
    setShowDeleteModal(false);
    setProdutoToDelete(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Produtos
          </h2>
          <p className="text-gray-600 mt-2">
            Gerencie o catálogo de produtos da sua empresa.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingProduto(null);
            produtoForm.reset({
              ativo: true,
              quantidadeMinimaEstoque: 0,
              valor: ''
            });
          }}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Create/Edit Produto Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingProduto ? 'Editar Produto' : 'Criar Novo Produto'}
          </h3>
          <form onSubmit={produtoForm.handleSubmit(editingProduto ? handleUpdateProduto : handleCreateProduto)} className="space-y-6">
            {/* Nome e Descrição */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  {...produtoForm.register('nome', { required: 'Nome é obrigatório' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome do produto"
                />
                {produtoForm.formState.errors.nome && (
                  <p className="mt-1 text-sm text-red-600">
                    {produtoForm.formState.errors.nome.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca
                </label>
                <input
                  {...produtoForm.register('marca')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Marca do produto"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                {...produtoForm.register('descricao')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Descrição detalhada do produto"
              />
            </div>

            {/* Cor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor
              </label>
              <input
                {...produtoForm.register('cor')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Cor do produto"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$) *
              </label>
              <input
                {...produtoForm.register('valor', {
                  required: 'Valor é obrigatório',
                  min: { value: 0, message: 'Valor não pode ser negativo' },
                  valueAsNumber: true
                })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
                onBlur={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    e.target.value = value.toFixed(2);
                  }
                }}
              />
              {produtoForm.formState.errors.valor && (
                <p className="mt-1 text-sm text-red-600">
                  {produtoForm.formState.errors.valor.message}
                </p>
              )}
            </div>

            {/* Classificação e Controle de Estoque */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classificação
                </label>
                <select
                  {...produtoForm.register('classificacao', { required: 'Classificação é obrigatória' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PRODUTO_ESTOQUE">Produto de estoque</option>
                  <option value="ATIVO_IMOBILIZADO">Ativo imobilizado</option>
                  <option value="SERVICO">Serviço</option>
                  <option value="MATERIAL_CONSUMO">Material de consumo</option>
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  {...produtoForm.register('temEstoque')}
                  type="checkbox"
                  id="temEstoque"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="temEstoque" className="text-sm font-medium text-gray-700">
                  Produto tem controle de estoque
                </label>
              </div>

              {produtoForm.watch('temEstoque') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade Mínima de Estoque (0-100) *
                  </label>
                  <input
                    {...produtoForm.register('quantidadeMinimaEstoque', {
                      required: produtoForm.watch('temEstoque') ? 'Quantidade mínima é obrigatória quando tem estoque' : false,
                      min: { value: 0, message: 'Mínimo é 0' },
                      max: { value: 100, message: 'Máximo é 100' },
                      valueAsNumber: true
                    })}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                  {produtoForm.formState.errors.quantidadeMinimaEstoque && (
                    <p className="mt-1 text-sm text-red-600">
                      {produtoForm.formState.errors.quantidadeMinimaEstoque.message}
                    </p>
                  )}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Percentual de Comissão (%)
                    </label>
                    <div className="relative">
                      <input
                        {...produtoForm.register('percentualComissao', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0,00"
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            e.target.value = value.toFixed(2);
                          }
                        }}
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Ativo */}
            <div className="flex items-center space-x-3">
              <input
                {...produtoForm.register('ativo')}
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">
                Produto Ativo
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingProduto(null);
                  produtoForm.reset();
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
                {isLoading ? 'Salvando...' : editingProduto ? 'Atualizar' : 'Criar Produto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Produtos List */}
      {!showCreateForm && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Lista de Produtos ({total})
              </h3>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
                  />
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detalhes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque Mín.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProdutos.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {searchTerm ? 'Nenhum produto encontrado para a busca.' : 'Nenhum produto encontrado.'}
                    </td>
                  </tr>
                ) : (
                  filteredProdutos.map((produto) => (
                    <tr key={produto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {produto.nome}
                            </div>
                            {produto.descricao && (
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {produto.descricao}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {produto.marca && (
                            <div className="flex items-center">
                              <Tag className="h-4 w-4 text-gray-400 mr-1" />
                              {produto.marca}
                            </div>
                          )}
                          {produto.cor && (
                            <div className="flex items-center mt-1">
                              <Palette className="h-4 w-4 text-gray-400 mr-1" />
                              {produto.cor}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-green-600">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatCurrency(produto.valor)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Hash className="h-4 w-4 text-gray-400 mr-1" />
                          {produto.quantidadeMinimaEstoque}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {produto.ativo ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/produtos/${produto.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditProduto(produto)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduto(produto)}
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
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && produtoToDelete && (
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
                    Excluir Produto
                  </h3>
                  <p className="text-sm text-gray-500">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Tem certeza que deseja excluir o produto{' '}
                  <span className="font-semibold text-gray-900">{produtoToDelete.nome}</span>?
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteProduto}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteProduto}
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

export default function ProdutosPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ProdutosPageContent />
    </Suspense>
  );
}

