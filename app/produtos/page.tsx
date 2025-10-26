'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
  XCircle
} from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  marca?: string;
  cor?: string;
  nomeFornecedor?: string;
  valorVenda: number;
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
  valorVenda: number;
  quantidadeMinimaEstoque: number;
  ativo: boolean;
}

export default function ProdutosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);

  const produtoForm = useForm<ProdutoForm>({
    defaultValues: {
      ativo: true,
      quantidadeMinimaEstoque: 0,
      valorVenda: 0
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
  }, [session]);

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/produto`);

      if (response.ok) {
        const produtosData = await response.json();
        setProdutos(produtosData);
      } else {
        toast.error('Erro ao carregar produtos');
      }
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduto = async (data: ProdutoForm) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/produto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Produto criado com sucesso!');
        setShowCreateForm(false);
        produtoForm.reset({
          ativo: true,
          quantidadeMinimaEstoque: 0,
          valorVenda: 0
        });
        loadProdutos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao criar produto');
      }
    } catch (error) {
      toast.error('Erro ao criar produto');
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
      nomeFornecedor: produto.nomeFornecedor || '',
      valorVenda: Number(produto.valorVenda),
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
      data.nomeFornecedor !== (editingProduto.nomeFornecedor || '') ||
      Number(data.valorVenda) !== Number(editingProduto.valorVenda) ||
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/produto/${editingProduto.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Produto atualizado com sucesso!');
        setShowCreateForm(false);
        setEditingProduto(null);
        produtoForm.reset();
        loadProdutos();
        router.push('/produtos');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao atualizar produto');
      }
    } catch (error) {
      toast.error('Erro ao atualizar produto');
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/produto/${produtoToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Produto excluído com sucesso!');
        loadProdutos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir produto');
      }
    } catch (error) {
      toast.error('Erro ao excluir produto');
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
              valorVenda: 0
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

            {/* Valor e Estoque */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor de Venda (R$) *
                </label>
                <input
                  {...produtoForm.register('valorVenda', {
                    required: 'Valor de venda é obrigatório',
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
                {produtoForm.formState.errors.valorVenda && (
                  <p className="mt-1 text-sm text-red-600">
                    {produtoForm.formState.errors.valorVenda.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade Mínima de Estoque (0-100) *
                </label>
                <input
                  {...produtoForm.register('quantidadeMinimaEstoque', {
                    required: 'Quantidade mínima é obrigatória',
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
              </div>
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
            <h3 className="text-lg font-semibold text-gray-900">
              Lista de Produtos ({produtos.length})
            </h3>
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
                {produtos.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
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
                          {formatCurrency(produto.valorVenda)}
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

