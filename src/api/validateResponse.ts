import z from 'zod';

const stringOrNumber = z.union([ z.string(), z.number(), z.bigint() ]);

export const SwapPostValidator = z.object({
    pathFound: z.boolean(),
    summary: z.object({
        searchSummary: z.object({
            expectedKickbackProfit: stringOrNumber,
            expectedProfit:         stringOrNumber,
            expectedUsdProfit:      stringOrNumber,
            firstTokenAddress:      stringOrNumber,
            firstTokenAmount:       stringOrNumber,
        }).nullable()
    }).nullable(),
    transactionArgs: z.object({
        data:                 stringOrNumber,
        destination:          stringOrNumber,
        value:                stringOrNumber,
        gas:                  stringOrNumber.nullable(),
        gasPrice:             stringOrNumber.nullable(),
        masterInput:          stringOrNumber.nullable(),
        maxFeePerGas:         stringOrNumber.nullable(),
        maxPriorityFeePerGas: stringOrNumber.nullable(),
        nonce:                stringOrNumber.nullable(),
        sender:               stringOrNumber.nullable()
    }),
    parsedTxn: z.object({
        firstToken:       z.string(),
        firstTokenAmount: z.string()
    }).optional(),
});

export type TSwapPostResponse = z.infer<typeof SwapPostValidator>
