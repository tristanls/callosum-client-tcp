# callosum-client-tcp

_Stability: 1 - [Experimental](https://github.com/tristanls/stability-index#stability-1---experimental)_

[![NPM version](https://badge.fury.io/js/callosum-client-tcp.png)](http://npmjs.org/package/callosum-client-tcp)

TCP Client for [Callosum](https://github.com/tristanls/callosum): a self-balancing distributed services protocol.

## Usage

```javascript
var CallosumClient = require('callosum-client-tcp');
var callosumClient = new CallosumClient({MAX_SLOTS: 100});

callosumClient.on('error', function (error) {
    console.log(error);
});

// add a connection to the connection pool
// client will either hang on to the connection or close it if it is not needed
callosumClient.newConnection(slot, socket);

var socket = callosumClient.getConnection();
// socket is either a connection that is available or undefined

callosumClient.returnConnection(socket);
// return a previously leased connection to the client pool

```

## Tests

    npm test

## Overview

TCP Client for [Callosum](https://github.com/tristanls/callosum): a self-balancing distributed services protocol. It servers as a connection pool.

Open available connections are maintained internally via two heap data structures. The min heap data structure is maintained in order to provide a connection from the pool with the lowest slot value. The max heap data structure is maintained in order to enable rapid checking and replacing of a connection with a high slot value if a new connection with a lower slot value becomes available.

## Documentation

### CallosumClient

**Public API**

  * [new CallosumClient(\[options\])](#new-callosumclientoptions)
  * [callosumClient.getConnection()](#callosumclientgetconnection)
  * [callosumClient.newConnection(slot, socket)](#callosumclientnewconnectionslot-socket)
  * [callosumClient.returnConnection(socket)](#callosumclientreturnconnectionsocket)

### new CallosumClient([options])

  * `options`: _Object_ _(Default: {})_
    * `MAX_SLOTS`: _Integer_ _(Default: 100)_ Number of connection slots to
            maintain.

Creates a new instance of CallosumClient.

### callosumClient.getConnection()

  * Return: _Socket object_
    * `_destroyed`: _Boolean_ _**CAUTION: reserved for internal use**_
    * `_destroySocket`: _Function_ _**CAUTION: reserved for internal use**_
    * `_leased`: _Boolean_ _**CAUTION: reserved for internal use**_
    * `_slot`: _Integer_ _**CAUTION: reserved for internal use**_

Returns next available socket with lowest slot number. If no sockets are available, `undefined` is returned.

### callosumClient.insertSocket(slot, socket)

_**CAUTION: reserved for internal use**_

  * `slot`: _Integer_ Slot number.
  * `socket`: _Socket object_ Socket.

Internal bookkeeping of the socket via a min heap and a max heap with event listeners for socket destruction.

### callosumClient.newConnection(slot, socket)

  * `slot`: _Integer_ Slot number.
  * `socket`: _Socket object_ Socket.

New connection (from a rover) is available for the client to keep or discard.

### callosumClient.returnConnection(socket)

  * `socket`: _Socket object_
    * `_destroyed`: _Boolean_ _**CAUTION: reserved for internal use**_
    * `_destroySocket`: _Function_ _**CAUTION: reserved for internal use**_
    * `_leased`: _Boolean_ _**CAUTION: reserved for internal use**_
    * `_slot`: _Integer_ _**CAUTION: reserved for internal use**_

When the user of the `socket` is finished with it, instead of closing it, this method allows the `socket` to be handed back to Callosum.