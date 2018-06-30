## TODO list

# Build the OMP interfaces and write docs for the changes
We need to build the OMP interfaces in the interfaces/omp.ts file.
Any changes to the current implementation should be denoted with // !implementation
Any changes to the current protocol spec should be denoted with // !protocol

# Build the validation step by step.
Once we have all the right interfaces we build the "step validator".
Cast any input to the MPA interface.

# Chain verification
We verify a chain of MPAs.

```
Validate that each individual element is a valid MPA.
Check if the MPA is preceded by the right MPA.

A MPA_BID is always preceded by a MPA_LISTING. 
A MPA_ACCEPT is always preceded by a MPA_BID etc..
```

# Transaction building and verification
We build the transaction based on a sequence of MPAs.
If we always rebuild the transaction from the sequence then we reduce:
* the amount of untrusted data to the bare minimum
* thus reduce the amount of validation required
