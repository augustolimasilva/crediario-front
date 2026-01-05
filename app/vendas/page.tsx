'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import api from '../../lib/axios';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Package, User, Calendar, List, Eye } from 'lucide-react';

interface Produto { id: string; nome: string; valor: number; descricao?: string; marca?: string; temEstoque?: boolean }
interface Funcionario { id: string; nome: string }

interface VendaItemForm { produtoId: string; quantidade: number | string; valorUnitario: number | string }
interface VendaPagamentoForm { formaPagamento: string; valor: number | string; dataVencimento: string; dataPagamento?: string; quantidadeParcelas: number | string; observacao?: string }
interface VendaForm { nomeCliente: string; rua?: string; bairro?: string; cidade?: string; numero?: string; observacao?: string; desconto?: number; dataVenda: string; vendedorId: string; itens: VendaItemForm[]; pagamentos: VendaPagamentoForm[] }

interface Venda {
  id: string;
  nomeCliente: string;
  dataVenda: string;
  valorTotal: number;
  vendedor: { id: string; name?: string };
  itens: Array<{ id: string; produto: Produto; quantidade: number; valorUnitario: number; valorTotal: number }>;
  pagamentos: Array<{ id: string; formaPagamento: string; valor: number; dataVencimento: string; dataPagamento?: string; status: string }>;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

// Função para obter data atual no formato YYYY-MM-DD no timezone local
const getTodayLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function VendasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendedores, setVendedores] = useState<Funcionario[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingVendaId, setEditingVendaId] = useState<string | null>(null);
  const [produtoSearch, setProdutoSearch] = useState<string[]>([]);
  const [openSuggest, setOpenSuggest] = useState<boolean[]>([]);
  const [showParcelasModal, setShowParcelasModal] = useState(false);
  const [estoquePorItem, setEstoquePorItem] = useState<{ [fieldId: string]: number | null }>({});
  const [filters, setFilters] = useState({
    nomeCliente: '',
    numeroVenda: '',
    dataInicio: '',
    dataFim: '',
  });

  const vendaForm = useForm<VendaForm>({
    defaultValues: {
      nomeCliente: '', dataVenda: getTodayLocalDate(), vendedorId: '',
      itens: [{ produtoId: '', quantidade: 1, valorUnitario: '' }],
      pagamentos: [{ formaPagamento: 'PIX', valor: '', dataVencimento: getTodayLocalDate(), quantidadeParcelas: 1 }],
    }
  });
  const { fields, append, prepend, remove } = useFieldArray({ control: vendaForm.control, name: 'itens' });
  const { fields: pagFields, append: appendPag, remove: removePag } = useFieldArray({ control: vendaForm.control, name: 'pagamentos' });

  // Calcular valor total dos itens e atualizar automaticamente o valor do pagamento
  const valorTotalItens = vendaForm.watch('itens').reduce((total, item) => {
    return total + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
  }, 0);
  const desconto = Number(vendaForm.watch('desconto') || 0);
  const valorTotalVenda = Math.max(0, valorTotalItens - desconto);

  // Watch dos valores do formulário para validação reativa
  const formValues = vendaForm.watch();
  
  // Validar se todos os campos obrigatórios estão preenchidos
  const isFormValid = (() => {
    // Verificar campos obrigatórios principais
    if (!formValues.nomeCliente?.trim() || !formValues.vendedorId || !formValues.dataVenda) {
      return false;
    }
    // Verificar se tem pelo menos 1 item válido
    if (!formValues.itens || formValues.itens.length === 0) {
      return false;
    }
    // Verificar se todos os itens têm produtoId, quantidade e valorUnitario
    const itensValidos = formValues.itens.every(item => 
      item.produtoId && 
      item.quantidade && Number(item.quantidade) > 0 && 
      item.valorUnitario && Number(item.valorUnitario) > 0
    );
    if (!itensValidos) {
      return false;
    }
    // Verificar se tem pelo menos 1 pagamento válido
    if (!formValues.pagamentos || formValues.pagamentos.length === 0) {
      return false;
    }
    // Verificar se todos os pagamentos têm formaPagamento, valor, dataVencimento e quantidadeParcelas
    const pagamentosValidos = formValues.pagamentos.every(pag => 
      pag.formaPagamento && 
      pag.valor && Number(pag.valor) > 0 && 
      pag.dataVencimento && 
      pag.quantidadeParcelas && Number(pag.quantidadeParcelas) > 0
    );
    return pagamentosValidos;
  })();

  // Atualizar valor do pagamento quando o valor total dos itens mudar
  useEffect(() => {
    if (pagFields.length > 0) {
      // Atualizar apenas o primeiro pagamento com o valor total
      vendaForm.setValue(`pagamentos.0.valor` as const, Number(valorTotalVenda.toFixed(2)), { shouldValidate: false });
    }
  }, [valorTotalVenda, pagFields.length, vendaForm]);

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);
  
  // Resetar página quando filtros mudarem (antes de carregar os dados)
  useEffect(() => {
    if (session) {
      setPage(1);
    }
  }, [filters, session]);

  useEffect(() => { 
    if (session) { 
      loadVendas(); 
      loadProdutos(); 
      loadVendedores(); 
    } 
  }, [session, page, pageSize, filters]);

  // Detectar parâmetro de edição na URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !editingVendaId && session) {
      // Primeiro tenta encontrar na lista atual
      const vendaToEdit = vendas.find(v => v.id === editId);
      if (vendaToEdit) {
        handleEditVenda(vendaToEdit);
      } else if (vendas.length > 0) {
        // Se a lista já foi carregada mas a venda não está nela, buscar diretamente
        fetchVendaById(editId);
      }
    } else if (!editId && editingVendaId) {
      // Se não há mais parâmetro edit na URL e há uma venda sendo editada, fechar o formulário
      setEditingVendaId(null);
      setShowForm(false);
      vendaForm.reset({
        nomeCliente: '',
        dataVenda: getTodayLocalDate(),
        vendedorId: '',
        itens: [{ produtoId: '', quantidade: 1, valorUnitario: '' }],
        pagamentos: [{ formaPagamento: 'PIX', valor: '', dataVencimento: getTodayLocalDate(), quantidadeParcelas: 1 }],
      });
      setProdutoSearch([]);
      setOpenSuggest([]);
      setEstoquePorItem({});
    }
  }, [searchParams, vendas.length, editingVendaId, session]);

  const loadVendas = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, pageSize };
      if (filters.nomeCliente) params.nomeCliente = filters.nomeCliente;
      if (filters.numeroVenda) params.numeroVenda = filters.numeroVenda;
      if (filters.dataInicio) params.dataInicio = filters.dataInicio;
      if (filters.dataFim) params.dataFim = filters.dataFim;
      
      const { data } = await api.get('/venda', { params });
      setVendas(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar vendas');
    } finally {
      setIsLoading(false);
    }
  };
  const loadProdutos = async () => { try { const { data } = await api.get('/produto', { params: { page: 1, pageSize: 1000 } }); setProdutos(data.data || data); } catch {} };
  const loadVendedores = async () => {
    try {
      const { data } = await api.get('/funcionario');
      setVendedores(data.data || data);
    } catch {}
  };

  const fetchVendaById = async (vendaId: string) => {
    try {
      const { data } = await api.get(`/venda/${vendaId}`);
      handleEditVenda(data);
    } catch (error: any) {
      console.error('Erro ao carregar venda:', error);
      toast.error('Erro ao carregar venda para edição');
    }
  };

  const handleEditVenda = (venda: Venda) => {
    setEditingVendaId(venda.id);
    setShowForm(true);
    
    // Formatar data para YYYY-MM-DD
    const dataVendaFormatada = venda.dataVenda.split('T')[0];
    
    // Preparar itens
    const itensForm = venda.itens.map(item => ({
      produtoId: item.produto.id,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
    }));
    
    // Preparar busca de produtos
    const produtoSearchArray = venda.itens.map(item => item.produto.nome);
    setProdutoSearch(produtoSearchArray);
    setOpenSuggest(new Array(venda.itens.length).fill(false));
    
    // Preparar pagamentos
    const pagamentosForm = venda.pagamentos.map(pag => ({
      formaPagamento: pag.formaPagamento,
      valor: pag.valor,
      dataVencimento: pag.dataVencimento.split('T')[0],
      dataPagamento: pag.dataPagamento ? pag.dataPagamento.split('T')[0] : undefined,
      quantidadeParcelas: 1, // Por enquanto, assumir 1 parcela (pode ser melhorado)
      observacao: '',
    }));
    
    // Resetar e preencher formulário
    vendaForm.reset({
      nomeCliente: venda.nomeCliente,
      rua: (venda as any).rua || '',
      bairro: (venda as any).bairro || '',
      cidade: (venda as any).cidade || '',
      numero: (venda as any).numero || '',
      observacao: (venda as any).observacao || '',
      desconto: (venda as any).desconto || 0,
      dataVenda: dataVendaFormatada,
      vendedorId: venda.vendedor.id,
      itens: itensForm,
      pagamentos: pagamentosForm.length > 0 ? pagamentosForm : [{ formaPagamento: 'PIX', valor: '', dataVencimento: getTodayLocalDate(), quantidadeParcelas: 1 }],
    });
  };

  // Carregar estoque quando estiver editando e os fields forem criados
  useEffect(() => {
    if (editingVendaId && fields.length > 0 && produtoSearch.length > 0 && produtos.length > 0) {
      const estoquePromises = fields.map(async (field, index) => {
        const produtoId = vendaForm.getValues(`itens.${index}.produtoId` as const);
        if (produtoId) {
          const produto = produtos.find(p => p.id === produtoId);
          if (produto?.temEstoque && !estoquePorItem[field.id]) {
            try {
              const estoqueResponse = await api.get(`/compra/estoque/produto/${produtoId}`);
              setEstoquePorItem(prev => ({ ...prev, [field.id]: estoqueResponse.data.quantidadeTotal || 0 }));
            } catch (error) {
              console.error('Erro ao carregar estoque:', error);
            }
          }
        }
      });
      Promise.all(estoquePromises);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingVendaId, fields.length, produtoSearch.length, produtos.length]);

  const handleUpdateVenda = async (data: VendaForm) => {
    if (!editingVendaId) return;
    
    try {
      setIsLoading(true);
      if (!data.vendedorId) { toast.error('Selecione o vendedor'); return; }
      if (!data.itens.length) { toast.error('Informe ao menos um item'); return; }
      
      const valorTotalItens = data.itens.reduce((total, item) => {
        return total + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
      }, 0);
      const desconto = Number(data.desconto || 0);
      const valorTotal = Math.max(0, valorTotalItens - desconto);
      const valorTotalPagamentos = data.pagamentos.reduce((total, p) => total + (Number(p.valor) || 0), 0);
      
      if (Math.abs(valorTotalPagamentos - valorTotal) > 0.01) {
        toast.error(`O valor total dos pagamentos (R$ ${valorTotalPagamentos.toFixed(2)}) deve ser igual ao valor total da venda (R$ ${valorTotal.toFixed(2)})`);
        setIsLoading(false);
        return;
      }

      const itensValidados = data.itens.map(i => {
        if (!i.produtoId) {
          throw new Error('Produto não selecionado em um dos itens');
        }
        if (!i.quantidade || Number(i.quantidade) <= 0) {
          throw new Error('Quantidade inválida em um dos itens');
        }
        if (!i.valorUnitario || Number(i.valorUnitario) <= 0) {
          throw new Error('Valor unitário inválido em um dos itens');
        }
        return { 
          produtoId: i.produtoId, 
          quantidade: Number(i.quantidade), 
          valorUnitario: Number(i.valorUnitario) 
        };
      });

      const pagamentosValidados = data.pagamentos.map((p, idx) => {
        if (!p.formaPagamento) {
          throw new Error('Forma de pagamento não selecionada');
        }
        const valorPagamento = idx === 0 ? valorTotal : (Number(p.valor) || 0);
        if (valorPagamento <= 0) {
          throw new Error('Valor do pagamento inválido');
        }
        if (!p.dataVencimento) {
          throw new Error('Data de vencimento não informada');
        }
        return { 
          ...p, 
          valor: valorPagamento, 
          quantidadeParcelas: Number(p.quantidadeParcelas) || 1,
          dataVencimento: p.dataVencimento,
          dataPagamento: p.dataPagamento || undefined,
          observacao: p.observacao || undefined
        };
      });

      const usuarioId = (session as any)?.user?.id;
      if (!usuarioId) {
        throw new Error('Usuário não autenticado');
      }

      const payload = {
        nomeCliente: data.nomeCliente,
        rua: data.rua || undefined,
        bairro: data.bairro || undefined,
        cidade: data.cidade || undefined,
        numero: data.numero || undefined,
        observacao: data.observacao || undefined,
        desconto: desconto,
        dataVenda: data.dataVenda,
        vendedorId: data.vendedorId,
        usuarioId: usuarioId,
        itens: itensValidados,
        pagamentos: pagamentosValidados,
      };

      await api.put(`/venda/${editingVendaId}`, payload);
      toast.success('Venda atualizada com sucesso!');
      setShowForm(false);
      setEditingVendaId(null);
      vendaForm.reset();
      setProdutoSearch([]);
      setOpenSuggest([]);
      setEstoquePorItem({});
      router.push('/vendas');
      loadVendas();
    } catch (e: any) {
      console.error('Erro ao atualizar venda:', e);
      let errorMessage = 'Erro ao atualizar venda';
      if (e.response?.data) {
        if (e.response.data.message) {
          errorMessage = e.response.data.message;
        } else if (e.response.data.error) {
          errorMessage = e.response.data.error;
        } else if (typeof e.response.data === 'string') {
          errorMessage = e.response.data;
        }
      } else if (e.message) {
        errorMessage = e.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVenda = async (data: VendaForm) => {
    try {
      setIsLoading(true);
      // validações simples
      if (!data.vendedorId) { toast.error('Selecione o vendedor'); return; }
      if (!data.itens.length) { toast.error('Informe ao menos um item'); return; }
      // normalização
      // Calcular valor total dos itens e desconto
      const valorTotalItens = data.itens.reduce((total, item) => {
        return total + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
      }, 0);
      const desconto = Number(data.desconto || 0);
      const valorTotal = Math.max(0, valorTotalItens - desconto);
      const valorTotalPagamentos = data.pagamentos.reduce((total, p) => total + (Number(p.valor) || 0), 0);
      
      // Validar se o valor dos pagamentos é igual ao valor total (após desconto)
      if (Math.abs(valorTotalPagamentos - valorTotal) > 0.01) {
        toast.error(`O valor total dos pagamentos (R$ ${valorTotalPagamentos.toFixed(2)}) deve ser igual ao valor total da venda (R$ ${valorTotal.toFixed(2)})`);
        setIsLoading(false);
        return;
      }

      // Validar todos os itens antes de enviar
      const itensValidados = data.itens.map(i => {
        if (!i.produtoId) {
          throw new Error('Produto não selecionado em um dos itens');
        }
        if (!i.quantidade || Number(i.quantidade) <= 0) {
          throw new Error('Quantidade inválida em um dos itens');
        }
        if (!i.valorUnitario || Number(i.valorUnitario) <= 0) {
          throw new Error('Valor unitário inválido em um dos itens');
        }
        return { 
          produtoId: i.produtoId, 
          quantidade: Number(i.quantidade), 
          valorUnitario: Number(i.valorUnitario) 
        };
      });

      // Validar todos os pagamentos antes de enviar
      const pagamentosValidados = data.pagamentos.map((p, idx) => {
        if (!p.formaPagamento) {
          throw new Error('Forma de pagamento não selecionada');
        }
        // Se for o primeiro pagamento, usar o valor total calculado
        const valorPagamento = idx === 0 ? valorTotal : (Number(p.valor) || 0);
        if (valorPagamento <= 0) {
          throw new Error('Valor do pagamento inválido');
        }
        if (!p.dataVencimento) {
          throw new Error('Data de vencimento não informada');
        }
        return { 
          ...p, 
          valor: valorPagamento, 
          quantidadeParcelas: Number(p.quantidadeParcelas) || 1,
          dataVencimento: p.dataVencimento, // Manter como string, o backend converte
          dataPagamento: p.dataPagamento || undefined,
          observacao: p.observacao || undefined
        };
      });

      const usuarioId = (session as any)?.user?.id;
      if (!usuarioId) {
        throw new Error('Usuário não autenticado');
      }

      const payload = {
        nomeCliente: data.nomeCliente,
        rua: data.rua || undefined,
        bairro: data.bairro || undefined,
        cidade: data.cidade || undefined,
        numero: data.numero || undefined,
        observacao: data.observacao || undefined,
        desconto: desconto,
        dataVenda: data.dataVenda,
        vendedorId: data.vendedorId,
        usuarioId: usuarioId,
        itens: itensValidados,
        pagamentos: pagamentosValidados,
      };

      await api.post('/venda', payload);
      toast.success('Venda registrada com sucesso!');
      setShowForm(false); 
      vendaForm.reset(); 
      setProdutoSearch([]); 
      setOpenSuggest([]); 
      setEstoquePorItem({}); 
      loadVendas();
    } catch (e: any) { 
      console.error('Erro ao registrar venda:', e);
      console.error('Response:', e.response);
      console.error('Response data:', e.response?.data);
      console.error('Response status:', e.response?.status);
      
      // Tentar obter mensagem de erro mais detalhada
      let errorMessage = 'Erro ao registrar venda';
      if (e.response?.data) {
        if (e.response.data.message) {
          errorMessage = e.response.data.message;
        } else if (e.response.data.error) {
          errorMessage = e.response.data.error;
        } else if (typeof e.response.data === 'string') {
          errorMessage = e.response.data;
        } else if (e.response.data.details) {
          errorMessage = e.response.data.details;
        }
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      toast.error(errorMessage);
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Vendas</h2>
          <p className="text-gray-600 mt-2">Registre e gerencie as vendas.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setShowForm(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
            <Plus className="h-4 w-4" /><span>Nova Venda</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{editingVendaId ? 'Editar Venda' : 'Cadastrar Venda'}</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-800" htmlFor="numero-venda">Número da venda</label>
              <input id="numero-venda" {...vendaForm.register('numero')} className="px-3 py-2 border rounded-lg w-48" />
            </div>
          </div>
          <form onSubmit={vendaForm.handleSubmit(editingVendaId ? handleUpdateVenda : handleCreateVenda)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente *</label>
                <input {...vendaForm.register('nomeCliente', { required: 'Obrigatório' })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor *</label>
                <select {...vendaForm.register('vendedorId', { required: 'Obrigatório' })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Selecione</option>
                  {vendedores.map(v => (<option key={v.id} value={v.id}>{v.nome}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
                <input {...vendaForm.register('rua')} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input {...vendaForm.register('bairro')} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input {...vendaForm.register('cidade')} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda *</label>
                <input type="date" {...vendaForm.register('dataVenda', { required: 'Obrigatório' })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
              <textarea {...vendaForm.register('observacao')} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Observações gerais da venda"></textarea>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700">Produtos *</label>
                <button type="button" onClick={() => {
                  // Adicionar item vazio no início dos arrays de busca
                  setProdutoSearch(['', ...produtoSearch]);
                  setOpenSuggest([false, ...openSuggest]);
                  // Adicionar novo item no início da lista
                  prepend({ produtoId: '', quantidade: 1, valorUnitario: '' });
                }} className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700">
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Produto</span>
                </button>
              </div>
              <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
                    <div className="relative">
                      <input
                        value={produtoSearch[index] ?? ''}
                        onChange={(e) => { const val = e.target.value; const a=[...produtoSearch]; a[index]=val; setProdutoSearch(a); const o=[...openSuggest]; o[index]=true; setOpenSuggest(o); setEstoquePorItem(prev => ({ ...prev, [field.id]: null })); }}
                        onFocus={() => { const o=[...openSuggest]; o[index]=true; setOpenSuggest(o); }}
                        placeholder="Digite para buscar produto"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {openSuggest[index] && (
                        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto bg-white border border-gray-200 rounded-lg shadow">
                          {produtos.filter(p=>{const q=(produtoSearch[index]||'').toLowerCase().trim(); if(!q) return true; return p.nome.toLowerCase().includes(q) || (p.descricao||'').toLowerCase().includes(q) || (p.marca||'').toLowerCase().includes(q);}).slice(0,12).map(p => (
                            <button key={p.id} type="button" onClick={async ()=>{ 
                              vendaForm.setValue(`itens.${index}.produtoId` as const, p.id, { shouldValidate: true }); 
                              // Formatar valor com 2 casas decimais
                              const valorFormatado = Number(p.valor).toFixed(2);
                              vendaForm.setValue(`itens.${index}.valorUnitario` as const, Number(valorFormatado), { shouldValidate: true }); 
                              const a=[...produtoSearch]; a[index]=p.nome; setProdutoSearch(a); 
                              const o=[...openSuggest]; o[index]=false; setOpenSuggest(o);
                              
                              // Buscar quantidade em estoque se o produto tiver controle de estoque
                              if (p.temEstoque) {
                                try {
                                  const estoqueResponse = await api.get(`/compra/estoque/produto/${p.id}`);
                                  setEstoquePorItem(prev => ({ ...prev, [field.id]: estoqueResponse.data.quantidadeTotal || 0 }));
                                } catch (error) {
                                  console.error('Erro ao carregar estoque:', error);
                                  setEstoquePorItem(prev => ({ ...prev, [field.id]: 0 }));
                                }
                              } else {
                                setEstoquePorItem(prev => ({ ...prev, [field.id]: null }));
                              }
                            }} className="w-full text-left px-3 py-2 hover:bg-indigo-50 focus:bg-indigo-50">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-800 truncate mr-2">{p.nome}</span>
                                <span className="text-xs font-medium text-indigo-600">{formatCurrency(p.valor)}</span>
                              </div>
                              {p.descricao && <div className="text-xs text-gray-500 truncate">{p.descricao}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input type="hidden" {...vendaForm.register(`itens.${index}.produtoId` as const, { required: true })} />
                    {estoquePorItem[field.id] !== null && estoquePorItem[field.id] !== undefined && (
                      <div className="mt-1 text-xs">
                        <span className="text-gray-600">Estoque disponível: </span>
                        <span className={`font-semibold ${estoquePorItem[field.id]! > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {estoquePorItem[field.id] ?? 0} unidades
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
                    <input type="number" min="1" {...vendaForm.register(`itens.${index}.quantidade` as const, { required: true, valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor Unitário *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      {...vendaForm.register(`itens.${index}.valorUnitario` as const, { 
                        required: true, 
                        valueAsNumber: true,
                        onBlur: (e) => {
                          const value = e.target.value;
                          if (value) {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              vendaForm.setValue(`itens.${index}.valorUnitario` as const, Number(numValue.toFixed(2)), { shouldValidate: true });
                            }
                          }
                        }
                      })} 
                      className="w-full px-3 py-2 border rounded-lg" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor Total</label>
                    <input 
                      type="text"
                      readOnly
                      value={formatCurrency((Number(vendaForm.watch(`itens.${index}.quantidade`) || 0) * Number(vendaForm.watch(`itens.${index}.valorUnitario`) || 0)))}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed" 
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-end">
                    {fields.length > 1 && <button type="button" onClick={()=>{
                      // Remover item dos arrays de busca
                      const newProdutoSearch = [...produtoSearch];
                      const newOpenSuggest = [...openSuggest];
                      newProdutoSearch.splice(index, 1);
                      newOpenSuggest.splice(index, 1);
                      setProdutoSearch(newProdutoSearch);
                      setOpenSuggest(newOpenSuggest);
                      // Remover estoque do item usando field.id
                      setEstoquePorItem(prev => {
                        const newEstoque = { ...prev };
                        delete newEstoque[field.id];
                        return newEstoque;
                      });
                      // Remover item do formulário
                      remove(index);
                    }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remover item"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700">Formas de Pagamento</label>
                <button type="button" onClick={() => { appendPag({ formaPagamento: 'PIX', valor: '', dataVencimento: getTodayLocalDate(), quantidadeParcelas: 1 }); }} className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700">
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Pagamento</span>
                </button>
              </div>
              <div className="space-y-3">
                {pagFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Forma *</label>
                      <select {...vendaForm.register(`pagamentos.${index}.formaPagamento` as const, { required: true })} className="w-full px-3 py-2 border rounded-lg">
                        <option value="PIX">PIX</option>
                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                        <option value="ESPECIE">Espécie</option>
                        <option value="BOLETO">Boleto</option>
                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                        <option value="TRANSFERENCIA">Transferência</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        {...vendaForm.register(`pagamentos.${index}.valor` as const, { 
                          required: true, 
                          valueAsNumber: true,
                          onBlur: (e) => {
                            const value = e.target.value;
                            if (value) {
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue)) {
                                vendaForm.setValue(`pagamentos.${index}.valor` as const, Number(numValue.toFixed(2)), { shouldValidate: true });
                              }
                            }
                          }
                        })} 
                        className="w-full px-3 py-2 border rounded-lg" 
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Data Vencimento *</label>
                      <input type="date" {...vendaForm.register(`pagamentos.${index}.dataVencimento` as const, { required: true })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Qtde Parcelas *</label>
                      <input type="number" min="1" {...vendaForm.register(`pagamentos.${index}.quantidadeParcelas` as const, { required: true, valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      {pagFields.length > 1 && <button type="button" onClick={()=>removePag(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remover"><Trash2 className="h-4 w-4" /></button>}
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
                  {...vendaForm.register('desconto', { valueAsNumber: true })}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Resumo dos Valores */}
            {(() => {
              const valorTotalItens = vendaForm.watch('itens').reduce((total, item) => {
                return total + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
              }, 0);
              const desconto = Number(vendaForm.watch('desconto') || 0);
              const valorTotal = Math.max(0, valorTotalItens - desconto);
              const valorTotalPagamentos = vendaForm.watch('pagamentos').reduce((total, p) => total + (Number(p.valor) || 0), 0);
              return (
                <div className="flex justify-end space-x-4">
                  <div className="bg-gray-50 px-6 py-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Valor Total dos Itens</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(valorTotalItens)}
                    </p>
                    {desconto > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Desconto: -{formatCurrency(desconto)}
                      </p>
                    )}
                  </div>
                  <div className={`px-6 py-4 rounded-lg ${
                    Math.abs(valorTotalPagamentos - valorTotal) <= 0.01 
                      ? 'bg-green-50' 
                      : 'bg-red-50'
                  }`}>
                    <p className="text-sm text-gray-600 mb-1">Valor Total da Venda</p>
                    <p className={`text-xl font-bold ${
                      Math.abs(valorTotalPagamentos - valorTotal) <= 0.01 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(valorTotal)}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Botão para ver parcelas */}
            {vendaForm.watch('pagamentos').length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowParcelasModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <List className="h-4 w-4" />
                  <span>Ver Parcelas</span>
                </button>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button type="button" onClick={()=>{ 
                setShowForm(false); 
                setEditingVendaId(null);
                vendaForm.reset(); 
                setProdutoSearch([]); 
                setOpenSuggest([]); 
                setEstoquePorItem({});
                router.push('/vendas');
              }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button 
                type="submit" 
                disabled={isLoading || !isFormValid} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (editingVendaId ? 'Atualizando...' : 'Salvando...') : (editingVendaId ? 'Atualizar' : 'Salvar')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Parcelas */}
      {showParcelasModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Parcelas da Venda</h3>
                <p className="text-sm text-gray-500 mt-1">Visualize o cronograma de pagamentos</p>
              </div>
              <button
                onClick={() => setShowParcelasModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-5">
                {vendaForm.watch('pagamentos').map((pagamento, pagIndex) => {
                  const valorParcela = Number(pagamento.valor) / Number(pagamento.quantidadeParcelas || 1);
                  const quantidadeParcelas = Number(pagamento.quantidadeParcelas || 1);
                  
                  const parcelas = [];
                  for (let i = 0; i < quantidadeParcelas; i++) {
                    // Criar data diretamente a partir do string YYYY-MM-DD
                    const dataStr = pagamento.dataVencimento; // ex: "2025-11-25"
                    const [ano, mes, dia] = dataStr.split('-').map(Number);
                    
                    // Adicionar i meses à data base
                    let novoMes = mes - 1 + i; // mes - 1 porque JS conta de 0-11
                    let novoAno = ano;
                    
                    // Ajustar ano se passar de 12 meses
                    while (novoMes > 11) {
                      novoMes -= 12;
                      novoAno += 1;
                    }
                    
                    // Verificar último dia do mês e ajustar se necessário
                    const ultimoDia = new Date(novoAno, novoMes + 1, 0).getDate();
                    const diaFinal = Math.min(dia, ultimoDia);
                    
                    // Criar data final no timezone local (sem conversão UTC)
                    const dataParcela = new Date(novoAno, novoMes, diaFinal, 12, 0, 0, 0); // Meio-dia local para evitar problemas de timezone
                    
                    // Formatação manual para garantir que use os valores corretos
                    const dataFormatada = `${String(diaFinal).padStart(2, '0')}/${String(novoMes + 1).padStart(2, '0')}/${novoAno}`;
                    
                    parcelas.push({
                      numero: i + 1,
                      valor: valorParcela,
                      dataVencimento: dataParcela,
                      dataFormatada: dataFormatada,
                      formaPagamento: pagamento.formaPagamento,
                    });
                  }
                  return (
                    <div key={pagIndex} className="border rounded-lg p-4 bg-white">
                      <h4 className="font-medium text-gray-900 mb-3">
                        {pagamento.formaPagamento} - {quantidadeParcelas}x parcelas de {formatCurrency(valorParcela)}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcela</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Vencimento</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {parcelas.map((parcela) => (
                              <tr key={parcela.numero} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {parcela.numero}/{quantidadeParcelas}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {parcela.dataFormatada}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCurrency(parcela.valor)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowParcelasModal(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {!showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
              <input
                type="text"
                value={filters.nomeCliente}
                onChange={(e) => setFilters({ ...filters, nomeCliente: e.target.value })}
                placeholder="Nome do cliente"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Número da Venda</label>
              <input
                type="text"
                value={filters.numeroVenda}
                onChange={(e) => setFilters({ ...filters, numeroVenda: e.target.value })}
                placeholder="Digite o número da venda"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
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
                  nomeCliente: '',
                  numeroVenda: '',
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
      )}

      {/* Lista */}
      {!showForm && (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lista de Vendas ({total})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
              ) : vendas.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma venda encontrada.</td></tr>
              ) : vendas.map(venda => (
                <tr key={venda.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm text-gray-900"><Calendar className="h-4 w-4 text-gray-400 mr-2" />{formatDate(venda.dataVenda)}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm text-gray-900"><User className="h-4 w-4 text-gray-400 mr-2" />{venda.nomeCliente}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{venda.itens?.length || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(venda.valorTotal)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button onClick={()=>router.push(`/vendas/${venda.id}`)} className="text-blue-600 hover:text-blue-900" title="Detalhar"><Eye className="h-4 w-4" /></button>
                      <button onClick={()=>router.push(`/vendas?edit=${venda.id}`)} className="text-indigo-600 hover:text-indigo-900" title="Editar"><Edit className="h-4 w-4" /></button>
                      <button className="text-red-600 hover:text-red-900" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Por página:</span>
            <select value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}} className="border border-gray-300 rounded px-2 py-1 text-sm">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</div>
          <div className="inline-flex items-center gap-2">
            <button onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={page<=1} className="inline-flex items-center gap-1 px-3 py-2 rounded-full border text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /><span>Anterior</span></button>
            <button onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/pageSize)} className="inline-flex items-center gap-1 px-3 py-2 rounded-full border text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"><span>Próxima</span><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}


