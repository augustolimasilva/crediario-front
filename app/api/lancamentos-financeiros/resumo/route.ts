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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await fetch(`${API_BASE_URL}/lancamentos-financeiros/resumo?${queryString}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar resumo financeiro');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro na API de resumo financeiro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
