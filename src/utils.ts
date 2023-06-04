import BN from "bn.js";
import randomBytes from 'randombytes';

export function makeBN(value: string) {
    if (value[0] === '0' && value[1] === 'x') return new BN(value.slice(2), 16);
    return new BN(value, 10);
}
export function toHex(value: InstanceType<typeof BN> | number) {
    return '0x' + value.toString(16);
}
export function randNonce (bytes: number) {
    const value = randomBytes(32);
    const bn = new BN(value.toString('hex'), 16);
    return bn.toString(10);
}
