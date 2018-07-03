/**
 * Data Storage Network Refence.
 */
export interface DSN {
    hash: String,
    data: [
        {
            protocol: String, // LOCAL |
            encoding: String, // BASE64 | 
            data: String,
            id: Number
        }
    ]
}