
/**
 * Data Storage Network Refence.
 */
export interface DSN {
    protocol: ProtocolDSN;  // LOCAL |
    dataId: string;         // e.g http://EXTERNALHOST.com/img.jpg
    encoding: string;       // BASE64
    data: string;
}


/**
 * Content Refence.
 */
export interface ContentReference {
    hash: string;
    data: DSN[];            // multiple DSN reference may point to a single piece of content.
    featured: boolean;      // featured image
}

/**
 * Protocols supported by the protocol.
 */
export enum ProtocolDSN {
    FILE = 'FILE',
    REQUEST = 'REQUEST',
    SMSG = 'SMSG',
    URL = 'URL',
    IPFS = 'IPFS'
}
