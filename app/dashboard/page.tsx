'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Package,
  AlertTriangle,
  Trophy,
  BarChart3,
  Calendar
} from 'lucide-react';

interface DashboardStats {
  vendasDia: { quantidade: number; valor: number };
  vendasSemana: { quantidade: number; valor: number };
  vendasMes: { quantidade: number; valor: number };
  receitaMes: number;
  produtosEstoqueBaixo: Array<{ id: string; nome: string; quantidadeEstoque: number; quantidadeMinimaEstoque: number }>;
  rankingVendedoresValor: Array<{ funcionarioId: string; funcionarioNome: string; valorTotal: number }>;
  rankingVendedoresQuantidade: Array<{ funcionarioId: string; funcionarioNome: string; quantidade: number }>;
  rankingProdutos: Array<{ produtoId: string; produtoNome: string; quantidade: number }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get('/venda/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      loadStats();
    }
  }, [session]);

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

  if (!session || !stats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Visão geral das vendas e estatísticas do sistema.</p>
      </div>

      {/* Vendas por Período */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Vendas do Dia</p>
              <p className="text-2xl font-bold text-gray-900">{stats.vendasDia.quantidade}</p>
              <p className="text-sm text-green-600 font-medium">{formatCurrency(stats.vendasDia.valor)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Vendas da Semana</p>
              <p className="text-2xl font-bold text-gray-900">{stats.vendasSemana.quantidade}</p>
              <p className="text-sm text-green-600 font-medium">{formatCurrency(stats.vendasSemana.valor)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Vendas do Mês</p>
              <p className="text-2xl font-bold text-gray-900">{stats.vendasMes.quantidade}</p>
              <p className="text-sm text-green-600 font-medium">{formatCurrency(stats.vendasMes.valor)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Receita do Mês</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.receitaMes)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Produtos com Estoque Baixo */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Produtos com Estoque Baixo</h3>
            </div>
          </div>
          <div className="p-6">
            {stats.produtosEstoqueBaixo.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum produto com estoque baixo</p>
            ) : (
              <div className="space-y-3">
                {stats.produtosEstoqueBaixo.map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <p className="font-medium text-gray-900">{produto.nome}</p>
                      <p className="text-sm text-gray-600">
                        Estoque: {produto.quantidadeEstoque} / Mínimo: {produto.quantidadeMinimaEstoque}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      produto.quantidadeEstoque === 0 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {produto.quantidadeEstoque === 0 ? 'Esgotado' : 'Abaixo do Mínimo'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ranking de Vendedores por Valor */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Ranking de Vendedores (Valor)</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Mês atual</p>
          </div>
          <div className="p-6">
            {stats.rankingVendedoresValor.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma venda no mês</p>
            ) : (
              <div className="space-y-3">
                {stats.rankingVendedoresValor.map((vendedor, index) => (
                  <div key={vendedor.funcionarioId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{vendedor.funcionarioNome}</p>
                        <p className="text-sm text-green-600 font-semibold">{formatCurrency(vendedor.valorTotal)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ranking de Vendedores por Quantidade */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Ranking de Vendedores (Quantidade)</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Mês atual</p>
          </div>
          <div className="p-6">
            {stats.rankingVendedoresQuantidade.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma venda no mês</p>
            ) : (
              <div className="space-y-3">
                {stats.rankingVendedoresQuantidade.map((vendedor, index) => (
                  <div key={vendedor.funcionarioId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{vendedor.funcionarioNome}</p>
                        <p className="text-sm text-blue-600 font-semibold">{vendedor.quantidade} vendas</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ranking de Produtos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Produtos Mais Vendidos</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Mês atual</p>
          </div>
          <div className="p-6">
            {stats.rankingProdutos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma venda no mês</p>
            ) : (
              <div className="space-y-3">
                {stats.rankingProdutos.map((produto, index) => (
                  <div key={produto.produtoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{produto.produtoNome}</p>
                        <p className="text-sm text-purple-600 font-semibold">{produto.quantidade} unidades</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
