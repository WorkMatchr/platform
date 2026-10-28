import { checkServerIdentity, type TLSSocket } from 'node:tls'

// Neon terminates client TLS at its proxy. pg_stat_ssl describes the backend
// hop, not this socket. Never infer secure transport from that SQL flag or URL.
export function verifiedDatabaseClientTls(client: unknown, hostname: string) {
  try {
    const socket = (client as { connection: { stream: TLSSocket } }).connection.stream
    const protocol = socket.getProtocol()
    if (socket.encrypted !== true || socket.authorized !== true
      || !['TLSv1.2', 'TLSv1.3'].includes(protocol ?? '')
      || checkServerIdentity(hostname, socket.getPeerCertificate())) throw new Error()
    return protocol!
  } catch { throw new Error('DATABASE_CLIENT_TLS_UNVERIFIED') }
}
