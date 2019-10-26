export enum Organization {
	MedOrg1 = "MedOrg1",
	MedOrg2 = "MedOrg2",
	MedOrg3 = "MedOrg3",
}

const organizations = [Organization.MedOrg1, Organization.MedOrg2, Organization.MedOrg3];
export default organizations;

type MSPMap = { [org in Organization]: string };

export const mspOf: MSPMap = organizations.reduce<Partial<MSPMap>>((acc, org) => {
	acc[org] = `${org}MSP`;
	return acc;
}, {}) as MSPMap;

export const baseUrl = "sharemed-ledger.io";

export const ordererUrl = ["orderer", baseUrl].join(".");

type URLMap = { [org in Organization]: string };

export const urlOf: URLMap = organizations.reduce<Partial<URLMap>>((acc, org) => {
	acc[org] = [`med-org${org.slice("MedOrg".length)}`, baseUrl].join(".");
	return acc;
}, {}) as URLMap;

export const anchorPeerOf: URLMap = organizations.reduce<Partial<URLMap>>((acc, org) => {
	acc[org] = ["peer0", urlOf[org]].join(".");
	return acc;
}, {}) as URLMap;

export const caUrlOf: URLMap = organizations.reduce<Partial<URLMap>>((acc, org) => {
	acc[org] = ["ca", urlOf[org]].join(".");
	return acc;
}, {}) as URLMap;
