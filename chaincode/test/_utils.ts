/// <reference path="../src/index.ts" />

import * as FabricCAServices from "fabric-ca-client";
import { FileSystemWallet, X509WalletMixin, Gateway } from "fabric-network";
import { mkdir, mkdirp } from "fs-extra";
import * as path from "path";
import rimrafWithCb from "rimraf";

import { caServices, caConnectionProps } from "./_infrastructure";
import organizations, { Organization, mspOf, ordererUrl } from "./_organizations";
import { inspect } from "util";

export async function rimraf(path: string): Promise<void> {
	await new Promise((resolve, reject) => rimrafWithCb(path, (error) => {
		if (error !== null) return reject(error);
		resolve();
	}));
}

const walletsPath = path.resolve(__dirname, "wallets");

export async function clearWallets(): Promise<void> {
	await rimraf(walletsPath);
	await mkdirp(walletsPath);
}

export class Fabric {
	private static walletsCount = 0;

	private readonly wallet: FileSystemWallet;
	public readonly walletPath: string;
	private readonly _gateway: Gateway = new Gateway();

	constructor(public readonly organization: Organization) {
		this.walletPath = path.resolve(walletsPath, Fabric.walletsCount.toString(10));
		Fabric.walletsCount += 1;
		this.wallet = new FileSystemWallet(this.walletPath);
	}

	async init(): Promise<void> {
		await rimraf(this.walletPath);
		await mkdir(this.walletPath);
	}

	async exists(label: string): Promise<boolean> { return await this.wallet.exists(label); }

	async enroll(enrollmentID: string, enrollmentSecret: string): Promise<FabricCAServices.IEnrollResponse> {
		return await caServices[this.organization].enroll({ enrollmentID, enrollmentSecret, profile: "tls" });
	}

	async import(enrollment: FabricCAServices.IEnrollResponse): Promise<void> {
		const msp = mspOf[this.organization];
		const identity = X509WalletMixin.createIdentity(msp, enrollment.certificate, enrollment.key.toBytes());
		await this.wallet.import('admin', identity);
	}

	async connectGateway(label: string) {
		const gatewaySettings = {
			wallet: this.wallet,
			identity: label,
			discovery: { enabled: false },
		};
		const clientConfig = ;
		console.log(inspect(clientConfig, false, null, true));
		await this._gateway.connect(clientConfig, gatewaySettings);
	}

	async register(userId: string, affiliation: string) {
		const ca = this._gateway.getClient().getCertificateAuthority();
		const adminIdentity = this._gateway.getCurrentIdentity();
		const enrollmentSecret = await caServices[this.organization].register(
			{ affiliation, enrollmentID: userId, role: 'client' },
			adminIdentity,
		);
		return await ca.enroll({ enrollmentID: userId, enrollmentSecret });
	}
}

export type Unpromisify<T> = T extends Promise<infer U> ? U : T;
