import { NextRequest, NextResponse } from 'next/server';
import { getSettlement } from '@/lib/fund-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get('cycle_id') || undefined;
    const settlement = await getSettlement(cycleId);
    return NextResponse.json({ success: true, data: settlement });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
