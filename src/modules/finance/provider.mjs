const fail=(status,message)=>Object.assign(new Error(message),{status});
const required=['createIntent','verifyWebhook','normalizeWebhook'];
export function createPaymentProviderAdapter(adapter){if(!adapter||!adapter.id||required.some(method=>typeof adapter[method]!=='function'))throw new TypeError('Payment adapters must provide an id, intent creation, webhook verification, and event normalization.');return Object.freeze({...adapter});}
export function createFinanceService({provider=null,recordVerifiedEvent=null}={}) {
  return {
    configured(){return Boolean(provider);},
    async createIntent({bookingId,amountMinor,currencyCode,idempotencyKey,returnUrl}){
      if(!provider)throw fail(503,'No payment provider is configured.');if(!bookingId||!Number.isSafeInteger(amountMinor)||amountMinor<1||!/^[A-Z]{3}$/.test(currencyCode)||!idempotencyKey)throw fail(422,'Provide a booking, positive integer minor-unit amount, ISO currency and idempotency key.');
      const result=await provider.createIntent({bookingId,amountMinor,currencyCode,idempotencyKey,returnUrl});if(!result||typeof result.providerIntentId!=='string'||result.status!=='pending'||result.amountMinor!==amountMinor||result.currencyCode!==currencyCode)throw fail(502,'Provider returned an invalid or non-pending payment intent.');return {provider:provider.id,providerIntentId:result.providerIntentId,status:'pending',amountMinor,currencyCode,checkoutUrl:result.checkoutUrl||null};
    },
    async acceptWebhook(rawBody,signature){
      if(!provider)throw fail(503,'No payment provider is configured.');if(!Buffer.isBuffer(rawBody)||!signature||!await provider.verifyWebhook(rawBody,signature))throw fail(401,'Payment webhook signature is invalid.');const event=await provider.normalizeWebhook(rawBody);if(!event||typeof event.eventId!=='string'||!event.eventId||!['payment_succeeded','payment_failed','refund_succeeded'].includes(event.type)||!Number.isSafeInteger(event.amountMinor)||!/^[A-Z]{3}$/.test(event.currencyCode))throw fail(422,'Provider webhook could not be normalized.');if(!recordVerifiedEvent)throw fail(503,'Verified payment event storage is not configured.');return recordVerifiedEvent({provider:provider.id,...event});
    }
  };
}
