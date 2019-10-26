#!/bin/bash
set -ev

export CHAINCODE_ID=sharemedchaincode
export COMPOSE_PROJECT_NAME=fabric

DOCKER_CONTAINERS_TO_RM=$(docker ps -a | grep .sharemed-ledger.io | awk '{print $1}')
if [ ! -z "$DOCKER_CONTAINERS_TO_RM" ]
then docker rm -f $DOCKER_CONTAINERS_TO_RM
fi

export MED_ORG1_CA_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/med-org1.sharemed-ledger.io/ca && ls *_sk)
export MED_ORG2_CA_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/med-org1.sharemed-ledger.io/ca && ls *_sk)
export MED_ORG3_CA_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/med-org1.sharemed-ledger.io/ca && ls *_sk)

for KEY in \
	$MED_ORG1_CA_PRIVATE_KEY \
	$MED_ORG2_CA_PRIVATE_KEY \
	$MED_ORG3_CA_PRIVATE_KEY
do echo -e '\033[0;34m'$KEY'\033[0m'
done

docker-compose up -d \
	orderer.sharemed-ledger.io \
	ca.med-org1.sharemed-ledger.io \
	ca.med-org2.sharemed-ledger.io \
	ca.med-org3.sharemed-ledger.io \
	couchdb.med-org1.sharemed-ledger.io \
	couchdb.med-org2.sharemed-ledger.io \
	couchdb.med-org3.sharemed-ledger.io

sleep 2

docker-compose up -d \
	peer0.med-org1.sharemed-ledger.io \
	peer0.med-org2.sharemed-ledger.io \
	peer0.med-org3.sharemed-ledger.io

sleep 5

docker exec \
	-e "CORE_PEER_LOCALMSPID=MedOrg1MSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@med-org1.sharemed-ledger.io/msp" \
	peer0.med-org1.sharemed-ledger.io \
	peer channel create \
		-o orderer.sharemed-ledger.io:7050 \
		-c mainchannel \
		-f /etc/hyperledger/configtx/mainchannel.tx \
		--tls \
		--cafile /etc/hyperledger/fabric/tlsca.sharemed-ledger.io-cert.pem

docker exec \
	-e "CORE_PEER_LOCALMSPID=MedOrg1MSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@med-org1.sharemed-ledger.io/msp" \
	peer0.med-org1.sharemed-ledger.io \
	peer channel join -b mainchannel.block

docker cp \
	peer0.med-org1.sharemed-ledger.io:/opt/gopath/src/github.com/hyperledger/fabric/mainchannel.block \
	./config/mainchannel.block

for i in 2 3
do docker cp \
	./config/mainchannel.block \
	peer0.med-org${i}.sharemed-ledger.io:/opt/gopath/src/github.com/hyperledger/fabric/mainchannel.block
done

for i in 2 3
do docker exec \
	-e "CORE_PEER_LOCALMSPID=MedOrg${i}MSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@med-org${i}.sharemed-ledger.io/msp" \
	peer0.med-org${i}.sharemed-ledger.io \
	peer channel join -b mainchannel.block
done

sleep 5

docker-compose up -d \
	cli.med-org1.sharemed-ledger.io \
	cli.med-org2.sharemed-ledger.io \
	cli.med-org3.sharemed-ledger.io
