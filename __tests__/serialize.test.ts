import { getSerializedInteger } from "../src/transaction-builder/transaction";


test('serialize a number', () => {

    const i = 4194313;
    console.log(i.toString(16))
    console.log(getSerializedInteger(i))

});