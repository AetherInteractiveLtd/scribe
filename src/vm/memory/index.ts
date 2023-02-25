import { ScribeVM } from "..";

export function FREE_ARRAY(array: object): void {
	return table.clear(array);
}

export function FREE_VM(vm: ScribeVM): void {
	return table.clear(vm);
}
