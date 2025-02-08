import { storage } from './profile';



type SupportedTypes = 'number' | 'boolean' | 'string';


export class Settings {
    static getString(key: string, defValue: string): string {
        if (!storage) throw "Missing Storage"
        const val = storage.getString(key);
        if (!val) return defValue;
        return val;
    }
    static getNumber(key: string, defValue: number): number {
        if (!storage) throw "Missing Storage"
        const val = storage.getNumber(key);
        if (!val) return defValue;
        return val;
    }
    static getBoolean(key: string, defValue: boolean): boolean {
        if (!storage) throw "Missing Storage"
        const val = storage.getBoolean(key);
        if (val == undefined || val == null) return defValue;
        return val;
    }


    static set(key: string, val: number | boolean | string) {
        storage.set(key, val);
    }

    static setArray(key: string, arr: any[]) {
        storage.set(key, arr.length);
        for (let i = 0; i < arr.length; i++) {
            storage.set(key + "_" + i, arr[i]);
        }
    }

    /**
     * Retrieves an array of values from storage based on the specified type.
     *
     * @param key - The base key used to store the array count and individual items.
     * @param defValue - The default array to return if stored values are missing.
     * @param type - The type of the items stored ('number', 'boolean', or 'string').
     * @returns An array of type T or undefined if the count is not set.
     */
    static getArray<T>(key: string, type: SupportedTypes, defValue: T[]): T[] {
        if (!storage) throw "Missing Storage"
        const count = storage.getNumber(key);
        if (count !== undefined && count > 0) {
            const retValue: T[] = [];
            for (let i = 0; i < count; i++) {
                let val: T | undefined;
                const itemKey = `${key}_${i}`;

                switch (type) {
                    case 'number':
                        val = storage.getNumber(itemKey) as unknown as T;
                        break;
                    case 'boolean':
                        val = storage.getBoolean(itemKey) as unknown as T;
                        break;
                    case 'string':
                        val = storage.getString(itemKey) as unknown as T;
                        break;
                    default:
                        throw new Error(`Unsupported type: ${type}`);
                }

                if (val === undefined && i < defValue.length) {
                    val = defValue[i];
                }

                retValue.push(val);
            }
            return retValue;
        } 
        return defValue;
    }
}

