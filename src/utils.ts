import BN from "bn.js";
import randomBytes from "randombytes";

export function makeBN(value: string | number | BN) {
    if (value instanceof BN) return value as BN;
    if ((value as any)?._isBigNumber) return new BN((value as unknown as {_hex: string})._hex.slice(2), 16);
    if (typeof value === 'number') return new BN(value.toString());
    if (value[0] === '0' && value[1] === 'x') return new BN(value.slice(2), 16);
    return new BN(value, 10);
}

export function toHex(value: InstanceType<typeof BN> | number) {
    return '0x' + value.toString(16);
}

export function randNonce (bytes: number) {
    const value = randomBytes(bytes);
    const bn = new BN(value.toString('hex'), 16);
    return bn.toString(10);
}
