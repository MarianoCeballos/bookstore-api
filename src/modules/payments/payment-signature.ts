import { createHmac, timingSafeEqual } from 'node:crypto';

export function isValidMercadoPagoSignature(
  secret: string,
  signature: string,
  requestId: string,
  dataId: string,
): boolean {
  const values = new Map(
    signature.split(',').map((entry) => {
      const [key, value] = entry.trim().split('=');
      return [key ?? '', value ?? ''];
    }),
  );
  const timestamp = values.get('ts');
  const providedHash = values.get('v1');
  if (!timestamp || !providedHash) {
    return false;
  }
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = createHmac('sha256', secret).update(manifest).digest();
  const receivedHash = Buffer.from(providedHash, 'hex');
  return (
    receivedHash.length === expectedHash.length &&
    timingSafeEqual(receivedHash, expectedHash)
  );
}
