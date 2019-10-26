import * as marshal from "nl-marshal";
import { Contract } from "fabric-contract-api";

import ShareMedLedgerContract from "./contract";

export { METHOD, outputs, args } from "./contract";

export const contracts: Array<typeof Contract> = [ShareMedLedgerContract];
export { ShareMedLedgerContract, marshal };
