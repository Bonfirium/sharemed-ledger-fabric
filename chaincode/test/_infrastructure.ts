import FabricCAServices = require("fabric-ca-client");
import organizations, { Organization } from "./_organizations";

export type CAServicesUrlMap = { [organization in Organization]: string };

export const caServicesUrl: CAServicesUrlMap = organizations.reduce<Partial<CAServicesUrlMap>>((acc, org, index) => {
	acc[org] = `https://localhost:37${index + 4}00`;
	return acc;
}, {}) as CAServicesUrlMap;

export type CAServicesMap = { [organization in Organization]: FabricCAServices };

export const caServices: CAServicesMap = organizations.reduce<Partial<CAServicesMap>>((acc, organization) => {
	acc[organization] = new FabricCAServices(caServicesUrl[organization]);
	return acc;
}, {}) as CAServicesMap;
