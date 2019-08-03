import { isString, isObject, isArrayAndContains, isNumber, isValidPrice, isValidPercentage, isArray } from '../util';

export class FV_OBJECTS {

    public static validate(objects: any): boolean {

        if (objects) {
            if (!isArray(objects)) {
                throw new Error('objects: not an array');
            }

            objects.forEach((elem, i) => {
                if (!isObject(elem)) {
                    throw new Error('objects: not an object element=' + i);
                }

                if (!isString(elem.key) || !(isString(elem.value) || isNumber(elem.value))) {
                    throw new Error('objects: missing elements in element=' + i);
                }
            });

        }

        return true;
    }

    constructor() {
        //
    }
}
