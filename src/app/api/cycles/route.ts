import { NextRequest, NextResponse } from 'next/server';
import { getAllCycles, createCycle, setActiveCycle } from '@/lib/fund-service';

export async function GET() {
  try {
    const cycles = await getAllCycles();
    return NextResponse.json({ success: true, data: cycles });
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
    if (!body.name || !body.start_year || !body.monthly_amount) {
      return NextResponse.json(
        { success: false, error: 'Name, start_year, and monthly_amount are required' },
        { status: 400 }
      );
    }
    const cycle = await createCycle(body);
    return NextResponse.json({ success: true, data: cycle });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Cycle id is required' },
        { status: 400 }
      );
    }
    await setActiveCycle(body.id);
    return NextResponse.json({ success: true, message: 'Active cycle updated' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
