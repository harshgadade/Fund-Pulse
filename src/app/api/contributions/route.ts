import { NextRequest, NextResponse } from 'next/server';
import { getMatrixData, updateContribution, bulkMarkPaid } from '@/lib/fund-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('cycle_id') || undefined;
    const matrix = await getMatrixData(cycleId);
    return NextResponse.json({ success: true, data: matrix });
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
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Contribution id is required' },
        { status: 400 }
      );
    }
    const updated = await updateContribution(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.cycle_id || body.month_index === undefined || !body.member_ids) {
      return NextResponse.json(
        { success: false, error: 'cycle_id, month_index, and member_ids are required' },
        { status: 400 }
      );
    }
    await bulkMarkPaid(body);
    return NextResponse.json({ success: true, message: 'Contributions updated successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
