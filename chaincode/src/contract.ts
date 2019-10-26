import { Contract, Context } from "fabric-contract-api";
import { ISerializer, string, InputOf, OutputOf, empty } from "nl-marshal";

export enum METHOD {
	GET_USER_ID = 'getUserId',
}

export const args: { [method in METHOD]: ISerializer } = {
	[METHOD.GET_USER_ID]: empty,
};

export const outputs: { [method in METHOD]: ISerializer } = {
	[METHOD.GET_USER_ID]: string,
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

	async [METHOD.GET_USER_ID](ctx: Context, _: string): Promise<string> {
		return string.stringify(ctx.clientIdentity.getX509Certificate().subject.commonName);
	}
}
