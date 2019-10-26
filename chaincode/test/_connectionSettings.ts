import { readFile } from "fs-extra";
import * as path from "path";
import { Organization, mspOf, organizations } from "../src";

const rootPath = path.resolve(__dirname, '../..');

const anchorPeerOf: { [org in Organization]: string } = {
	[Organization.MedOrg1]: "peer0.med-org1.sharemed-ledger.io",
	[Organization.MedOrg2]: "peer0.med-org2.sharemed-ledger.io",
	[Organization.MedOrg3]: "peer0.med-org3.sharemed-ledger.io",
};

const caOf: { [org in Organization]: string } = {
	[Organization.MedOrg1]: "ca.med-org1.sharemed-ledger.io",
	[Organization.MedOrg2]: "ca.med-org2.sharemed-ledger.io",
	[Organization.MedOrg3]: "ca.med-org3.sharemed-ledger.io",
};

const ordererId = 'orderer.sharemed-ledger.io';

interface TimeoutSettings {
	peer: { endorser: string };
	orderer: string;
}

interface ClientSettings {
	organization: Organization;
	connection: { timeout: TimeoutSettings };
}

interface PeerSettings { }

interface OrganizationSettings {
	mspid: string;
	peers: string[];
	certificateAuthorities: string[];
}

interface ChannelSettings {
	orderers: string[];
	peers: { [peerId: string]: PeerSettings }
}

interface NodeSettings {
	url: string;
	tlsCACerts?: { pem: string };
	grpcOptions?: { 'ssl-target-name-override': string, hostnameOverride: string };
}

interface CertificateAuthoritySettings extends NodeSettings {
	caName: string;
}

interface ConnectionSettings {
	name: string;
	version: string;
	client: ClientSettings;
	channels: { [channelName: string]: ChannelSettings };
	organizations: { [organization in Organization]: OrganizationSettings };
	orderers: { [ordererId: string]: NodeSettings };
	peers: { [peer: string]: NodeSettings };
	certificateAuthorities: { [certificateAuthorityId: string]: CertificateAuthoritySettings };
	signedCert?: { pem: string };
}

function checkCertificatePEM(str: string) {
	if (!str.startsWith('-----BEGIN CERTIFICATE-----')) throw new Error('invalid certificate format');
}

const peersSettings: ConnectionSettings['peers'] = {
	[anchorPeerOf[Organization.MedOrg1]]: { url: "grpcs://localhost:37397" },
	[anchorPeerOf[Organization.MedOrg2]]: { url: "grpcs://localhost:37497" },
	[anchorPeerOf[Organization.MedOrg3]]: { url: "grpcs://localhost:37597" },
};

function getTlsOfPeer(orgShort: string) {
	return [
		"crypto-config/peerOrganizations",
		`${orgShort}.sharemed-ledger.io`,
		"tlsca",
		`tlsca.${orgShort}.sharemed-ledger.io-cert.pem`,
	].join("/");
}

const anchorPeerTlsPemOfOrganization: { [org in Organization]: string } = {
	[Organization.MedOrg1]: getTlsOfPeer("med-org1"),
	[Organization.MedOrg2]: getTlsOfPeer("med-org2"),
	[Organization.MedOrg3]: getTlsOfPeer("med-org3"),
};

const orderersSettings: ConnectionSettings["orderers"] = {
	[ordererId]: { url: "grpcs://localhost:37297" },
};

const ordererTlsca = "crypto-config/ordererOrganizations/sharemed-ledger.io/tlsca/tlsca.sharemed-ledger.io-cert.pem";

export async function loadCertificates() {
	await Promise.all([
		...organizations.map(async (org) => {
			const peer = peersSettings[anchorPeerOf[org]];
			if (peer.tlsCACerts) return checkCertificatePEM(peer.tlsCACerts.pem);
			peer.tlsCACerts = {
				pem: await readFile(path.resolve(rootPath, anchorPeerTlsPemOfOrganization[org]), 'utf8'),
			};
			peer.grpcOptions = {
				"ssl-target-name-override": anchorPeerOf[org],
				hostnameOverride: anchorPeerOf[org],
			};
		}),
		Promise.resolve().then(async () => {
			const orderer = orderersSettings[ordererId];
			if (orderer.tlsCACerts) return checkCertificatePEM(orderer.tlsCACerts.pem);
			orderer.tlsCACerts = { pem: await readFile(path.resolve(rootPath, ordererTlsca), 'utf8') };
			orderer.grpcOptions = {
				"ssl-target-name-override": ordererId,
				hostnameOverride: ordererId,
			};
		}),
	]);
}

export function getConnectionSettings(organization: Organization): ConnectionSettings {
	return {
		name: 'network',
		version: '1.0.0',
		client: {
			organization,
			connection: {
				timeout: { peer: { endorser: "300" }, orderer: "300" },
			},
		},
		channels: {
			mainchannel: {
				orderers: [ordererId],
				peers: {
					[anchorPeerOf[Organization.MedOrg1]]: {},
					[anchorPeerOf[Organization.MedOrg2]]: {},
					[anchorPeerOf[Organization.MedOrg3]]: {},
				},
			},
		},
		organizations: {
			[Organization.MedOrg1]: {
				mspid: mspOf[Organization.MedOrg1],
				peers: [anchorPeerOf[Organization.MedOrg1]],
				certificateAuthorities: [caOf[Organization.MedOrg1]],
			},
			[Organization.MedOrg2]: {
				mspid: mspOf[Organization.MedOrg2],
				peers: [anchorPeerOf[Organization.MedOrg2]],
				certificateAuthorities: [caOf[Organization.MedOrg2]],
			},
			[Organization.MedOrg3]: {
				mspid: mspOf[Organization.MedOrg3],
				peers: [anchorPeerOf[Organization.MedOrg3]],
				certificateAuthorities: [caOf[Organization.MedOrg3]],
			},
		},
		orderers: orderersSettings,
		peers: peersSettings,
		certificateAuthorities: {
			[caOf[Organization.MedOrg1]]: { url: "https://localhost:37400", caName: caOf[Organization.MedOrg1] },
			[caOf[Organization.MedOrg2]]: { url: "https://localhost:37500", caName: caOf[Organization.MedOrg2] },
			[caOf[Organization.MedOrg3]]: { url: "https://localhost:37600", caName: caOf[Organization.MedOrg3] },
		},
	};
}
