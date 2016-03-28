"use strict";

var util = require('util');
var dhcpjs = require('./lib');
var console = require('better-console');
var billing = require('./lib/billing');
var packet6 = require('./lib/packet6');
var config = require('./config.json');


var server = dhcpjs.createServer();


// ------------------------------------------------------------------------------------------------

server.on('dhcpV6RelayForward', function(m,rinfo) {
    console.log(getDate() + '  ' + rinfo.address + ' ->  dhcpV6RelayForward');
    console.log(m);
    console.log(rinfo);
    console.log(m.options.dhcpRelayMessage);
    if (m.options.dhcpRelayMessage) {
        var message = m.options.dhcpRelayMessage;
        console.log('*');
        console.log(message);
        var pkt = {
            xid: message.xid,
            dhcpMessageType: dhcpjs.Protocol.DHCPv6MessageType.ADVERTISE,
            options: {
                clientIdentifierOption: message.options.clientIdentifierOption,
                serverIdentifierOption: { linkLayerAddress: "de:b2:0d:14:03:2c" }
            }
        };
        var buf = packet6.createPacket(pkt);
        var bufRelay = packet6.createPacketRelayReply(m,buf);
        console.warn(bufRelay);


        server.sendPacket6(bufRelay, {host: rinfo.address, port: rinfo.port}, function () {
            console.info("RELAY_REPL (ADVERTISE) sent");
        });
        server.sendPacket6(buf, {host: rinfo.address, port: rinfo.port}, function () {
            console.info("ADVERTISE sent");
        });
    }


});

server.on('dhcpV6Renew', function(m,rinfo) {
    console.log(getDate() + '  ' + rinfo.address +' ->  dhcpV6Renew');
    console.log(m);
    var pkt = {
        xid: m.xid,
        dhcpMessageType: dhcpjs.Protocol.DHCPv6MessageType.ADVERTISE,
        options: {
            clientIdentifierOption: m.options.clientIdentifierOption,
            serverIdentifierOption: { linkLayerAddress: "de:b2:0d:14:03:2c" }
        }

    };
    var buf = packet6.createPacket(pkt);
    console.warn(buf);
    // server.sendPacket6(buf, {host: rinfo.address, port: rinfo.port}, function () {
    //     console.info("ADVERTISE sent");
    // });

});


// ------------------------------------------------------------------------------------------------

server.on('listening', function(address) {
    console.info(getDate() + ' DHCP Server listening on ' + address);
});

server.bind6();
// Or to specify the port: (usefull for testing)
//server.bind(null,1067);


function getDate() {
    return new Date().toISOString();
}


// формируем пакет dhcp по умолчанию --------------------------------------------------------------
function defaultPktReply(m,client) {
    return {
        op: 0x02,               // reply
        htype: 0x01,
        hlen: 0x06,
        hops: m.hops,
        xid: m.xid,              // Уникальный идентификатор транзакции, генерируемый клиентом в начале процесса получения адреса.
        secs: 0x0000,
        flags: 0x0000,
        chaddr: m.chaddr.address,           // Аппаратный адрес
        //ciaddr: '0.0.0.0',
        yiaddr: client.ip,      // Новый IP-адрес клиента, предложенный сервером.
        siaddr: config.siaddr,      // IP-адрес сервера. Возвращается в предложении DHCP
        giaddr: m.giaddr,
        options: {
            dhcpMessageType: dhcpjs.Protocol.DHCPMessageType.DHCPACK,
            domainName: config.domainName,
            subnetMask: client.mask,
            routerOption: client.gw,
            ipAddressLeaseTime: client.leaseTime,
            domainNameServerOption: config.dns_servers,
            ntpServers: config.ntpServers,
            serverIdentifier: config.serverIdentifier     // ?????
        }
    }
}





















