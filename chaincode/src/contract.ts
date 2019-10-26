import { Contract, Context } from "fabric-contract-api";
import { ISerializer, varuint, string, InputOf, OutputOf } from "nl-marshal";

export enum METHOD {
	TEST = 'test',
}

export const args: { [method in METHOD]: ISerializer } = {
	[METHOD.TEST]: varuint,
};

export const outputs: { [method in METHOD]: ISerializer } = {
	[METHOD.TEST]: string,
};

export type IShareMedLedgerContract = { [method in METHOD]: (ctx: Context, arg: string) => Promise<string> };

export default class ShareMedLedgerContract extends Contract implements IShareMedLedgerContract {
	constructor() { super('io.sharemed-ledger.contract'); }
	async _exec<T extends METHOD>(
		ctx: Context,
		method: T,
		arg: InputOf<typeof args[T]>,
	): Promise<OutputOf<typeof outputs[T]>> {
		const input_t = args[method];
		const input_s = input_t.stringify(arg);
		const output_s = await this[method](ctx, input_s);
		const output_t = outputs[method];
		return output_t.parse(output_s);
	}

	async [METHOD.TEST](_: Context, input_s: string): Promise<string> {
		const input = varuint.parse(input_s);
		return varuint.stringify(input.plus(1));
	}
}
