import { ok, rejects, fail } from "assert";
import * as bs58 from "bs58";
import { randomBytes } from "crypto";
import { Contract } from "fabric-network";
import "mocha";
import { empty, InputOf, BigNumber } from "nl-marshal";
import { METHOD, Organization, args, outputs, mspOf } from "../src";
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

	const medOrg1DoctorId = bs58.encode(randomBytes(32));
	const medOrg1DoctorFabric = new Fabric(Organization.MedOrg1);
	let medOrg1DoctorContract: Contract;
	describe("MedOrg1 doctor registration", () => {
		let enrollment: Enrolling;
		let password: string;
		it("registration", async () => {
			password = await medOrg1AdminFabric.register(medOrg1DoctorId, "org1.department2");
		});
		it("enroll", async () => enrollment = await medOrg1DoctorFabric.enroll(medOrg1DoctorId, password));
		it("import", () => medOrg1DoctorFabric.import(medOrg1DoctorId, enrollment));
		it("connection to gateway", () => medOrg1DoctorFabric.connectGateway(medOrg1DoctorId));
		it("get contract", async () => medOrg1DoctorContract = await medOrg1DoctorFabric.getContract());
	});

	describe("MedOrg1 create document", () => {
		const document = {
			hash: randomBytes(34),
			cipherKey: randomBytes(24),
			accountId: medOrg1UserId,
		};
		let docId: BigNumber;
		it("should succeed", async () => {
			docId = await medOrg1DoctorContract.createTransaction(METHOD.ADD_DOCUMENT)
				.submit(args[METHOD.ADD_DOCUMENT].stringify(document))
				.then((res) => outputs[METHOD.ADD_DOCUMENT].parse(res));
		}).timeout(10e3);
		it("documents count should increase", async () => {
			const documentsCount = await medOrg1DoctorContract.evaluateTransaction(METHOD.GET_DOCUMENTS_COUNT)
				.then((res) => outputs[METHOD.GET_DOCUMENTS_COUNT].parse(res));
			ok(documentsCount.eq(docId.plus(1)));
		});
		it("returns partial document for AuthOrg", async () => {
			const arg = args[METHOD.GET_DOCUMENT].stringify(docId);
			const docRes = await authOrgUserContract.evaluateTransaction(METHOD.GET_DOCUMENT, arg)
				.then((res) => outputs[METHOD.GET_DOCUMENT].parse(res));
			ok(docRes.accountId.equals(bs58.decode(authOrgUserId)));
			ok(docRes.ownerMSP === mspOf[Organization.MedOrg1]);
			ok(docRes.collection === null);
		});
		it("returns full document for MedOrg1 doctor", async () => {
			await new Promise((resolve) => setTimeout(() => resolve(), 5e3));
			const arg = args[METHOD.GET_DOCUMENT].stringify(docId);
			const docRes = await medOrg1DoctorContract.evaluateTransaction(METHOD.GET_DOCUMENT, arg)
				.then((res) => outputs[METHOD.GET_DOCUMENT].parse(res));
			ok(docRes.accountId.equals(bs58.decode(authOrgUserId)));
			ok(docRes.ownerMSP === mspOf[Organization.MedOrg1]);
			if (docRes.collection === null) throw new Error("no collection returns");
			ok(docRes.collection.hash.equals(document.hash));
			ok(docRes.collection.cipherKey.equals(document.cipherKey));
		}).timeout(8e3);
	});

});
