#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Bootstrap the test environment by running:
python3 particl-test-env.py

particld version 0.17.x (if 0.17, re-enable [regtest] in writeConfig)

Copyright & credits go to tecnovert.
"""

import os
import shutil
import shlex
import subprocess
import time
import decimal
import sys
import json
import hashlib
import threading
import re
import traceback
import signal


def toBool(s):
    return s.lower() in ["1", "true"]

PARTICL_BINDIR = os.path.expanduser(os.getenv("PARTICL_BINDIR", "./bins/particl-core"))
PARTICLD = os.getenv("PARTICLD", "particld")
PARTICL_CLI = os.getenv("PARTICL_CLI", "particl-cli")
PARTICL_TX = os.getenv("PARTICL_TX", "particl-tx")
RESET_DATA = toBool(os.getenv("RESET_DATA", "True"))
DEBUG_MODE = toBool(os.getenv("DEBUG_MODE", "True"))

NUM_NODES = 3

DATADIRS = './tmp/particl'

BASE_PORT = 14792
BASE_RPC_PORT = 19792

mxLog = threading.Lock()

def getIndexAtProperty(arr, name, value):
    for i, o in enumerate(arr):
        try:
            if o[name] == value:
                return i
        except:
            continue
    return -1


def jsonDecimal(obj):
    if isinstance(obj, decimal.Decimal):
        return str(obj)
    raise TypeError


def dumpj(jin):
    return json.dumps(jin, indent=4, default=jsonDecimal)

def dumpje(jin):
    return json.dumps(jin, default=jsonDecimal).replace('"', '\\"')


def writeConfig(datadir, nodeId, rpcPort, port):
    filePath = os.path.join(datadir, str(nodeId) + '/particl.conf')

    if os.path.exists(filePath):
        return

    with open(filePath, 'w+') as fp:
        fp.write('regtest=1\n')

        fp.write('[regtest]\n') # > 0.16 only
        fp.write('port=' + str(port) + "\n")
        fp.write('rpcport=' + str(rpcPort) + "\n")
        fp.write('rpcuser=rpcuser' + str(nodeId) + "\n")
        fp.write('rpcpassword=rpcpass' + str(nodeId) + "\n")
        fp.write('daemon=1\n')
        fp.write('server=1\n')
        fp.write('discover=0\n')
        fp.write('listenonion=0\n')
        fp.write('bind=127.0.0.1\n')
        fp.write('findpeers=0\n')

        if DEBUG_MODE:
            fp.write('debug=1\n')

        fp.write('debugexclude=libevent\n')
        fp.write('displaylocaltime=1\n')
        fp.write('acceptnonstdtxn=0\n')
        fp.write('minstakeinterval=10\n')

        for i in range(0, NUM_NODES):
            if nodeId == i:
                continue
            fp.write('addnode=127.0.0.1:%d\n' % (BASE_PORT + i))


def prepareDir(datadir, nodeId):
    nodeDir = os.path.join(datadir, str(nodeId))

    if not os.path.exists(nodeDir):
        os.makedirs(nodeDir)

    writeConfig(datadir, nodeId, BASE_RPC_PORT + nodeId, BASE_PORT + nodeId)


def logd(fp, s):
    mxLog.acquire()
    try:
        print(s)
        fp.write(time.strftime("%y-%m-%d_%H-%M-%S", time.localtime()) + "\n" + s + "\n")
        fp.flush()
    finally:
        mxLog.release()


logsep = "------------------------------------------------------------------------------"
def logc(fp, s):
    mxLog.acquire()
    try:
        print(s)
        fp.write('/*'+logsep + "\n    " + s + "\n" + logsep + "*/\n")
        fp.flush()
    finally:
        mxLog.release()


def loge(fp, s, tag=''):
    mxLog.acquire()
    try:
        print(s)
        fp.write(tag + s + "\n")
        fp.flush()
    finally:
        mxLog.release()


def callrpc3(nodeId, bindir, cmd):
    nodeDir = os.path.join(DATADIRS, str(nodeId))
    logd(fpHandle, nodeDir)
    command_cli = os.path.join(bindir, PARTICL_CLI)
    args = command_cli + ' -datadir=' + nodeDir + ' ' + cmd
    logd(fpHandle, args)
    p = subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    out = p.communicate()

    if len(out[1]) > 0:
        print('error ', out[1])
    return [out[0], out[1]]


def callrpc2(nodeId, fp, bindir, cmd):
    logd(fp, str(nodeId) + ' - ' + cmd)

    r, re = callrpc3(nodeId, bindir, cmd)
    if re and len(re) > 0:
        fp.write("Error " + str(re) + "\n")
    elif r is None:
        fp.write("None\n")
    else:
        try:
            ro = json.loads(r)
            fp.write(json.dumps(ro, indent=4, default=jsonDecimal) + "\n")
            r = ro
        except:
            r = r.decode('utf-8').strip()
            fp.write(str(r) + "\n")
    fp.write("\n")
    fp.flush()
    return r


def callrpc(nodeId, fp, cmd):
    return callrpc2(nodeId, fp, PARTICL_BINDIR, cmd)


def calltx2(bindir, cmd):
    print("cmd ", cmd)
    command_cli = os.path.join(bindir, PARTICL_TX)
    args = command_cli + ' ' + cmd
    p = subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    out = p.communicate()

    if len(out[1]) > 0:
        print('error ', out[1])
    return [out[0], out[1]]


def calltx(fp, cmd):
    logd(fp, PARTICL_TX + cmd)

    r, re = calltx2(PARTICL_BINDIR, cmd)
    if re and len(re) > 0:
        fp.write("Error " + str(re) + "\n")
    elif r is None:
        fp.write("None\n")
    else:
        try:
            ro = json.loads(r)
            fp.write(json.dumps(ro, indent=4, default=jsonDecimal) + "\n")
        except:
            r = r.decode('utf-8').strip()
            fp.write(str(r) + "\n")
    fp.write("\n")
    fp.flush()
    return r


def startDaemon(nodeId, fp, bindir):
    nodeDir = os.path.join(DATADIRS, str(nodeId))
    command_cli = os.path.join(bindir, PARTICLD)
    args = [command_cli, "-datadir="+nodeDir]

    logd(fp, PARTICLD + ' '+"-datadir="+nodeDir+"\n")

    p = subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out = [p.stdout.read(), p.stderr.read()]

    if len(out[1]) > 0:
        print("error ", out[1])
    return [out[0], out[1], p]

def startNodes(fp, resetData):

    if resetData:
        for i in range(NUM_NODES):
            dirname = os.path.join(DATADIRS, str(i))
            if os.path.isdir(dirname):
                loge(fp, 'Removing' + dirname)
                shutil.rmtree(dirname)

    loge(fp, '')
    logc(fp, 'Prepare the network')

    global processes
    processes = []
    for i in range(NUM_NODES):
        prepareDir(DATADIRS, i)

        processes.append(startDaemon(i, fp, PARTICL_BINDIR)[2])
        logc(fp, 'Process launched, checking')
        # wait until responding
        for k in range(5):
            time.sleep(1)
            try:
                logc(fp, 'Trying getnetwork info!')
                r = callrpc3(i, PARTICL_BINDIR, 'getnetworkinfo')
                if len(r[1]) > 0:
                    raise ValueError('rpc error.')
            except:
                continue
            break

        callrpc(i, fp, 'walletsettings stakingoptions "{\\"stakecombinethreshold\\":\\"100\\",\\"stakesplitthreshold\\":200}"')
        callrpc(i, fp, 'reservebalance true 1000')


    callrpc(0, fp, 'extkeygenesisimport "abandon baby cabbage dad eager fabric gadget habit ice kangaroo lab absorb"')
    callrpc(1, fp, 'extkeygenesisimport "pact mammal barrel matrix local final lecture chunk wasp survey bid various book strong spread fall ozone daring like topple door fatigue limb olympic" "" true')

    callrpc(2, fp, 'extkeygenesisimport "てつづき　いくぶん　ちょさくけん　たんご　でんち　おじぎ　てくび　やっぱり　たんさん　むろん　いちりゅう　たりょう"')
    """
    callrpc(3, fp, 'extkeygenesisimport "面 闷 摄 旁 鸭 障 晚 偷 奔 凉 仰 树 铝 必 企 莫 理 飞 精 乎 合 互 江 巧" "江巧"')
    callrpc(4, fp, 'extkeygenesisimport "matar misa bambú vinagre abierto faja válido lista saber jugo dulce perico"')
    """


    for i in range(2):
        callrpc(0, fp, 'sendtoaddress "pdYHpMumE3JfEyhLhxi9qmua1aDEJXzWv5" 100')
    
    callrpc(0, fp, 'getnewstealthaddress') # TetXU1bNXEn4obs3iaDt5uup4gXz1XCwgButPoDZFcxkv7nD6S6o6vkqDNDQMmGz2MC9BMy4r3QrRKSb4RgzKQi2HSG1rYuBXSYc8A
    callrpc(1, fp, 'getnewstealthaddress') # TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt

    # Mixin inputs
    callrpc(0, fp, 'sendtypeto part anon "[{\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":0.005}, {\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":0.005}, {\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":0.005}, {\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":0.005},{\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":0.005},{\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":0.005}]"')
    
    callrpc(0, fp, 'sendtypeto part anon "[{\\"address\\":\\"TetXU1bNXEn4obs3iaDt5uup4gXz1XCwgButPoDZFcxkv7nD6S6o6vkqDNDQMmGz2MC9BMy4r3QrRKSb4RgzKQi2HSG1rYuBXSYc8A\\",\\"amount\\":20},{\\"address\\":\\"TetXU1bNXEn4obs3iaDt5uup4gXz1XCwgButPoDZFcxkv7nD6S6o6vkqDNDQMmGz2MC9BMy4r3QrRKSb4RgzKQi2HSG1rYuBXSYc8A\\",\\"amount\\":20},{\\"address\\":\\"TetXU1bNXEn4obs3iaDt5uup4gXz1XCwgButPoDZFcxkv7nD6S6o6vkqDNDQMmGz2MC9BMy4r3QrRKSb4RgzKQi2HSG1rYuBXSYc8A\\",\\"amount\\":20}, {\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":20}, {\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":20}, {\\"address\\":\\"TetbX4FkzdAFp1jSgo8jBr7DbRbA8fevy2Xhobhzr8iH171UPjYjmxBKdztpTPspccEKiAyK4u5vXcAtSFWbYb98RTGUxTVjF5qAZt\\",\\"amount\\":20}]"')

def exitNodes(sig, frame):
    loge(fpHandle, 'Stopping nodes.')
    for i in range(NUM_NODES):
        if processes[i] is not None:
            callrpc(i, fpHandle, 'stop')

    # wait until stopped
    for i in range(NUM_NODES):
        if processes[i] is not None:
            for i in range(2000):
                if i > 1000:
                    logd(fp, 'Error: Node %d not stopping.' % (i))
                    break
                return_code = processes[i].poll()
                if return_code is None:
                    continue
                break

    print('You pressed Ctrl+C!')
    sys.exit(0)

def main():
    if not os.path.exists(DATADIRS):
        os.makedirs(DATADIRS)
    with open(os.path.join(DATADIRS,'test-log.txt'), 'w') as fp:
        """
        Make a global fpHandle for the sigint
        """
        global fpHandle
        fpHandle = fp
        signal.signal(signal.SIGINT, exitNodes)
        logd(fp, os.path.basename(sys.argv[0]) + "\n\n")
        startNodes(fp, RESET_DATA)
        while 1:
            cmd = input("command> ")
            rpcCmd = cmd.split(' ', maxsplit=1)
            try:
                prevout = callrpc(int(rpcCmd[0]), fp, str(rpcCmd[1]))
                logc(fp, prevout)
            except:
                logc(fp, "Meh it broke :(")
        input("Press Ctrl+C to stop the nodes...")

    print('Done.')

if __name__ == '__main__':
    main()


