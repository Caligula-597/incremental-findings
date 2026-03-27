import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/session';
import { getEditorialRole } from '@/lib/editor-workspace-service';

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json({ data: null }, { status: 401 });
  }

  return NextResponse.json({
    data: {
      ...user,
      editor_role: user.role === 'editor' ? getEditorialRole(user) : null
    }
  });
}
