import { NextRequest, NextResponse } from 'next/server';
import { getLoans, createLoan, deleteLoan } from '@/lib/fund-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('cycle_id') || undefined;
    const loans = await getLoans(cycleId);
    return NextResponse.json({ success: true, data: loans });
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
    if (!body.member_id || !body.principal_amount || !body.disbursement_date) {
      return NextResponse.json(
        { success: false, error: 'Member, principal amount, and disbursement date are required' },
        { status: 400 }
      );
    }
    const loan = await createLoan(body);
    return NextResponse.json({ success: true, data: loan });
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
    const loanId = searchParams.get('loan_id');
    if (!loanId) {
      return NextResponse.json(
        { success: false, error: 'loan_id is required' },
        { status: 400 }
      );
    }
    await deleteLoan(loanId);
    return NextResponse.json({ success: true, message: 'Loan deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
