import { createHmac } from 'node:crypto';
import { isValidMercadoPagoSignature } from 'src/modules/payments/payment-signature';

describe('isValidMercadoPagoSignature', () => {
  const secret = 'webhook-secret';
  const paymentId = '987654321';
  const requestId = 'request-123';
  const timestamp = '1234567890';
  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
  const signature = `ts=${timestamp},v1=${createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')}`;

  it('accepts a signature for the matching notification', () => {
    expect(
      isValidMercadoPagoSignature(secret, signature, requestId, paymentId),
    ).toBe(true);
  });

  it('rejects a signature with a modified payment ID', () => {
    expect(
      isValidMercadoPagoSignature(secret, signature, requestId, '123456789'),
    ).toBe(false);
  });

  it('rejects malformed signatures', () => {
    expect(
      isValidMercadoPagoSignature(secret, 'ts=1,v1=bad', requestId, paymentId),
    ).toBe(false);
  });
});
