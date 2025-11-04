import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ produtoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as any;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { produtoId } = await params;

    const response = await fetch(`${API_URL}/produto-historico/produto/${produtoId}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch produto historico');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching produto historico:', error);
    return NextResponse.json(
      { error: 'Failed to fetch produto historico' },
      { status: 500 }
    );
  }
}
