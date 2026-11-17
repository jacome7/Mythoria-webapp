import { handle, body } from '@/lib/biographer/http';
import { verifyAdmin, adminCommand } from '@/lib/biographer/admin';
export const POST = (r: Request) =>
  handle(async () => {
    const caller = await verifyAdmin(r);
    return { data: await adminCommand(await body(r), caller) };
  });
