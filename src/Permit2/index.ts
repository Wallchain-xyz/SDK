import { SignatureTransfer, PermitTransferFromData } from '@uniswap/permit2-sdk';
import BN from 'bn.js';
import { Web3Provider, ExternalProvider } from '@ethersproject/providers';
import { makeBN, randNonce } from '../utils';

const addresses: { [key: number]: string } = {
    137: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    56: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
} as const;

export default class Permit2 {
    provider: Web3Provider;
    address: string | undefined;
    chainId: number;
    constructor(provider: Web3Provider, chainId: number) {
        this.provider = provider;
        this.chainId = chainId;
        this.address = addresses[new BN(chainId, 16).toNumber()];
        if (!this.address) {
            throw new Error('[WallchainSDK] Permit2 error: unsupported chain.');
        }
    }
    static supportsChain(chainId: number) {
        return !!addresses[chainId];
    }
    static getAddress(chainId: number) {
        return addresses[chainId];
    }
    static async createInstance(externalProvider: ExternalProvider) {
        const provider = new Web3Provider(externalProvider);
        const resp = await provider.send('eth_chainId', []);

        return new Permit2(provider, makeBN(resp.result || resp).toNumber());
    }
    public async sign(tokenAddress: string, wallet: string, spender: string, value: string) {
        if (!this.address) throw new Error('Permit2 error: unsupported chain');

        const deadline = Math.floor(Date.now() / 1000) + 4200; // 70 minutes
        const nonce = randNonce(32);
        const permitData = {
            permitted: {
                token: tokenAddress,
                amount: value
            },
            spender: spender,
            nonce,
            deadline
        };

        const data = SignatureTransfer.getPermitData(permitData, this.address, this.chainId) as PermitTransferFromData;
        const hash = SignatureTransfer.hash(permitData, this.address, this.chainId);

        const EIP712Domain = [
            { name: 'name', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
        ];

        const primaryType = 'PermitTransferFrom';

        const message = {
            domain: data.domain,
            message: data.values,
            primaryType,
            types: { ...data.types, EIP712Domain }
        }

        const sign = await this.provider.send('eth_signTypedData_v4', [wallet, JSON.stringify(message)]);

        return { data, hash, sign: sign.result || sign };
    }
}
