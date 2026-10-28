import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, createExpense, deleteExpense } from '@/lib/fund-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('cycle_id') || undefined;
    const expenses = await getExpenses(cycleId);
    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.category || !body.amount || !body.date || !body.description) {
      return NextResponse.json(
        { success: false, error: 'Category, amount, date, and description are required' },
        { status: 400 }
      );
    }
    const item = await createExpense(body);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expense id is required' },
        { status: 400 }
      );
    }
    await deleteExpense(id);
    return NextResponse.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
