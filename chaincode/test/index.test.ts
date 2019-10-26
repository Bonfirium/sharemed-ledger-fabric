import "mocha";
import { Organization } from "./_organizations";
import { clearWallets, Fabric, Unpromisify } from "./_utils";

let fabric: Fabric;

before(async () => {
	await clearWallets();
	fabric = new Fabric(Organization.MedOrg1);
	await fabric.init();
});

describe("MedOrg1 admin enrolling and import", () => {
	describe("when valid enrollment properties are provided", () => {
		let enrollment: Unpromisify<ReturnType<Fabric['enroll']>>;
		it("enrollment should succeed", async () => enrollment = await fabric.enroll("admin", "adminpw"));
		it("importing should succeed", () => fabric.import(enrollment));
	});
});

describe.only("MedOrg1 client registration", () => {
	before(async () => {
		if (!await fabric.exists("admin")) {
			const enrollment = await fabric.enroll("admin", "adminpw");
			await fabric.import(enrollment);
		}
		await fabric.connectGateway("admin");
	});
	it("should succeed", async () => {
		const enrollment = await fabric.register("qwe", "asd");
		console.log(enrollment);
	});
});
