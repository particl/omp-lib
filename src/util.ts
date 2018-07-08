import { sha256 } from 'js-sha256';

export function hash(v: string): string {
    return sha256(v);
}