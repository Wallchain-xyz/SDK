import { Eip1193Provider } from 'ethers';
import { useEffect, useState } from 'react';
import WallchainSDK from './';

export type TWalchainSuccessOutput = {
    status: 'found',
    transaction: {
        from: string,
        to: string,
        value: string,
        data: string,
        gas: string
    }
}
export type TWalchainPendingOutput = {
    status: 'pending'
}
export type TWalchainNotfoundOutput = {
    status: 'notFound'
}
export type TWalchainIdleOutput = {
    status: 'idle'
}
export type TWalchainErrorOutput = {
    status: 'error'
    error: Error
}
export type TWalchainNeedAllowanceOutput = {
    status: 'needAllowance'
    spender: string,
    amount: string
}

export type TWalchainOutput =
    TWalchainIdleOutput |
    TWalchainErrorOutput |
    TWalchainNotfoundOutput |
    TWalchainPendingOutput |
    TWalchainSuccessOutput |
    TWalchainNeedAllowanceOutput

export type TConfig = {
    provider: Eip1193Provider,
    keys: {
        [key: string]: string
    }
}

export type TWallchainInput = {
    from: string,
    to: string,
    value: string,
    data: string,
    isPermit: boolean,
    srcToken: string,
    dstToken: string,
    amountIn: string,
    permit: string,
}

export function useWallchain(config: TConfig, input: TWallchainInput): TWalchainOutput {
    const [output, setOutput] = useState<TWalchainOutput>({ status: 'idle' });

    useEffect(() => {
        (async () => {
            try {
                const sdk = new WallchainSDK(config);

                const apiResp = await sdk.checkForMEV({
                    from: input.from,
                    to: input.to,
                    data: input.data,
                    value: input.value
                });


                if (apiResp.MEVFound) {
                    if (sdk.supportsChain()) {
                        const needAllowance = !(await sdk.checkAllowance(input.srcToken, input.from, input.value));
                        const spender = await sdk.getSpender();

                        if (needAllowance) {
                            return setOutput({ status: 'needAllowance', spender, amount: input.value });
                        }

                        const witness = await sdk.signPermit(input.srcToken, input.from, spender, input.amountIn);
                        const newTransaction = await sdk.createNewTransaction(input, apiResp.masterInput, witness);

                        return setOutput({
                            status: 'found',
                            transaction: { ...newTransaction, gas: '' }
                        })
                    }
                }
                return setOutput({ status: 'notFound' });

            } catch (e) {
                setOutput({
                    status: 'error',
                    error: e
                })
            }
        })();
    }, [input]);

    return output;
}
