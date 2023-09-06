import { makeBN } from '../utils';
import { SwapPostValidator, TSwapPostResponse } from './validateResponse';

export type TSwapRequestData = {
    from: string,
    to: string,
    data: string,
    value: string,
};
export type TSwapRequestError = {
    bid: null
};

export type TSwapInfo = {
    tokenIn: string,
    tokenOut: string,
    amountIn: string
}

const RESP_TIMEOUT = 5 * 1000; // 5 seconds

const idToCodeMap: { [ key: string ]: string } = {
    '137':   'matic',
    '56':    'bsc',
    '43114': 'avax',
    '1':     'eth',
};

const makeHostname = (chain: string) =>  `https://${chain}.wallchains.com/meta_intent/`;

export type TApiRespArguments = TSwapPostResponse['backRun']['searcherRequest'];

export class WallchainApi {
    static makeQueryString(key: string, chainCode: string) {
        const hostname = makeHostname(chainCode);
        const url = new URL(hostname);
        url.searchParams.append('key', key);
        return url.toString();
    }
    static chainFromId (key: number) {
        return idToCodeMap[String(key)];
    }
    static makeSwapRequst (key: string, chainId: number, transaction: TSwapRequestData, swapInfo?: TSwapInfo): Promise<(TSwapPostResponse | TSwapRequestError)> {
        return new Promise(async (res, rej) => {
            const timeout = setTimeout(() => {
                rej(new Error('Wallchain error: request timeout reached.'));
            }, RESP_TIMEOUT);

            const chainCode = WallchainApi.chainFromId(chainId);
            const queryString = this.makeQueryString(key, chainCode);
            const response = await fetch(queryString, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    txn: {
                        sender: transaction.from,
                        destination: transaction.to,
                        data: transaction.data,
                        value: transaction.value
                    },
                    swapInfo: swapInfo ? 
                        { 
                            ...swapInfo, 
                            amountIn: `0x${makeBN(swapInfo.amountIn).toString(16)}`,
                            nativeIn: 
                                swapInfo.tokenIn.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
                        } 
                        : null
                  
                })
            });

            const json = await response.json();
            clearTimeout(timeout);

            try {
                const result = SwapPostValidator.parse(json);
                res(result);
            } catch (e) {
                rej(e);
            }
        });
    }
}
