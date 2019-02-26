#!/usr/bin/env bash

if [ -z "$1" ]
  then
    echo "Error!"
    echo ""
    echo "Usage: ./download-particl-core.sh <VERSION>"
    exit 1
fi

VERSION=$1

cd bins
if [ "$(uname)" == "Darwin" ]; then
    wget https://github.com/particl/particl-core/releases/download/v$VERSION/particl-$VERSION-osx64.tar.gz --output-document=particl-$VERSION-osx64.tar.gz
    tar zxvf particl-$VERSION-osx64.tar.gz
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    wget https://github.com/particl/particl-core/releases/download/v$VERSION/particl-$VERSION-x86_64-linux-gnu_nousb.tar.gz --output-document=particl-$VERSION-x86_64-linux-gnu_nousb.tar.gz
    tar zxvf particl-$VERSION-x86_64-linux-gnu_nousb.tar.gz
#elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ]; then
    # Do something under 32 bits Windows NT platform
#elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW64_NT" ]; then
    # Do something under 64 bits Windows NT platform
fi
cd ..

cp -rf bins/particl-$VERSION/bin/particld bins/particl-core/particld
cp -rf bins/particl-$VERSION/bin/particl-cli bins/particl-core/particl-cli
rm -rf bins/particl-$VERSION

bins/particl-core/particl-cli -version
bins/particl-core/particld -version

echo
echo
echo "DONE."
echo
