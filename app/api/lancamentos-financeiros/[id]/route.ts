import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

interface ExtendedSession {
  accessToken?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const response = await fetch(`${API_BASE_URL}/lancamentos-financeiros/${id}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
      }
      throw new Error('Erro ao buscar lançamento financeiro');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro na API de lançamentos financeiros:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/lancamentos-financeiros/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao atualizar lançamento financeiro');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro na API de lançamentos financeiros:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const response = await fetch(`${API_BASE_URL}/lancamentos-financeiros/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
      }
      throw new Error('Erro ao excluir lançamento financeiro');
    }

    return NextResponse.json({ message: 'Lançamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro na API de lançamentos financeiros:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
