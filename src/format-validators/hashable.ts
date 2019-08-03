// tslint:disable:max-line-length
import { Validator } from 'semverv/dist/validator';
import { HashableObject } from '../hasher/hashable';

export class HashableValidator extends Validator {
    public validate(hashable: HashableObject): boolean {
        // validate that the result contains all the fields defined in config
        for (const configField of this.config.fields) {
            if (!hashable.hasOwnProperty(configField.to)) {
                throw new Error(configField.to + ': missing');
            }
        }
        return true;
    }
}
