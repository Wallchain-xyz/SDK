import { ExternalProvider, Web3Provider } from '@ethersproject/providers';
import { WallchainApi, TApiRespArguments, TSwapInfo } from './api';
import MetaSwapWrapper from './MetaSwapWrapper';
import ERC20Token from './erc20/index';
import { makeBN } from './utils';
import Permit2 from './Permit2';

export type TOptions = {
    provider: ExternalProvider,
    keys: {
        [key: string]: string
    },
    overrideAddresses?: { [key: number]: string },
    overridePermitAddresses?: { [key: string]: string },
    originitor?: string[],
    originShare?: number
}

export type TTransaction = {
    from: string,
    to: string,
    data: string,
    value: string
}

export type TMEVFoundResponse = {
    MEVFound: true,
    cashbackAmount?: string,//in usd,
    searcherRequest: TApiRespArguments,
    searcherSignature: string,
    suggestedGas?: string
}

export type TMEVNotFoundResponse = {
    MEVFound: false,
}

const chainIdToCodeMap:{ [key: number]: string } = {
    137: 'matic',
    56: 'bsc'
};

export const classes = { ERC20Token, MetaSwapWrapper };

type THexString = string | number | bigint;

export default class WallchainSDK {
    keys: { [key: string]: string }
    provider: Web3Provider;
    overrideAddresses?: { [key: number]: string };
    overridePermitAddresses?: { [key: string]: string };
    originitor?: string[];
    originShare?: number;
    constructor(options: TOptions) {
        this.keys = options.keys;
        this.provider = new Web3Provider(options.provider);
        if (options.overrideAddresses) this.overrideAddresses = options.overrideAddresses;
        if (options.overridePermitAddresses) this.overridePermitAddresses = options.overridePermitAddresses;
        if (options.originitor) this.originitor = options.originitor;
        if (options.originShare) this.originShare = options.originShare;
    }
    public async checkForMEV(transatcion: TTransaction, swapInfo?: TSwapInfo): Promise<TMEVFoundResponse | TMEVNotFoundResponse> {
        const chainId = await this.getChain();
        const key = this.keys[chainIdToCodeMap[chainId]];

        if (!key) {
            return { MEVFound: false }
        }

        const apiResponse = await WallchainApi.makeSwapRequst(key, chainId, transatcion, swapInfo);

        if ('backRun' in apiResponse && !!apiResponse.backRun) {
            return {
                MEVFound: true,
                cashbackAmount: apiResponse.backRun?.expectedUsdProfit?.toString(),
                searcherRequest: apiResponse.backRun?.searcherRequest,
                searcherSignature: apiResponse.backRun?.searcherSignature,
                suggestedGas: apiResponse.backRun?.suggestedGas ? 
                    makeBN(apiResponse.backRun?.suggestedGas).toString(10) :
                    undefined
            };
        }

        return { MEVFound: false };
    }
    public async getChain() {
        const resp = await this.provider.send('eth_chainId', []);
  
        return makeBN(resp?.result || resp).toNumber();
    }
    public async supportsChain() {
        return !!chainIdToCodeMap[await await this.getChain()];
    }
    public async createNewTransaction(
        callTarget: THexString,
        isPermit: boolean,
        targetData: THexString,
        amount: THexString,
        value: THexString,
        srcToken: THexString,
        dstToken: THexString,
        searcherSignature: THexString,
        searcherRequest: {
            to: THexString,
            gas: THexString,
            nonce: THexString,
            data: THexString,
            bid: THexString,
            maxGasPrice: THexString,
            deadline: THexString,
            userCallHash: THexString
        }
    , witness?: Awaited<ReturnType<typeof this.signPermit>>) {
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
        const mataSwapContract = new MetaSwapWrapper(this.provider.provider, chainId, this.originitor, this.originShare, this.overrideAddresses);

        
        const newData = await mataSwapContract.generateNewData(
            callTarget,
            isPermit,
            targetData,
            amount,
            srcToken,
            dstToken,
            searcherSignature,
            {...searcherRequest, from: callTarget },
            //@ts-ignore
            witness.data.values,
            witness.sign
        );
        return {
            data: newData,
            to: mataSwapContract.getAddress(chainId),
            value,
            gas: '0x2625A0' // 2 500 000 gas limit
        }
    }
    public async signPermit(tokenAddress: string, wallet: string, spender: string, value: string) {
        const chainId = await this.getChain();
        const permit2 = new Permit2(this.provider, chainId, this.overridePermitAddresses);

        if (permit2.supportsChain()) {
            return permit2.sign(tokenAddress, wallet, spender, value);
        }

        return false;
    }
    public async signSearcherRequest(wallet: string, searcherRequest: {
        from: THexString,
        to: THexString,
        gas: THexString,
        nonce: THexString,
        data: THexString,
        bid: THexString,
        maxGasPrice: THexString,
        deadline: THexString,
        userCallHash: THexString
    }) {
        const chainId = await this.getChain();
        const mataSwapContract = new MetaSwapWrapper(this.provider.provider, chainId, this.originitor, this.originShare, this.overrideAddresses);
        return mataSwapContract.signSearcherRequest(wallet, searcherRequest);
    }
    public getSpenderForChain(chainId: number): string {
        const mataSwapContract = new MetaSwapWrapper(this.provider.provider, chainId, [], 0, this.overrideAddresses);
        return mataSwapContract.getSpenderAddress(chainId);
    }
    public async getSpender ():Promise<string> {
        const chainId = await this.getChain();
        return this.getSpenderForChain(chainId);
    }
    public async getSpenderForAllowance ():Promise<string> {
        const chainId = await this.getChain();
        const permit2 = new Permit2(this.provider, chainId, this.overridePermitAddresses);
        if (permit2.supportsChain()) {
            return permit2.getAddress() as string;
        } else {
            const mataSwapContract = new MetaSwapWrapper(this.provider.provider, chainId, [], 0, this.overrideAddresses);
            return mataSwapContract.getSpenderAddress(chainId);
        }
    }
    public async hasEnoughAllowance(tokenAddress: string, holder: string, amount: string): Promise<boolean> {
        if (tokenAddress.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()) return true;
        const spender = await this.getSpenderForAllowance();
        const contract = new ERC20Token(this.provider.provider, tokenAddress);

        return await contract.hasEnoughAllowance(holder, spender, amount);
    }
    public async createAllowanceTransaction(tokenAddress: string, holder: string, amount: string) {
        const spender = await this.getSpenderForAllowance();

        const contract = new ERC20Token(this.provider.provider, tokenAddress);
        return await contract.createApproveTransaction(holder, spender, amount);
    }
}
