export class TrustKernelError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'TrustKernelError';
    this.code = code;
    if (details !== null) this.details = details;
  }
}

export function assertKernel(condition, code, message, details = null) {
  if (!condition) throw new TrustKernelError(code, message, details);
}
