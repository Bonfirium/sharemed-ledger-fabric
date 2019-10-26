import * as bs58 from "bs58";
import { Fabric } from "./_utils";
import { Organization } from "./_organizations";
import { randomBytes } from "crypto";
import { METHOD } from "../src";

it.only("flow", async () => {
	const adminFabric = new Fabric(Organization.MedOrg1);
	const adminEnrollment = await adminFabric.enroll("admin", "adminpw");
	await adminFabric.import("admin", adminEnrollment);
	await adminFabric.connectGateway("admin");
	const userName = bs58.encode(randomBytes(32));
	console.log("UserName:", userName);
	const userPassword = await adminFabric.register(userName, "org1.department1");
	console.log("UserPassword:", userPassword);
	const userFabric = new Fabric(Organization.MedOrg1);
	const userEnrollment = await userFabric.enroll(userName, userPassword);
	await userFabric.import(userName, userEnrollment);
	await userFabric.connectGateway(userName);
	const contract = await userFabric.getContract();
	const res = await contract.createTransaction(METHOD.GET_USER_ID).submit();
	console.log(res.toString());
}).timeout(100e3);
