import { ok } from "assert";
import { Contract, Context } from "fabric-contract-api";
import { ISerializer, InputOf, empty, chars, BaseOf, varuint, BigNumber } from "nl-marshal";
import { Organization, mspOf, collectionOfMSP, OrganizationMSP } from "./organizations";
import { linkApprove, accountId, accountLink, addDocumentRequest, document, collectionDocument } from "./types";

export enum METHOD {
	GET_DOCUMENTS_COUNT = "getDocumentsCount",
	GET_USER_ID = "getUserId",
	GET_ORIGIN = "getOrigin",
	LINK_ACCOUNT = "linkAccount",
	APPROVE_LINK = "approveLink",
	ADD_DOCUMENT = "addDocument",
}

export const args = {
	[METHOD.GET_DOCUMENTS_COUNT]: empty,
	[METHOD.GET_USER_ID]: empty,
	[METHOD.GET_ORIGIN]: accountId,
	[METHOD.LINK_ACCOUNT]: accountId,
	[METHOD.APPROVE_LINK]: linkApprove,
	[METHOD.ADD_DOCUMENT]: addDocumentRequest,
};

export type Arg<method extends METHOD> = typeof args[method];

export const outputs = {
	[METHOD.GET_DOCUMENTS_COUNT]: varuint,
	[METHOD.GET_USER_ID]: chars,
	[METHOD.GET_ORIGIN]: accountId,
	[METHOD.LINK_ACCOUNT]: empty,
	[METHOD.APPROVE_LINK]: empty,
	[METHOD.ADD_DOCUMENT]: varuint,
};

export type Output<method extends METHOD> = typeof outputs[method];

const KEY = {
	LINK_ACCOUNT: (msp: string, remote: string): string => `LINK_${msp}_${remote}`,
	DOCUMENTS_COUNT: "DOCUMENTS_COUNT",
	DOCUMENT: (key: BigNumber): string => `DOCUMENT_${key.toString(10)}`,
};

export type IShareMedLedgerContract = { [method in METHOD]: (ctx: Context, arg: string) => Promise<string> };

export default class ShareMedLedgerContract extends Contract implements IShareMedLedgerContract {
	constructor() { super('io.sharemed-ledger.contract'); }
	async _exec<T extends METHOD>(
		ctx: Context,
		method: T,
		arg: InputOf<Arg<T>>,
	): Promise<BaseOf<Output<T>>> {
		const input_t = args[method];
		const input_s = input_t.stringify(arg);
		const output_s = await this[method](ctx, input_s);
		const output_t = outputs[method];
		return output_t.parse(output_s) as BaseOf<Output<T>>;
	}

	async [METHOD.GET_DOCUMENTS_COUNT](ctx: Context, _: string): Promise<string> {
		const result_b = await ctx.stub.getState(KEY.DOCUMENTS_COUNT);
		const result = result_b === undefined || result_b.length === 0 ?
			new BigNumber(0) : varuint.fromBuffer(result_b);
		return outputs[METHOD.GET_DOCUMENTS_COUNT].stringify(result);
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
		ok(request_b !== undefined && request_b.length !== 0, "account link not found");
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

	async [METHOD.ADD_DOCUMENT](ctx: Context, input: string): Promise<string> {
		const { accountId, cipherKey, hash } = addDocumentRequest.parse(input);
		const msp = ctx.clientIdentity.getMSPID() as OrganizationMSP;
		ok(msp !== mspOf[Organization.AuthOrg]);
		const [origin, documentsCount] = await Promise.all([
			this._exec(ctx, METHOD.GET_ORIGIN, accountId),
			this._exec(ctx, METHOD.GET_DOCUMENTS_COUNT, null),
		]);
		const collection = collectionOfMSP[msp];
		if (collection === null) throw new Error(`unable to get collection of ${msp}`);
		const collectionBuffer = collectionDocument.toBuffer({ hash, cipherKey });
		await Promise.all([
			ctx.stub.putState(KEY.DOCUMENT(documentsCount), document.toBuffer({ accountId: origin, ownerMSP: msp })),
			ctx.stub.putState(KEY.DOCUMENTS_COUNT, varuint.toBuffer(documentsCount.plus(1))),
			ctx.stub.putPrivateData(collection, KEY.DOCUMENT(documentsCount), collectionBuffer),
		]);
		return outputs[METHOD.ADD_DOCUMENT].stringify(documentsCount);
	}
}
