import abi from './abi.json';
import { Contract } from '@ethersproject/contracts';
import { ExternalProvider, Web3Provider } from '@ethersproject/providers';
import { makeBN } from '../utils';

const native = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export default class ERC20Token {
    tokenAddress: string;
    public contract: Contract;
    private provider: Web3Provider;
    public abi: any = abi;

    constructor(provider: ExternalProvider, tokenAddress: string) {
        this.tokenAddress = tokenAddress;
        this.provider = new Web3Provider(provider);
        this.contract = new Contract(tokenAddress, abi, this.provider.getSigner());
    }
    public get isNative () {
        return this.tokenAddress.toLocaleLowerCase() === native.toLocaleLowerCase();
    }
    public async allowance(owner_adress: string, target_adress: string) {
        const allowance: string = await this.contract.allowance(owner_adress, target_adress);
        return allowance;
    }
    public async hasEnoughAllowance (wallet: string, spender: string, amount: string) {
        if (this.isNative) return true;

        const currentAllowance = await this.allowance(wallet, spender);
        return makeBN(amount).lte(makeBN(currentAllowance as string));
    }
    public async createApproveTransaction (
        owner: string, 
        spender: string,
        amount: string
    ): Promise<{ from: string, to: string, data: string, value: string}> {
        const data =  this.contract.interface.encodeFunctionData('approve', [spender, amount]);
        
        return {
            from: owner,
            to: this.tokenAddress,
            data,
            value: amount
        }
    }
    public async balanceOf(): Promise<string> {
        try {
            const accounts = await this.provider.listAccounts();
            const address = accounts[0];
            return this.contract.balanceOf(address);
        } catch(e) {
            return '0';
        }
    }
    public async getDecimals(): Promise<string> {
        let decimals = await this.contract.decimals();
        return decimals;
    }
}



