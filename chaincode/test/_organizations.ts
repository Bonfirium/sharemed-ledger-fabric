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
