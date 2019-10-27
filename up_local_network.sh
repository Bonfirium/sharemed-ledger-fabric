#!/bin/bash
set -ev

export CHAINCODE_ID=sharemedchaincode
export COMPOSE_PROJECT_NAME=fabric

DOCKER_CONTAINERS_TO_RM=$(docker ps -a | grep .sharemed-ledger.io | awk '{print $1}')
if [ ! -z "$DOCKER_CONTAINERS_TO_RM" ]
then docker rm -f $DOCKER_CONTAINERS_TO_RM
fi

DOCKER_IMAGES_TO_RM=$(docker images -a | grep .sharemed-ledger.io | awk '{print $3}')
if [ ! -z "$DOCKER_IMAGES_TO_RM" ]
then docker rmi -f $DOCKER_IMAGES_TO_RM
fi

export AUTH_ORG_CA_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/auth-org.sharemed-ledger.io/ca && ls *_sk)
export MED_ORG1_CA_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/med-org1.sharemed-ledger.io/ca && ls *_sk)
export MED_ORG2_CA_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/med-org2.sharemed-ledger.io/ca && ls *_sk)
export MED_ORG3_CA_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/med-org3.sharemed-ledger.io/ca && ls *_sk)

for KEY in \
	$AUTH_ORG_CA_PRIVATE_KEY \
	$MED_ORG1_CA_PRIVATE_KEY \
	$MED_ORG2_CA_PRIVATE_KEY \
	$MED_ORG3_CA_PRIVATE_KEY
do echo -e '\033[0;34m'$KEY'\033[0m'
done

docker-compose up -d \
	orderer.sharemed-ledger.io \
	ca.auth-org.sharemed-ledger.io \
	ca.med-org1.sharemed-ledger.io \
	ca.med-org2.sharemed-ledger.io \
	ca.med-org3.sharemed-ledger.io \
	couchdb.auth-org.sharemed-ledger.io \
	couchdb.med-org1.sharemed-ledger.io \
	couchdb.med-org2.sharemed-ledger.io \
	couchdb.med-org3.sharemed-ledger.io

sleep 2

docker-compose up -d \
	peer0.auth-org.sharemed-ledger.io \
	peer0.med-org1.sharemed-ledger.io \
	peer0.med-org2.sharemed-ledger.io \
	peer0.med-org3.sharemed-ledger.io

sleep 5

docker exec \
	-e "CORE_PEER_LOCALMSPID=AuthOrgMSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@auth-org.sharemed-ledger.io/msp" \
	peer0.auth-org.sharemed-ledger.io \
	peer channel create \
		-o orderer.sharemed-ledger.io:7050 \
		-c mainchannel \
		-f /etc/hyperledger/configtx/mainchannel.tx \
		--tls \
		--cafile /etc/hyperledger/fabric/tlsca.sharemed-ledger.io-cert.pem

docker exec \
	-e "CORE_PEER_LOCALMSPID=AuthOrgMSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@auth-org.sharemed-ledger.io/msp" \
	peer0.auth-org.sharemed-ledger.io \
	peer channel join -b mainchannel.block

docker cp \
	peer0.auth-org.sharemed-ledger.io:/opt/gopath/src/github.com/hyperledger/fabric/mainchannel.block \
	./config/mainchannel.block

for i in 1 2 3
do docker cp \
	./config/mainchannel.block \
	peer0.med-org${i}.sharemed-ledger.io:/opt/gopath/src/github.com/hyperledger/fabric/mainchannel.block
done

for i in 1 2 3
do docker exec \
	-e "CORE_PEER_LOCALMSPID=MedOrg${i}MSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@med-org${i}.sharemed-ledger.io/msp" \
	peer0.med-org${i}.sharemed-ledger.io \
	peer channel join -b mainchannel.block
done

sleep 5

docker-compose up -d \
	cli.auth-org.sharemed-ledger.io \
	cli.med-org1.sharemed-ledger.io \
	cli.med-org2.sharemed-ledger.io \
	cli.med-org3.sharemed-ledger.io

pushd ./chaincode && npm install --silent && npm run build && popd

docker exec \
	-e "CORE_PEER_LOCALMSPID=AuthOrgMSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/auth-org.sharemed-ledger.io/users/Admin@auth-org.sharemed-ledger.io/msp" \
	cli.auth-org.sharemed-ledger.io \
	peer chaincode install -n $CHAINCODE_ID -v 0.1.0 -p "/opt/chaincode" -l node

for i in 1 2 3
do docker exec \
	-e "CORE_PEER_LOCALMSPID=MedOrg${i}MSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/med-org${i}.sharemed-ledger.io/users/Admin@med-org${i}.sharemed-ledger.io/msp" \
	cli.med-org${i}.sharemed-ledger.io \
	peer chaincode install -n $CHAINCODE_ID -v 0.1.0 -p "/opt/chaincode" -l node
done

docker exec \
	-e "CORE_PEER_LOCALMSPID=AuthOrgMSP" \
	-e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/auth-org.sharemed-ledger.io/users/Admin@auth-org.sharemed-ledger.io/msp" \
	cli.auth-org.sharemed-ledger.io \
	peer chaincode instantiate \
		-o orderer.sharemed-ledger.io:7050 \
		-C mainchannel \
		-n $CHAINCODE_ID \
		-l node \
		-v 0.1.0 \
		-c '{"Args":[]}' \
		-P "OR('AuthOrgMSP.member', 'MedOrg1MSP.member', 'MedOrg2MSP.member', 'MedOrg3MSP.member')" \
		--tls \
		--cafile "/etc/hyperledger/fabric/tlsca.sharemed-ledger.io-cert.pem"

