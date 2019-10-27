import { ok } from "assert";
import { Contract, Context } from "fabric-contract-api";
import { ISerializer, InputOf, empty, chars, BaseOf } from "nl-marshal";
import { Organization, mspOf } from "./organizations";
import { linkApprove, accountId, accountLink } from "./types";

export enum METHOD {
	GET_USER_ID = "getUserId",
	GET_ORIGIN = "getOrigin",
	LINK_ACCOUNT = "linkAccount",
	APPROVE_LINK = "approveLink",
}

export const args: { [method in METHOD]: ISerializer } = {
	[METHOD.GET_USER_ID]: empty,
	[METHOD.GET_ORIGIN]: accountId,
	[METHOD.LINK_ACCOUNT]: accountId,
	[METHOD.APPROVE_LINK]: linkApprove,
};

export const outputs: { [method in METHOD]: ISerializer } = {
	[METHOD.GET_USER_ID]: chars,
	[METHOD.GET_ORIGIN]: accountId,
	[METHOD.LINK_ACCOUNT]: empty,
	[METHOD.APPROVE_LINK]: empty,
};

const KEY = {
	LINK_ACCOUNT: (msp: string, remote: string): string => `LINK_${msp}_${remote}`,
};

export type IShareMedLedgerContract = { [method in METHOD]: (ctx: Context, arg: string) => Promise<string> };

export default class ShareMedLedgerContract extends Contract implements IShareMedLedgerContract {
	constructor() { super('io.sharemed-ledger.contract'); }
	async _exec<T extends METHOD>(
		ctx: Context,
		method: T,
		arg: InputOf<typeof args[T]>,
	): Promise<BaseOf<typeof outputs[T]>> {
		const input_t = args[method];
		const input_s = input_t.stringify(arg);
		const output_s = await this[method](ctx, input_s);
		const output_t = outputs[method];
		return output_t.parse(output_s);
	}

	async [METHOD.GET_USER_ID](ctx: Context, _: string): Promise<string> {
		return chars.stringify(ctx.clientIdentity.getX509Certificate().subject.commonName);
	}

	async [METHOD.GET_ORIGIN](ctx: Context, input: string): Promise<string> {
		const remote = accountId.parse(input);
		const organization = ctx.clientIdentity.getMSPID();
		ok(organization !== Organization.AuthOrg);
		const request_b = await ctx.stub.getState(KEY.LINK_ACCOUNT(organization, accountId.toJSON(remote)));
		// FIXME: only by doctor or remote
		ok(request_b !== undefined && request_b.length !== 0);
		const { origin, approved } = accountLink.fromBuffer(request_b);
		ok(approved);
		return accountId.stringify(origin);
	}

	async [METHOD.LINK_ACCOUNT](ctx: Context, input: string): Promise<string> {
		const origin = accountId.parse(input);
		const msp = ctx.clientIdentity.getMSPID();
		const remote = accountId.fromJSON(ctx.clientIdentity.getX509Certificate().subject.commonName);
		ok(msp !== mspOf[Organization.AuthOrg], `organization ${Organization.AuthOrg} unable to link accounts`);
		await ctx.stub.putState(KEY.LINK_ACCOUNT(msp, accountId.toJSON(remote)), accountLink.toBuffer({
			origin, approved: false,
		}));
		return empty.stringify(null);
	}

	async [METHOD.APPROVE_LINK](ctx: Context, input: string): Promise<string> {
		const { organization, remote } = linkApprove.parse(input);
		const origin = accountId.fromJSON(ctx.clientIdentity.getX509Certificate().subject.commonName);
		const byOrg = ctx.clientIdentity.getMSPID();
		ok(byOrg === mspOf[Organization.AuthOrg], `expected organization AuthOrg, but actual msp is ${byOrg}`);
		ok(Object.keys(mspOf).includes(organization), `unknown organization ${organization}`);
		ok(organization !== Organization.AuthOrg, `unable to approve AuthOrg links`);
		const key = KEY.LINK_ACCOUNT(mspOf[organization as Organization], accountId.toJSON(remote));
		const request_b = await ctx.stub.getState(key);
		ok(request_b !== undefined && request_b.length !== 0, "request is not exists");
		const { origin: originLink, approved } = accountLink.fromBuffer(request_b);
		ok(!approved, "request is already approved");
		const origin_j = accountId.toJSON(origin);
		ok(origin.equals(originLink), `origin ${origin_j} not equals to expected ${accountId.toJSON(originLink)}`);
		await ctx.stub.putState(key, accountLink.toBuffer({ origin, approved: true }));
		return empty.stringify(null);
	}
}
