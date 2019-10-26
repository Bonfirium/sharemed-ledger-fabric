import organizations, { Organization, ordererUrl, urlOf, caUrlOf, mspOf, anchorPeerOf } from "./_organizations";
import { caServicesUrl } from "./_infrastructure";

const clientConnectionConfig = {
	timeout: { peer: { endorser: "300" }, orderer: "300" },
};

interface ICAConnectionProps {
	url: string;
	caName: string;
};

type CAConnectionPropsMap = { [org: string]: ICAConnectionProps };

export const caConnectionProps: CAConnectionPropsMap = organizations
	.reduce<Partial<CAConnectionPropsMap>>((acc, org) => {
		const caName = caUrlOf[org];
		acc[caName] = { url: caServicesUrl[org], caName };
		return acc;
	}, {}) as CAConnectionPropsMap;

interface ChannelPeerProps {}

type ChannelPeers = { [peer: string]: ChannelPeerProps };

export const channelPeers: ChannelPeers = organizations.reduce<Partial<ChannelPeers>>((acc, org) => {
	acc[caUrlOf[org]] = {};
	return acc;
}, {}) as ChannelPeers;

interface OrganizationConnectionProps {
	mspid: string;
	peers: string[];
	certificateAuthorities: string[];
}

type OrganizationsConnection = { [org in Organization]: OrganizationConnectionProps };

export const organizationsConnection: OrganizationsConnection = organizations.reduce<Partial<OrganizationsConnection>>(
	(acc, org) => {
		acc[org] = { mspid: mspOf[org], peers: [caUrlOf[org]], certificateAuthorities: [caUrlOf[org]] };
		return acc;
	},
	{},
) as OrganizationsConnection;

interface PeerProps { url: string }

type PeersConnection = { [org in Organization]: PeerProps };

export const peersConnection: PeersConnection = organizations.reduce<Partial<PeersConnection>>((acc, org) => {
	acc[anchorPeerOf[org]] = { url: `grpcs://localhost:${}` }
});

export const defaultConfig = {
	name: "network",
	version: "1.0.0",
	channels: {
		mainchannel: { orderers: [ordererUrl], peers: channelPeers },
	},
	certificateAuthorities: caConnectionProps,
	organizations: organizationsConnection,
	orderers: {
		[ordererUrl]: { url: "grpc://localhost:37297" },
	}
}

export function getConfig(organization: Organization) {
	return {
		...defaultConfig,
		client: { ...clientConnectionConfig, organization },
	};
}
