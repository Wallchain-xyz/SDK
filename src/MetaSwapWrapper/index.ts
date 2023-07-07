//import Web3 from 'web3';
import abi from './abi.json';
import { Contract } from '@ethersproject/contracts';
import { ExternalProvider, Web3Provider } from '@ethersproject/providers';

const addresses: { [key: number]: string } = {
    56: '0xD1F646ADb4876A58BFf81A511D5B247C66471343',
    137: '0x4DeF20E7DbfeAB6b2cFEB53bdcA28a6DCEd12317'
} as const;

const maticPermits: { [key: string]: string } = {
    '0x4c60051384bd2d3c01bfc845cf5f4b44bcbe9de5': '0x000000000022D473030F116dDEE9F6B43aC78BA3'
} as const;

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
        this.contract = new Contract(this.tokenAddress, abi, this.provider);
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
        const method = abi.find(({ name }) => name === 'swapWithWallchain');
        if (!method || !method.inputs) throw new Error('MetaSwapWrapper: Method not found');

        const data = this.contract.interface.encodeFunctionData('swapWithWallchain', [
            {
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
            }
        ]);

        return data;
    }
}



