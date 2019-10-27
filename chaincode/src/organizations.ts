export enum Organization {
	AuthOrg = "AuthOrg",
	MedOrg1 = "MedOrg1",
	MedOrg2 = "MedOrg2",
	MedOrg3 = "MedOrg3",
}

export enum OrganizationMSP {
	AuthOrg = "AuthOrgMSP",
	MedOrg1 = "MedOrg1MSP",
	MedOrg2 = "MedOrg2MSP",
	MedOrg3 = "MedOrg3MSP",
}

export type MSPOfOrganization<T extends Organization = Organization> = {
	[Organization.AuthOrg]: OrganizationMSP.AuthOrg,
	[Organization.MedOrg1]: OrganizationMSP.MedOrg1,
	[Organization.MedOrg2]: OrganizationMSP.MedOrg2,
	[Organization.MedOrg3]: OrganizationMSP.MedOrg3,
}[T]

export const mspOf: { [key in Organization]: MSPOfOrganization<key> } = {
	[Organization.AuthOrg]: OrganizationMSP.AuthOrg,
	[Organization.MedOrg1]: OrganizationMSP.MedOrg1,
	[Organization.MedOrg2]: OrganizationMSP.MedOrg2,
	[Organization.MedOrg3]: OrganizationMSP.MedOrg3,
}

export const organizations = [Organization.AuthOrg, Organization.MedOrg1, Organization.MedOrg2, Organization.MedOrg3];

export const collectionOfMSP: { [org in OrganizationMSP]: string | null } = {
	[OrganizationMSP.AuthOrg]: null,
	[OrganizationMSP.MedOrg1]: "medOrg1Collection",
	[OrganizationMSP.MedOrg2]: null,
	[OrganizationMSP.MedOrg3]: null,
};
