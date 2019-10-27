import { ok, rejects, fail } from "assert";
import * as bs58 from "bs58";
import { randomBytes } from "crypto";
import { Contract } from "fabric-network";
import "mocha";
import { empty } from "nl-marshal";
import { METHOD, Organization } from "../src";
import { accountId, linkApprove } from "../src/types";
import { Fabric, Unpromisify } from "./_utils";

const affiliation = "org1.department1";

type Enrolling = Unpromisify<ReturnType<Fabric["enroll"]>>;

describe.only("flow", () => {

	const authOrgAdminFabric = new Fabric(Organization.AuthOrg);
	describe("AuthOrg admin enrollment", () => {
		let enrollment: Enrolling;
		it("enroll", async () => enrollment = await authOrgAdminFabric.enroll("admin", "adminpw"));
		it("import", () => authOrgAdminFabric.import("admin", enrollment));
		it("connection to gateway", () => authOrgAdminFabric.connectGateway("admin"));
	});

	const authOrgUserId = bs58.encode(randomBytes(32));
	const authOrgUserFabric = new Fabric(Organization.AuthOrg);
	let authOrgUserContract: Contract;
	describe("AuthOrg user registration", () => {
		let enrollment: Enrolling;
		let password: string;
		it("registration", async () => password = await authOrgAdminFabric.register(authOrgUserId, affiliation));
		it("enroll", async () => enrollment = await authOrgUserFabric.enroll(authOrgUserId, password));
		it("import", () => authOrgUserFabric.import(authOrgUserId, enrollment));
		it("connection to gateway", () => authOrgUserFabric.connectGateway(authOrgUserId));
		it("get contract", async () => authOrgUserContract = await authOrgUserFabric.getContract());
	});

	const medOrg1AdminFabric = new Fabric(Organization.MedOrg1);
	describe("MedOrg1 admin enrollment", () => {
		let enrollment: Enrolling;
		it("enroll", async () => enrollment = await medOrg1AdminFabric.enroll("admin", "adminpw"));
		it("import", () => medOrg1AdminFabric.import("admin", enrollment));
		it("connection to gateway", () => medOrg1AdminFabric.connectGateway("admin"));
	});

	const medOrg1UserId = bs58.encode(randomBytes(32));
	const medOrg1UserFabric = new Fabric(Organization.MedOrg1);
	let medOrg1UserContract: Contract;
	describe("MedOrg1 user registration", () => {
		let enrollment: Enrolling;
		let password: string;
		it("registration", async () => password = await medOrg1AdminFabric.register(medOrg1UserId, affiliation));
		it("enroll", async () => enrollment = await medOrg1UserFabric.enroll(medOrg1UserId, password));
		it("import", () => medOrg1UserFabric.import(medOrg1UserId, enrollment));
		it("connection to gateway", () => medOrg1UserFabric.connectGateway(medOrg1UserId));
		it("get contract", async () => medOrg1UserContract = await medOrg1UserFabric.getContract());
	});

	describe("Connect MedOrg1 and AuthOrg accounts", () => {
		it("request", async () => {
			const request = await medOrg1UserContract.createTransaction(METHOD.LINK_ACCOUNT)
				.submit(accountId.stringify(authOrgUserId))
				.then((res) => empty.parse(res));
			ok(request === null);
		}).timeout(50e3);
		it("unable to get origin", async () => {
			try {
				await medOrg1UserContract.evaluateTransaction(METHOD.GET_ORIGIN, accountId.stringify(medOrg1UserId));
			} catch (error) {
				console.log(error);
				return;
			}
			fail();
		});
		it("approve", async () => {
			const approve = await authOrgUserContract.createTransaction(METHOD.APPROVE_LINK)
				.submit(linkApprove.stringify({ organization: Organization.MedOrg1, remote: medOrg1UserId }))
				.then((res) => empty.parse(res));
			ok(approve === null);
		}).timeout(50e3);
		it("returns origin", async () => {
			const origin = await medOrg1UserContract
				.evaluateTransaction(METHOD.GET_ORIGIN, accountId.stringify(medOrg1UserId))
				.then((res) => accountId.parse(res));
			ok(accountId.toJSON(origin) === authOrgUserId);
		});
	});

});
