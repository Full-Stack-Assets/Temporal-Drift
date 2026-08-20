import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

import { canonicalBytes, sha256BytesHex, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';
import { detectPqCapabilities } from './capabilities.js';
import { verifyPqEvidenceEnvelope } from './evidence.js';

const RESULT_VERSION = 'pq-ml-dsa-verification-v1';

function resultArtifact(core) {
  return cloneAndFreeze({ ...core, verificationResultHash: sha256Hex(core) });
}

export function verifyMlDsaEvidence(evidence, unsignedPayload, runtimeMajor = Number(process.versions.node.split('.')[0])) {
  const evidenceReport = verifyPqEvidenceEnvelope(evidence);
  const payloadBytes = canonicalBytes(unsignedPayload);
  if (sha256BytesHex(payloadBytes) !== evidence.unsignedPayloadHash) {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'Unsigned payload bytes do not match PQ evidence payload hash');
  }

  const capabilities = detectPqCapabilities(runtimeMajor);
  const base = {
    resultVersion: RESULT_VERSION,
    algorithm: evidence.algorithm,
    evidenceHash: evidenceReport.pqEvidenceHash,
    runtimeMajor,
    disposition: 'pq-unavailable',
    cryptographicVerificationPerformed: false,
    executionAuthority: 'none',
  };

  if (capabilities.postQuantum.mlDsa !== 'supported') return resultArtifact(base);

  let valid = false;
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(evidence.publicKeySpkiBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    const context = Buffer.from(evidence.contextBase64, 'base64');
    const signature = Buffer.from(evidence.signatureBase64, 'base64');
    valid = cryptoVerify(null, payloadBytes, { key: publicKey, context }, signature);
  } catch {
    valid = false;
  }

  return resultArtifact({
    ...base,
    disposition: valid ? 'pq-verified' : 'pq-invalid',
    cryptographicVerificationPerformed: true,
  });
}
