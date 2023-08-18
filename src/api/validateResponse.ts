import z from 'zod';

const stringOrNumber = z.union([ z.string(), z.number(), z.bigint() ]);

export const SwapPostValidator = z.object({
    backRun: z.object({
        searcher_request: z.object({
            to: stringOrNumber,
            gas: stringOrNumber,
            nonce: stringOrNumber,
            data: z.string(),
            bid: stringOrNumber,
            userCallHash: z.string(),
            maxGasPrice: stringOrNumber,
            deadline: stringOrNumber
        }),
        searcher_signature: z.string(),
        expected_usd_profit: stringOrNumber
    })
});

export type TSwapPostResponse = z.infer<typeof SwapPostValidator>
