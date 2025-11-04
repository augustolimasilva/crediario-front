'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../../../lib/axios';
import { 
  ArrowLeft, 
  Calendar,
  User,
  DollarSign,
  CreditCard,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  salario?: number;
}

interface PagamentoFuncionario {
  id: string;
  funcionario?: Funcionario;
  funcionarioId: string;
  valor: number;
  dataLancamento: string;
  dataPagamento?: string;
  dataVencimento?: string;
  formaPagamento?: string;
  observacao?: string;
  tipoLancamento: 'DEBITO' | 'CREDITO';
  usuario: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'ESPECIE', label: 'Espécie' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'CHEQUE', label: 'Cheque' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

const getFormaPagamentoLabel = (forma: string) => {
  const formaObj = FORMAS_PAGAMENTO.find(f => f.value === forma);
  return formaObj ? formaObj.label : forma;
};

export default function PagamentoFuncionarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pagamento, setPagamento] = useState<PagamentoFuncionario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const loadPagamento = async () => {
      try {
        const resolvedParams = await params;
        const response = await api.get(`/lancamentos-financeiros/${resolvedParams.id}`);
        setPagamento(response.data);
      } catch (error: any) {
        console.error('Erro ao carregar pagamento:', error);
        if (error.response?.status === 404) {
          toast.error('Pagamento não encontrado');
        } else {
          toast.error('Erro ao carregar pagamento');
        }
        router.push('/pagamentos-funcionarios');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      loadPagamento();
    }
  }, [session, params, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session || !pagamento) {
    return null;
  }

  const statusPagamento = pagamento.dataPagamento ? 'PAGO' : 'PENDENTE';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/pagamentos-funcionarios')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar para Pagamentos de Funcionários
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Detalhes do Pagamento</h1>
      </div>

      {/* Informações do Pagamento */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações do Pagamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Funcionário</p>
            <div className="flex items-center mt-1">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <p className="text-lg text-gray-900">{pagamento.funcionario?.nome || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Valor</p>
            <div className="flex items-center mt-1">
              <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(pagamento.valor)}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Data de Lançamento</p>
            <div className="flex items-center mt-1">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <p className="text-lg text-gray-900">{formatDate(pagamento.dataLancamento)}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Data de Vencimento</p>
            <p className="text-lg text-gray-900">{pagamento.dataVencimento ? formatDate(pagamento.dataVencimento) : '-'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Data de Pagamento</p>
            <div className="flex items-center mt-1">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <p className="text-lg text-gray-900">{pagamento.dataPagamento ? formatDate(pagamento.dataPagamento) : '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Forma de Pagamento</p>
            <div className="flex items-center mt-1">
              <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
              <p className="text-lg text-gray-900">{pagamento.formaPagamento ? getFormaPagamentoLabel(pagamento.formaPagamento) : '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <div className="flex items-center mt-1">
              {statusPagamento === 'PAGO' ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="px-2 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
                    Pago
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-yellow-500 mr-2" />
                  <span className="px-2 py-1 text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-full">
                    Pendente
                  </span>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Usuário</p>
            <p className="text-lg text-gray-900">{pagamento.usuario?.name || '-'}</p>
          </div>
        </div>

        {pagamento.observacao && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500 mb-2">Observação</p>
            <p className="text-gray-900">{pagamento.observacao}</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <p className="font-medium">Criado em:</p>
              <p>{formatDate(pagamento.createdAt)}</p>
            </div>
            {pagamento.updatedAt !== pagamento.createdAt && (
              <div>
                <p className="font-medium">Atualizado em:</p>
                <p>{formatDate(pagamento.updatedAt)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

