const encoder = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signSession(value: string): Promise<string> {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET not set')
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return `${value}.${toHex(sig)}`
}

export async function verifySession(token: string): Promise<string | null> {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return null
  const value = token.slice(0, lastDot)
  const sigHex = token.slice(lastDot + 1)
  try {
    const key = await getKey(secret)
    const valid = await crypto.subtle.verify('HMAC', key, fromHex(sigHex), encoder.encode(value))
    return valid ? value : null
  } catch {
    return null
  }
}
