import { NextRequest, NextResponse } from 'next/server';
import { exportAllData, importAllData } from '@/lib/fund-service';

export async function GET() {
  try {
    const backup = await exportAllData();
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="fund_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
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
    if (!body.data) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup file structure' },
        { status: 400 }
      );
    }
    await importAllData(body);
    return NextResponse.json({ success: true, message: 'Database restored successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
