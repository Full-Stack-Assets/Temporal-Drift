export class TrustKernelError extends Error {
  constructor(code, message, context = undefined) {
    super(message);
    this.name = 'TrustKernelError';
    this.code = code;
    if (context !== undefined) this.context = context;
    Object.freeze(this);
  }
}

export function fail(code, message, context) {
  throw new TrustKernelError(code, message, context);
}
