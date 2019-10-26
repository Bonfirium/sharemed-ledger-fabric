#!/bin/bash

set -ev

HLF_VERSION=1.4.3
CA_VERSION=1.4.3

ARCH=$(
	echo "$(uname -s|tr '[:upper:]' '[:lower:]'|sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')"
)
echo -e '\033[0;34m'$ARCH'\033[0m'

MARCH=$(uname -m)
echo -e '\033[0;34m'$MARCH'\033[0m'

HLF_DIST_URL=https://nexus.hyperledger.org/content/repositories/releases/org/hyperledger/fabric
BINARY_FILE=hyperledger-fabric-${ARCH}-${HLF_VERSION}.tar.gz
curl ${HLF_DIST_URL}/hyperledger-fabric/${ARCH}-${HLF_VERSION}/${BINARY_FILE} | tar -xzf - bin/

