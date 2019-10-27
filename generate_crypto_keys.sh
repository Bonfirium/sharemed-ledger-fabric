#!/bin/bash

set -ev

rm -rf ./config/*
mkdir -p ./config/
rm -rf ./crypto-config/

bin/cryptogen generate --config=./crypto-config.yaml

bin/configtxgen -profile OrdererGenesis -outputBlock ./config/genesis.block -channelID systemchannel

bin/configtxgen -profile MainChannel -outputCreateChannelTx ./config/mainchannel.tx -channelID mainchannel

bin/configtxgen \
	-profile MainChannel \
	-outputAnchorPeersUpdate ./config/auth_org_msp_anchors.tx \
	-channelID mainchannel \
	-asOrg AuthOrg

for i in 1 2 3
do bin/configtxgen \
	-profile MainChannel \
	-outputAnchorPeersUpdate ./config/med_org${i}_msp_anchors.tx \
	-channelID mainchannel \
	-asOrg MedOrg${i}
done

