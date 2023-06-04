//import { ethers, Contract } from 'ethers';
import Web3 from 'web3';
import abi from './abi.json';
import { Eip1193Provider } from 'ethers';

const addresses: { [key: number]: string } = {
    56: '0x06e2b9b358471e1c82fa4f603a9cfcf56a48c477',
    137: '0x4DeF20E7DbfeAB6b2cFEB53bdcA28a6DCEd12317'
} as const;


const maticPermits: { [key: string]: string } = {
    '0x4c60051384bd2d3c01bfc845cf5f4b44bcbe9de5': '0x000000000022D473030F116dDEE9F6B43aC78BA3'
} as const;

export default class MetaSwapWrapper {
    tokenAddress: string;
    private web3: Web3;
    //@ts-ignore
    private contract: Web3.Contract;
    private provider: Eip1193Provider;
    private originator: string[] = [];
    private originShare: number = 0;


    constructor(
        provider: Eip1193Provider, 
        chainId: number,
        originator: string[] = [],
        originShare: number = 0
    ) {
        if (!MetaSwapWrapper.isApplicable(chainId)) throw new Error('MetaSwapWrapper: Unsupported chain. Unsupported for now...');

        //@ts-ignore
        this.web3 = new Web3(provider);
        this.tokenAddress = addresses[chainId];
        //@ts-ignore
        this.contract = new this.web3.eth.Contract(abi, this.tokenAddress);
        this.provider = provider;
        this.originator = originator;
        this.originShare = originShare;
    }

    static isApplicable(chainId: number) {
        return Object.keys(addresses).includes(chainId.toString());
    }
    static getAddress(chainId: number) {
        return addresses[chainId] as string;
    }
    static getSpenderAddress(chainId: number) {
        return addresses[chainId] as string;
    }
    public getAccounts() {
        return this.web3.eth.getAccounts();
    }

    public async generateNewData(
        callTarget: string,
        isPermit: boolean,
        targetData: string,
        masterInput: string,
        amount: string,
        srcToken: string,
        dstToken: string,
        permit: {
            permitted: { token: string, amount: string },
            nonce: string,
            deadline: string,
        },
        signature: string

    ) {
        const approveTarget = maticPermits[callTarget] || callTarget;
        return this.contract.methods.swapWithWallchain({
            callTarget,
            approveTarget,
            isPermit,
            targetData,
            masterInput,
            originator: this.originator,
            amount,
            srcToken,
            dstToken,
            originShare: this.originShare,
            permit,
            signature
        }).encodeABI();
    }
}



