// Public test-only Ed25519 keys. Never use these keys for real attestations.
export const TEST_KEY_NOTICE = 'public-test-key-never-use-in-production';

export const TEST_PRIVATE_KEYS = Object.freeze({
  alpha: `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIOuGUjN1ooEiy9XlOqKD4ernepvxb5zCgLJDOKmkKcwR
-----END PRIVATE KEY-----
`,
  beta: `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIAFHY38H4TVosJRdXUX/d6Ogx1acaoY1R63jrgqex+6n
-----END PRIVATE KEY-----
`,
  gamma: `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIC92ggNC+QpwSlpqvMTz4tgoGu0gVxxbrH4v+WDRHi6P
-----END PRIVATE KEY-----
`,
});

export const TEST_PUBLIC_KEYS = Object.freeze({
  alpha: `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAT/uowt818Rmzuyme4kMnUlyG8x0rnJTtn6aQKBNv1Gw=
-----END PUBLIC KEY-----
`,
  beta: `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEABkrl8XlGtPbWIRpY8AxK2cEcUcbja6UHHhLGW5a3OCI=
-----END PUBLIC KEY-----
`,
  gamma: `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAvJsmOzgkjd3FWLHF38A9TwVsbmGId2CpzRlDTjb8kM4=
-----END PUBLIC KEY-----
`,
});
