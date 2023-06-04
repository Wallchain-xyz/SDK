import { SwapPostValidator, TSwapPostResponse } from './validateResponse';

export type TSwapRequestData = {
    from: string,
    to: string,
    data: string,
    value: string,
};
export type TSwapRequestError = {
    path_found: false,
    error: true,
    error_data: Error
};

const RESP_TIMEOUT = 5 * 1000; // 5 seconds

const idToCodeMap: { [ key: string ]: string } = {
    '137':   'matic',
    '56':    'bsc',
    '43114': 'avax',
    '1':     'eth',
};

const makeHostname = (chain: string) =>  `https://${chain}.wallchains.com/upgrade_txn/`;


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
    static makeSwapRequst (key: string, chainId: number, transaction: TSwapRequestData): Promise<(TSwapPostResponse | TSwapRequestError)> {
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
                    sender: transaction.from,
                    destination: transaction.to,
                    data: transaction.data,
                    value: transaction.value,
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
