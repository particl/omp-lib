// tslint:disable:max-line-length
import { Validator } from 'semverv/dist/validator';
import { HashableObject } from '../hasher/hashable';
import { HashableConfig } from '../interfaces/configs';

export class HashableValidator extends Validator {
    public validate(hashable: HashableObject, config: HashableConfig): boolean {
        // validate that the result contains all the fields defined in config
        for (const configField of config.fields) {
            if (hashable[configField.to] === undefined) {
                throw new Error(configField.to + ': missing');
            }
        }
        return true;
    }
}
