//import { ethers, Contract } from 'ethers';
import Web3 from 'web3';
import abi from './abi.json';
import type { Eip1193Provider } from 'ethers';
import { makeBN } from '../utils';

const native = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export default class ERC20Token {
    tokenAddress: string;
    public web3: Web3;
    //@ts-ignore
    public contract: Web3.Contract;
    private provider: Eip1193Provider;
    private pendingAllowance: boolean;


    constructor(provider: Eip1193Provider, tokenAddress: string) {
        //@ts-expect-error Web3 requires depricated sendAsync
        this.web3 = new Web3(provider);
        this.tokenAddress = tokenAddress;
        //@ts-expect-error excessive abi type defenition is web3
        this.contract = new this.web3.eth.Contract(abi, tokenAddress);
        this.provider = provider;
    }

    public get isNative () {
        return this.tokenAddress.toLocaleLowerCase() === native.toLocaleLowerCase();
    }

    public async allowance(owner_adress: string, target_adress: string) {
        const allowance: string = await this.contract.methods.allowance(owner_adress, target_adress).call();
        return allowance;
    }
    public async hasEnoughAllowance (wallet: string, spender: string, amount: string) {
        if (this.isNative) return true;

        const currentAllowance = await this.allowance(wallet, spender);
        return makeBN(amount).lt(makeBN(currentAllowance as string));
    }

    public async createApproveTransaction (owner: string, spender: string, amount: string): Promise<{ from: string, to: string, data: string, value: string}> {
        const data = await this.contract.methods.approve(spender, amount).encodeABI() as string;
        
        return {
            from: owner,
            to: this.tokenAddress,
            data,
            value: amount
        }
    }

    public async balanceOf(): Promise<string> {
        try {
            const accounts = await this.web3.eth.getAccounts();
            return this.contract.methods.balanceOf(accounts[0]).call();
        } catch(e) {
            return '0';
        }
    }

    public async getDecimals(): Promise<string> {
        let decimals = await this.contract.methods.decimals().call();
        return decimals;
    }
}



