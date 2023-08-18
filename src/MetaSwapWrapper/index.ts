//import Web3 from 'web3';
import abi from './abi.json';
import { Contract } from '@ethersproject/contracts';
import { ExternalProvider, Web3Provider } from '@ethersproject/providers';
import { SignatureTransfer, PermitTransferFromData } from '@uniswap/permit2-sdk';
import { makeBN } from '../utils';

const addresses: { [key: number]: string } = {
    56: '0xD1F646ADb4876A58BFf81A511D5B247C66471343',
    137: '0x4DeF20E7DbfeAB6b2cFEB53bdcA28a6DCEd12317'
} as const;

const maticPermits: { [key: string]: string } = {
    '0x4c60051384bd2d3c01bfc845cf5f4b44bcbe9de5': '0x000000000022D473030F116dDEE9F6B43aC78BA3'
} as const;

type THexString = string | number | bigint;

export default class MetaSwapWrapper {
    tokenAddress: string;
    private contract: Contract;
    private provider: Web3Provider;
    private originator: string[] = [];
    private originShare: number = 0;
    public addresses: { [key: number]: string } = addresses;

    constructor(
        provider: ExternalProvider,
        chainId: number,
        originator: string[] = [],
        originShare: number = 0,
        overrideAddresses?: { [key: number]: string }
    ) {
        if (!this.isApplicable(chainId)) throw new Error('MetaSwapWrapper: Unsupported chain. Unsupported for now...');

        if (overrideAddresses) this.addresses = { ...this.addresses, ...overrideAddresses };

        this.tokenAddress = this.addresses[chainId];
        this.provider = new Web3Provider(provider);
        this.contract = new Contract(this.tokenAddress, abi, this.provider.getSigner());
        this.originator = originator || [];
        this.originShare = originShare || 0;
    }
    public isApplicable(chainId: number) {
        return Object.keys(this.addresses).includes(chainId.toString());
    }
    public getAddress(chainId: number) {
        return this.addresses[chainId] as string;
    }
    public getSpenderAddress(chainId: number) {
        return this.addresses[chainId] as string;
    }
    public getAccounts() {
        return this.provider.listAccounts();
    }
    public async generateNewData(
        callTarget: THexString,
        isPermit: boolean,
        targetData: THexString,
        amount: THexString,
        srcToken: THexString,
        dstToken: THexString,
        searcherSignature: THexString,
        searcherRequest: {
            from: THexString,
            to: THexString,
            gas: THexString,
            nonce: THexString,
            data: THexString,
            bid: THexString,
            userCallHash: THexString,
            maxGasPrice: THexString,
            deadline: THexString
        },
        permit: {
            permitted: { token: THexString, amount: THexString },
            nonce: THexString,
            deadline: THexString,
        },
        permit2signature: THexString
    ) {
        const approveTarget = maticPermits[callTarget as string] || callTarget;
        const method = abi.find(({ name }) => name === 'swapWithWallchain');
        if (!method || !method.inputs) throw new Error('MetaSwapWrapper: Method not found');
        
        searcherRequest.bid = makeBN(searcherRequest.bid as string).toString(10);
        searcherRequest.gas = makeBN(searcherRequest.gas as string).toString(10);
        searcherRequest.nonce = makeBN(searcherRequest.nonce as string).toString(10);
        searcherRequest.maxGasPrice = makeBN(searcherRequest.maxGasPrice as string).toString(10);

        const data = this.contract.interface.encodeFunctionData('swapWithWallchain', [{
            callTarget,
            approveTarget,
            isPermit,
            targetData,
            amount,
            srcToken,
            dstToken,
            originShare: this.originShare,
            permit,
            permit2signature,
            searcherRequest,
            searcherSignature,
            originators: this.originator
        }]);

        return data;
    }
    public async signSearcherRequest(
        wallet: string,
        searcherRequest: {
            from: THexString,
            to: THexString,
            gas: THexString,
            nonce: THexString,
            data: THexString,
            bid: THexString,
            userCallHash: THexString,
            maxGasPrice: THexString,
            deadline: THexString
        }): Promise<string> {
        const input = abi
            .find(({ name }) => name === 'swapWithWallchain')
            ?.inputs
            ?.find(({ name }) => name === 'searcherRequest') as unknown as { components: object[] }
        const types = input.components;

        const message = {
            domain: {

            },
            types: types,
            values: searcherRequest
        };

        const sign = await this.provider.send('eth_signTypedData_v4', [wallet, JSON.stringify(message)]);

        return sign;
    }
}



