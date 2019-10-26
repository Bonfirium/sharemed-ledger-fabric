export enum Organization {
	MedOrg1 = "MedOrg1",
	MedOrg2 = "MedOrg2",
	MedOrg3 = "MedOrg3",
}

export enum OrganizationMSP {
	MedOrg1 = "MedOrg1MSP",
	MedOrg2 = "MedOrg2MSP",
	MedOrg3 = "MedOrg3MSP",
}

export type MSPOfOrganization<T extends Organization = Organization> = {
	[Organization.MedOrg1]: OrganizationMSP.MedOrg1,
	[Organization.MedOrg2]: OrganizationMSP.MedOrg2,
	[Organization.MedOrg3]: OrganizationMSP.MedOrg3,
}[T]

export const mspOf: { [key in Organization]: MSPOfOrganization<key> } = {
	[Organization.MedOrg1]: OrganizationMSP.MedOrg1,
	[Organization.MedOrg2]: OrganizationMSP.MedOrg2,
	[Organization.MedOrg3]: OrganizationMSP.MedOrg3,
}

export const organizations = [Organization.MedOrg1, Organization.MedOrg2, Organization.MedOrg3];
