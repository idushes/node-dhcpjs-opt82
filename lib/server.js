// Copyright (c) 2011 Andrew Paprocki

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var dgram = require('dgram');
var parser = require('./parser');
var parser6 = require('./parser6');
var V4Address = require('ip-address').Address4;
var protocol = require('./protocol');

function Server(options) {
    if (options) {
        if (typeof(options) !== 'object')
            throw new TypeError('Server options must be an object');
    } else {
        options = {};
    }

    var self = this;
    EventEmitter.call(this, options);

    this.server6 = dgram.createSocket('udp6');

    this.server6.on('message', function(msg, rinfo) {
        console.log("--------------------------------------");
        var pkt = parser6.parse(msg);
        // TODO: нужно валидирвать состояние пакета
        switch (pkt.dhcpMessageType.value) {
            case protocol.DHCPv6MessageType.SOLICIT.value:
                self.emit('dhcpV6Solicit', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.ADVERTISE.value:
                self.emit('dhcpV6Advertise', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.REQUEST.value:
                self.emit('dhcpV6Request', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.CONFIRM.value:
                self.emit('dhcpV6Confirm', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.RENEW.value:
                self.emit('dhcpV6Renew', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.REBIND.value:
                self.emit('dhcpV6Rebind', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.REPLY.value:
                self.emit('dhcpV6Reply', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.RELEASE.value:
                self.emit('dhcpV6Release', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.DECLINE.value:
                self.emit('dhcpV6Decline', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.INFORMATION_REQUEST.value:
                self.emit('dhcpV6InformationRequest', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.RELAY_FORW.value:
                self.emit('dhcpV6RelayForward', pkt, rinfo);
                break;
            case protocol.DHCPv6MessageType.RELAY_REPL.value:
                self.emit('dhcpV6RelayReply', pkt, rinfo);
                break;
            default:
                assert(!'Server: received unhandled DHCPMessageType ' + pkt.options.dhcpMessageType.value);
        }
    });



    this.server = dgram.createSocket('udp4');

    this.server.on('message', function(msg, rinfo) {
        console.log("--------------------------------------");
        var pkt = parser.parse(msg);

        // TODO: нужно валидирвать состояние пакета

        switch (pkt.options.dhcpMessageType.value) {
            case protocol.DHCPMessageType.DHCPDISCOVER.value:
                self.emit('dhcpDiscover', pkt, rinfo);
                break;
            case protocol.DHCPMessageType.DHCPREQUEST.value:
                self.emit('dhcpRequest', pkt, rinfo);
                break;
            case protocol.DHCPMessageType.DHCPRELEASE.value:
                self.emit('dhcpRelease', pkt, rinfo);
                break;
            case protocol.DHCPMessageType.DHCPDECLINE.value:
                self.emit('dhcpDecline', pkt, rinfo);
                break;
            case protocol.DHCPMessageType.DHCPINFORM.value:
                self.emit('dhcpInform', pkt, rinfo);
                break;
            default:
                assert(!'Server: received unhandled DHCPMessageType ' + pkt.options.dhcpMessageType.value);
        }
    });

    this.server.on('listening', function() {
        var address = self.server.address();
        self.emit('listening', address.address + ':' + address.port);
    });

    this.server6.on('listening', function() {
        var address = self.server6.address();
        self.emit('listening', address.address + ':' + address.port);
    });

}



util.inherits(Server, EventEmitter);
module.exports = Server;

Server.prototype.bind = function(host,port) {
    var _this = this;
    if (!port) port = 67;
    this.server.bind(port, host, function() {
    	_this.server.setBroadcast(true);
    });
};

Server.prototype.bind6 = function(host,port) {
    var _this = this;
    if (!port) port = 547;
    this.server6.bind(547, host, function() {
        _this.server6.setBroadcast(true);
        _this.server6.addMembership('FF02::1:2');
    });
};


// Dushes




Server.prototype.sendPacket = function(pkt, options, cb) {
    var port = 68;    // Клиентский порт
    var host = '255.255.255.255';
    if (options) {
        if ('port' in options) port = options.port;
        if ('host' in options) host = options.host;
    }
    this.server.send(pkt, 0, pkt.length, port, host, cb);
};


Server.prototype.createPacket = function(pkt) {
    if (!('xid' in pkt))
        throw new Error('pkt.xid required');

    var ci = new Buffer(('ciaddr' in pkt) ?
        new V4Address(pkt.ciaddr).toArray() : [0, 0, 0, 0]);
    var yi = new Buffer(('yiaddr' in pkt) ?
        new V4Address(pkt.yiaddr).toArray() : [0, 0, 0, 0]);
    var si = new Buffer(('siaddr' in pkt) ?
        new V4Address(pkt.siaddr).toArray() : [0, 0, 0, 0]);
    var gi = new Buffer(('giaddr' in pkt) ?
        new V4Address(pkt.giaddr).toArray() : [0, 0, 0, 0]);

    if (!('chaddr' in pkt))
        throw new Error('pkt.chaddr required');
    var hw = new Buffer(pkt.chaddr.split(':').map(function(part) {
        return parseInt(part, 16);
    }));
    if (hw.length !== 6)
        throw new Error('pkt.chaddr malformed, only ' + hw.length + ' bytes');

    var p = new Buffer(1500);
    var i = 0;

    p.writeUInt8(pkt.op,    i++);
    p.writeUInt8(pkt.htype, i++);
    p.writeUInt8(pkt.hlen,  i++);
    p.writeUInt8(pkt.hops,  i++);
    p.writeUInt32BE(pkt.xid,   i); i += 4;
    p.writeUInt16BE(pkt.secs,  i); i += 2;
    p.writeUInt16BE(pkt.flags, i); i += 2;
    ci.copy(p, i); i += ci.length;
    yi.copy(p, i); i += yi.length;
    si.copy(p, i); i += si.length;
    gi.copy(p, i); i += gi.length;
    hw.copy(p, i); i += hw.length;
    p.fill(0, i, i + 10); i += 10; // hw address padding
    p.fill(0, i, i + 192); i += 192;
    p.writeUInt32BE(0x63825363, i); i += 4;  // Magic


    if (pkt.options && 'subnetMask' in pkt.options) {
        p.writeUInt8(1, i++); // option 1
        var subnetMask = new Buffer(  new V4Address(pkt.options.subnetMask).toArray() );
        p.writeUInt8(subnetMask.length, i++);
        subnetMask.copy(p, i); i += subnetMask.length;
    }
    if (pkt.options && 'routerOption' in pkt.options) {
        p.writeUInt8(3, i++); // option 3
        var routerOption = new Buffer(  new V4Address(pkt.options.routerOption).toArray() );
        p.writeUInt8(routerOption.length, i++);
        routerOption.copy(p, i); i += routerOption.length;
    }
    if (pkt.options && 'domainNameServerOption' in pkt.options) {
        p.writeUInt8(6, i++); // option 6
        var dns_array = [];
        pkt.options.domainNameServerOption.forEach(function(dns) {
            var dns_ip_array = new V4Address(dns).toArray();
            dns_ip_array.forEach(function(octet) {
                dns_array.push(octet);
            });
        });
        var domainNameServerOption = new Buffer( dns_array  );
        p.writeUInt8(domainNameServerOption.length, i++);
        domainNameServerOption.copy(p, i); i += domainNameServerOption.length;
    }
    if (pkt.options && 'ntpServers' in pkt.options) {
        p.writeUInt8(42, i++); // option 42
        var ntp_array = [];
        pkt.options.ntpServers.forEach(function(ntp) {
            var ntp_ip_array = new V4Address(ntp).toArray();
            ntp_ip_array.forEach(function(octet) {
                ntp_array.push(octet);
            });
        });
        var ntpServers = new Buffer( ntp_array  );
        p.writeUInt8(ntpServers.length, i++);
        ntpServers.copy(p, i); i += ntpServers.length;
    }
    if (pkt.options && 'requestedIpAddress' in pkt.options) {
        p.writeUInt8(50, i++); // option 50
        var requestedIpAddress = new Buffer(  new V4Address(pkt.options.requestedIpAddress).toArray() );
        p.writeUInt8(requestedIpAddress.length, i++);
        requestedIpAddress.copy(p, i); i += requestedIpAddress.length;
    }
    if (pkt.options && 'ipAddressLeaseTime' in pkt.options) {
        p.writeUInt8(51, i++); // option 51
        var ipAddressLeaseTime = new Buffer(4);
        ipAddressLeaseTime.writeUInt32BE(pkt.options.ipAddressLeaseTime, 0);
        p.writeUInt8(ipAddressLeaseTime.length, i++);
        ipAddressLeaseTime.copy(p, i); i += ipAddressLeaseTime.length;
    }
    if (pkt.options && 'dhcpMessageType' in pkt.options) {
        p.writeUInt8(53, i++); // option 53
        p.writeUInt8(1, i++);  // length
        p.writeUInt8(pkt.options.dhcpMessageType.value, i++);
    }
    if (pkt.options && 'serverIdentifier' in pkt.options) {
        p.writeUInt8(54, i++); // option 54
        var serverIdentifier = new Buffer(
            new V4Address(pkt.options.serverIdentifier).toArray());
        p.writeUInt8(serverIdentifier.length, i++);
        serverIdentifier.copy(p, i); i += serverIdentifier.length;
    }
    if (pkt.options && 'parameterRequestList' in pkt.options) {
        p.writeUInt8(55, i++); // option 55
        var parameterRequestList = new Buffer(pkt.options.parameterRequestList);
        if (parameterRequestList.length > 16)
            throw new Error('pkt.options.parameterRequestList malformed');
        p.writeUInt8(parameterRequestList.length, i++);
        parameterRequestList.copy(p, i); i += parameterRequestList.length;
    }
    if (pkt.options && 'clientIdentifier' in pkt.options) {
        var clientIdentifier = new Buffer(pkt.options.clientIdentifier);
        var optionLength = 1 + clientIdentifier.length;
        if (optionLength > 0xff)
            throw new Error('pkt.options.clientIdentifier malformed');
        p.writeUInt8(61, i++);           // option 61
        p.writeUInt8(optionLength, i++); // length
        p.writeUInt8(0, i++);            // hardware type 0
        clientIdentifier.copy(p, i); i += clientIdentifier.length;
    }
    if (pkt.options && 'domainName' in pkt.options) {
        p.writeUInt8(15, i++); // option 15
        var domainName = new Buffer( pkt.options.domainName );
        p.writeUInt8(domainName.length, i++);
        domainName.copy(p, i); i += domainName.length;
    }

    // option 255 - end
    p.writeUInt8(0xff, i++);
    // padding
    //if ((i % 2) > 0) {
    //    p.writeUInt8(0, i++);
    //} else {
    //    p.writeUInt16BE(0, i++);
    //}

    //var remaining = 340 - i;
    //if (remaining) {
    //    p.fill(0, i, i + remaining); i+= remaining;
    //}
    //console.log('createPacket:', i, 'bytes');
    return p.slice(0, i);
};


