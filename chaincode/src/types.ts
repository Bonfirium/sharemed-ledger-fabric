import { bytes, Encoding, struct, chars, bool, extended, optional } from "nl-marshal";

export const accountId = bytes({ encoding: Encoding.BASE_58, length: 32 });
export const linkApprove = struct({ organization: chars, remote: accountId });
export const accountLink = struct({ origin: accountId, approved: bool });
export const addDocumentRequest = struct({
	accountId,
	hash: bytes({ encoding: Encoding.BASE_58, length: 34 }),
	cipherKey: bytes({ encoding: Encoding.BASE_58, length: 24 }),
});
export const document = struct({ accountId, ownerMSP: chars });
export const collectionDocument = struct({
	hash: addDocumentRequest.serializers.hash,
	cipherKey: addDocumentRequest.serializers.cipherKey,
});
export const documentResult = extended(document, { collection: optional(collectionDocument) });
