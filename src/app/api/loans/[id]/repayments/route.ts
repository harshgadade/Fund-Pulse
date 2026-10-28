import { NextRequest, NextResponse } from 'next/server';
import { getLoanRepayments, recordLoanRepayment, deleteLoanRepayment } from '@/lib/fund-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repayments = await getLoanRepayments(id);
    return NextResponse.json({ success: true, data: repayments });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.payment_date) {
      return NextResponse.json(
        { success: false, error: 'Payment date is required' },
        { status: 400 }
      );
    }
    const repayment = await recordLoanRepayment({
      ...body,
      loan_id: id,
    });
    return NextResponse.json({ success: true, data: repayment });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const { searchParams } = new URL(req.url);
    const repaymentId = searchParams.get('repaymentId');
    if (!repaymentId) {
      return NextResponse.json(
        { success: false, error: 'repaymentId query parameter is required' },
        { status: 400 }
      );
    }
    const result = await deleteLoanRepayment(repaymentId);
    return NextResponse.json({ success: true, data: result, message: 'Repayment deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
