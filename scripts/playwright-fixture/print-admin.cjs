const endpoint = 'https://admin-print.fixture.invalid/api/tickets/paid-print';
const key = 'print-admin-fixture';
if (
  process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1' ||
  process.env.ADMIN_API_KEY !== key ||
  !/^http:\/\/localhost:\d+$/.test(process.env.PLAYWRIGHT_BASE_URL ?? '')
) {
  throw new Error('Disposable Playwright print fixture required');
}

const send = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input instanceof Request ? input.url : input) !== endpoint) return send(input, init);

  const request = new Request(input, init);
  if (request.method !== 'POST' || request.headers.get('x-api-key') !== key) {
    return Response.json({ error: 'Invalid fixture print request' }, { status: 403 });
  }
  const { category, printFormat, shippingAddress, orderDetails } = await request.json();
  if (
    category !== 'print_request' ||
    printFormat !== 'hardcover' ||
    !shippingAddress?.addressId ||
    orderDetails?.fulfillmentVersion !== 1 ||
    !orderDetails.printRequestId
  ) {
    return Response.json({ error: 'Invalid fixture paid order' }, { status: 400 });
  }
  const id = orderDetails.printRequestId;
  return Response.json({ id, metadata: { printRequestId: id } });
};
