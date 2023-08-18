# Wallchain SDK

Simple integration to get MEV cashback.

### 1. Create SDK instance
```typescript
import { SDK } '@wallchain/sdk';

const wallchain = new SDK({
    provider //EIP-1193 provider
    keys: {
        matic: 'key',
        ...
        /* 
            Api keys to Wallchain's contract.
            Don't have keys? Contact our sales team.
        */
    },
    originator?: [] // platform addresses to recieve reward
    originShare?: 0 //percent that you share with user, originShare ∈ [0, 50]
})
```

### 2. Check for MEV oppurtunity
```typescript
const transactionData = {
    from:  'address',
    to:    'address',
    data:  'bytes',
    value: 'uint',
}

const apiResponse = await wallchain.checkMEV(transactionData);
```

In case MEV is found response will be shaped this way:
```typescript
{
    MEVFound: true,
    cahsbackAmount: string, // in usd
    masterInput: string
}
```
Or sad version of it:
```typescript
{
    MEVFound: false
}
```

### 3. Allowance

Permit2 technology is being used to withdraw ERC-20 for executing the swap. No
need to ask for permit if swapping native token of the chain.
```typescript
const hasAllowance = await sdk.hasEnoughAllowance(sourceTokenAddress, ownerAddress, amount);

if (!hasAllowance) {
    // returns Permit2 if chain supports, fallbacks to Wallchain contract
    const spenderForAllowance = await sdk.getSpenderForAllowance();

}
```

### 4. Permit
In case user swaps ERC-20 token, we'd need to ask for a permit to execute the
swap itself.
```typescript
const spender = await sdk.getSpender();  // Wallchain's address at current chain
const witness = await sdk.signPermit(tokenAddress, wallet, spender, value);
```
This function automaticaly calls the wallet and resolves with signature and
signed data.

### 5. Update transaction
```typescript
const newTransaction = await sdk.createNewTransaction(
    {
        ...originalTransaction,
        isPermit, // true if not native token
        amountIn, // amount of token to swap, equals msg.value when native token
        srcTokenAddress,
        dstTokenAddress
    },
    apiResp.masterInput  // Resolved on step #1
    witness,  // resolved from step #4 or undefined
)


type newTransaction: {
    from: string,
    to: string,
    data: string,
    value: string,
    gas: string
}
```

Now you can send it safe and secure.
