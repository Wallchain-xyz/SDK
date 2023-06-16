import type { Eip1193Provider } from 'ethers';
import { WallchainApi } from './api';
import MetaSwapWrapper from './MetaSwapWrapper';
import ERC20Token from './erc20/index';
import { makeBN } from './utils';
import Permit2 from './Permit2';

export type TOptions = {
    provider: Eip1193Provider,
    keys: {
        [key: string]: string
    }
}

export type TTransaction = {
    from: string,
    to: string,
    data: string,
    value: string
}

export type TMEVFoundResponse = {
    MEVFound: true,
    cashbackAmount: string,//in usd,
    masterInput: string
}

export type TMEVNotFoundResponse = {
    MEVFound: false,
}

const chainIdToCodeMap:{ [key: number]: string } = {
    137: 'matic',
    56: 'bsc'
};

export const classes = { ERC20Token, MetaSwapWrapper };

export default class WallchainSDK {
    keys: { [key: string]: string }
    provider: Eip1193Provider;
    constructor(options: TOptions) {
        this.keys = options.keys;
        this.provider = options.provider;
    }
    public async checkForMEV(transatcion: TTransaction): Promise<TMEVFoundResponse | TMEVNotFoundResponse> {
        const chainId = await this.getChain();
        const key = this.keys[chainIdToCodeMap[chainId]];

        if (!key) {
            return { MEVFound: false }
        }

        const apiResponse = await WallchainApi.makeSwapRequst(key, chainId, transatcion);

        if ('pathFound' in apiResponse && apiResponse.pathFound) {
            return {
                MEVFound: true,
                //@ts-expect-error type inference is not working here
                cashbackAmount: apiResponse.summary.searchSummary.expectedProfit.toString(),
                masterInput: apiResponse.transactionArgs.masterInput as unknown as string
            };
        }

        return { MEVFound: false };
    }
    public async getChain() {
        const resp = await this.provider.request({ method: 'eth_chainId' });
        return makeBN(resp).toNumber();
    }
    public async supportsChain() {
        return !!chainIdToCodeMap[await await this.getChain()];
    }
    public async createNewTransaction(originalTransaction: {
        from:     string,
        to:       string,
        value:    string,
        data:     string,
        isPermit: boolean,
        amountIn: string,
        srcToken: string,
        dstToken: string,
    }, masterInput: string, witness?: Awaited<ReturnType<typeof this.signPermit>>) {
        const chainId = await this.getChain();

        //Fallback in case of native token. Actuall values will be ignored by contract
        if (!witness) witness = {
            data: {
                domain: {}, 
                types: {},
                values: {
                    spender: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                    permitted: {
                        token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                        amount: '0x0'
                    },
                    nonce: 0,
                    deadline: 0,
                }
            },
            sign: '0x',
            hash: '0x'
        }
        const mataSwapContract = new MetaSwapWrapper(this.provider, chainId);

        const newData = await mataSwapContract.generateNewData(
            originalTransaction.to,
            originalTransaction.isPermit,
            originalTransaction.data,
            masterInput,
            originalTransaction.amountIn,
            originalTransaction.srcToken,
            originalTransaction.dstToken,
            {
                permitted: {
                    token: String(witness.data.values.permitted.token),
                    amount: String(witness.data.values.permitted.amount)
                },
                nonce: String(witness.data.values.nonce),
                deadline: String(witness.data.values.deadline)
            },
            witness.sign
        );
        return {
            data: newData,
            value: originalTransaction.value,
            from: originalTransaction.from,
            to: MetaSwapWrapper.getAddress(chainId),
            gas: '0x2625A0' // 2 500 000 gas limit
        }
    }
    public async signPermit(tokenAddress: string, wallet: string, spender: string, value: string) {
        const chainId = await this.getChain();

        if (Permit2.supportsChain(chainId)) {
            const permit2 = new Permit2(this.provider, chainId);
            return permit2.sign(tokenAddress, wallet, spender, value);
        }

        return false;
    }
    static getSpenderForChain(chainId: number): string {
        return MetaSwapWrapper.getSpenderAddress(chainId);
    }
    public async getSpender ():Promise<string> {
        const chainId = await this.getChain();
        return WallchainSDK.getSpenderForChain(chainId);
    }
    public async getSpenderForAllowance ():Promise<string> {
        const chainId = await this.getChain();
        if (Permit2.supportsChain(chainId)) {
            return Permit2.getAddress(chainId);
        } else {
            return MetaSwapWrapper.getSpenderAddress(chainId);
        }
    }
    public async hasEnoughAllowance(tokenAddress: string, holder: string, amount: string): Promise<boolean> {
        if (tokenAddress.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()) return true;
        const spender = await this.getSpenderForAllowance();
        const contract = new ERC20Token(this.provider, tokenAddress);

        return await contract.hasEnoughAllowance(holder, spender, amount);
    }
    public async createAllowanceTransaction(tokenAddress: string, holder: string, amount: string) {
        const spender = await this.getSpenderForAllowance();

        const contract = new ERC20Token(this.provider, tokenAddress);
        return await contract.createApproveTransaction(holder, spender, amount);
    }
}
