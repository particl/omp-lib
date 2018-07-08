/**
 * Data Storage Network Refence.
 */
export interface DSN {
    protocol: ProtocolDSN, // LOCAL |
    id: string // e.g http://EXTERNALHOST.com/img.jpg
    encoding: string, // BASE64  
    data: string
}


/**
 * Content Refence.
 */
export interface ContentReference {
    hash: string,
    data: DSN[] // multiple DSN reference may point to a single piece of content.
}

/**
 * Protocols supported by the protocol.
 */
export enum ProtocolDSN {
    LOCAL = "LOCAL",
    SMSG = "SMSG",
    URL = "URL",
    IPFS = "IPFS",
  }