import { NextResponse } from 'next/server';
import { seedSampleData } from '@/lib/fund-service';

export async function POST() {
  try {
    await seedSampleData();
    return NextResponse.json({
      success: true,
      message: '19-member fund data loaded successfully for FY 2026-27!',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
