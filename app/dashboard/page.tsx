'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  MapPin, 
  Calendar,
  LogOut,
  User,
  Briefcase,
  UserCheck
} from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalSales: number;
  monthlyRevenue: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSales: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const quickActions = [
    {
      title: 'Nova Venda',
      description: 'Registrar venda',
      icon: ShoppingCart,
      color: 'bg-green-500',
      href: '/sales/new'
    },
    {
      title: 'Produtos',
      description: 'Gerenciar produtos',
      icon: Package,
      color: 'bg-purple-500',
      href: '/products'
    },
    {
      title: 'Usuários',
      description: 'Gerenciar usuários do sistema',
      icon: User,
      color: 'bg-indigo-500',
      href: '/users'
    },
    {
      title: 'Funcionários',
      description: 'Gerenciar funcionários',
      icon: UserCheck,
      color: 'bg-green-500',
      href: '/funcionarios'
    },
    {
      title: 'Cargos',
      description: 'Gerenciar cargos do sistema',
      icon: Briefcase,
      color: 'bg-purple-500',
      href: '/cargos'
    },
    {
      title: 'Relatórios',
      description: 'Ver relatórios',
      icon: TrendingUp,
      color: 'bg-orange-500',
      href: '/reports'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'sale',
      description: 'Venda realizada para João Silva',
      amount: 'R$ 250,00',
      time: '2 horas atrás'
    },
    {
      id: 2,
      type: 'sale',
      description: 'Venda realizada para Pedro Costa',
      amount: 'R$ 180,00',
      time: '6 horas atrás'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Crediário
              </h1>
              <span className="ml-2 text-sm text-gray-500">Sistema de Vendas</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                       {session.user?.image ? (
                         <img
                           src={session.user.image}
                           alt="Avatar"
                           className="h-8 w-8 rounded-full"
                         />
                       ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {session.user?.name}
                </span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Bem-vindo, {session.user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-gray-600 mt-2">
            Aqui está um resumo das suas atividades hoje.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vendas Hoje</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receita do Mês</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {stats.monthlyRevenue.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ações Rápidas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => router.push(action.href)}
                  className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    <div className={`p-3 ${action.color} rounded-lg`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900">{action.title}</h4>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Atividades Recentes
            </h3>
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-4 last:pb-0">
                    <div className="flex-shrink-0">
                      {activity.type === 'sale' ? (
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      {activity.amount && (
                        <p className="text-sm text-green-600 font-medium">
                          {activity.amount}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resumo da Semana
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+12%</div>
              <div className="text-sm text-gray-600">Crescimento de Vendas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">95%</div>
              <div className="text-sm text-gray-600">Taxa de Conclusão</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
