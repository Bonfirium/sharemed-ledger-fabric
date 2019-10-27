import { bytes, Encoding, struct, chars, bool } from "nl-marshal";

export const accountId = bytes({ encoding: Encoding.BASE_58, length: 32 });
export const linkApprove = struct({ organization: chars, remote: accountId });
export const accountLink = struct({ origin: accountId, approved: bool });
