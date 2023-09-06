import z from 'zod';

const stringOrNumber = z.union([ z.string(), z.number(), z.bigint() ]);

export const SwapPostValidator = z.object({
    backRun: z.object({
        searcherRequest: z.object({
            to: stringOrNumber,
            gas: stringOrNumber,
            nonce: stringOrNumber,
            data: z.string(),
            bid: stringOrNumber,
            userCallHash: z.string(),
            maxGasPrice: stringOrNumber,
            deadline: stringOrNumber
        }),
        searcherSignature: z.string(),
        suggestedGas: z.string().optional(),
        expectedUsdProfit: stringOrNumber.optional()
    })
});

export type TSwapPostResponse = z.infer<typeof SwapPostValidator>
