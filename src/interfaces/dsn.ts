/**
 * Data Storage Network Refence.
 */
export interface DSN {
    hash: string,
    data: [
        {
            protocol: ProtocolDSN, // LOCAL |
            encoding: string, // BASE64 | 
            data: string,
            id: Number
        }
    ]
}

/**
 * Protocols supported by the protocol.
 */
export enum ProtocolDSN {
    SMSG = "SMSG",
    URL = "URL",
    IPFS = "IPFS",
  }