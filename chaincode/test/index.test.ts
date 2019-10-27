import "mocha";
import { clearWallets, Fabric, Unpromisify } from "./_utils";
import { randomBytes } from "crypto";
import { loadCertificates } from "./_connectionSettings";
import { Organization } from "../src";

let fabric: Fabric;

before(async () => {
	await loadCertificates();
	await clearWallets();
	fabric = new Fabric(Organization.MedOrg1);
	await fabric.init();
});

describe("MedOrg1 admin enrolling and import", () => {
	describe("when valid enrollment properties are provided", () => {
		let enrollment: Unpromisify<ReturnType<Fabric['enroll']>>;
		it("enrollment should succeed", async () => enrollment = await fabric.enroll("admin", "adminpw"));
		it("importing should succeed", () => fabric.import("admin", enrollment));
	});
});

describe("MedOrg1 client registration", () => {
	before(async () => {
		if (!await fabric.exists("admin")) {
			const enrollment = await fabric.enroll("admin", "adminpw");
			await fabric.import("admin", enrollment);
		}
		await fabric.connectGateway("admin");
	});
	it("should succeed", async () => {
		const password = await fabric.register(`client${randomBytes(32).toString("hex")}`, "org1.department1");
		console.log(password);
	});
});

require("./flow.test");
