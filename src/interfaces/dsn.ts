/**
 * Data Storage Network Refence.
 */
export interface DSN {
    hash: string,
    data: [
        {
            protocol: string, // LOCAL |
            encoding: string, // BASE64 | 
            data: string,
            id: Number
        }
    ]
}