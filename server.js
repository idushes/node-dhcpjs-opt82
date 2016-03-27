var util = require('util');
var dhcpjs = require('./lib');
var server = dhcpjs.createServer();
var console = require('better-console');
var billing = require('./lib/billing');
var config = require('./config.json');




server.on('dhcpDiscover', function(m,rinfo) {
    console.log("--------------------------------------");
    console.log(getDate() + ' -> ' +  m.chaddr.address + ' dhcpDiscover');
    console.log(m);
    if (m && m.opt82) {
        billing.getIP(m, function (client) {
            if (client) {
                console.log(client);
                var message = defaultPktReply(m,client);
                message.options.dhcpMessageType = dhcpjs.Protocol.DHCPMessageType.DHCPOFFER;
                server.sendPacket(bufOffer, {host: rinfo.address, port: rinfo.port}, function () {
                    console.log("Offer sent");
                });
            }
        });
    }

});



server.on('dhcpRequest', function(m,rinfo) {
    console.log("--------------------------------------");
    console.log(getDate() + ' -> ' +  m.chaddr.address + ' dhcpRequest');
    console.log(m);

    if (m && ( m.opt82 || m.options.requestedIpAddress )) {
        billing.getIP(m, function (client) {
            if (client && client.ip == m.options.requestedIpAddress) {
                console.log(client);
                var message = defaultPktReply(m,client);
                var bufAck = server.createPacket(message);
                server.sendPacket(bufAck, {host: rinfo.address, port: rinfo.port}, function () {
                    console.log("ACK sent");
                });
            } else {
                var nak_client = { ip: "0.0.0.0", mask: "255.255.255.255", gw: "0.0.0.0", leaseTime: 60 };
                var nak_message = defaultPktReply(m,nak_client);
                nak_message.options.dhcpMessageType = dhcpjs.Protocol.DHCPMessageType.DHCPNAK;
                var bufNak = server.createPacket(nak_message);
                server.sendPacket(bufNak, {host: rinfo.address, port: rinfo.port}, function () {
                    console.log("NAK sent (client.ip != m.options.requestedIpAddress)");
                });
            }
        });
    } else {
        var nak_client = { ip: "0.0.0.0", mask: "255.255.255.255", gw: "0.0.0.0", leaseTime: 60 };
        var nak_message = defaultPktReply(m,nak_client);
        nak_message.options.dhcpMessageType = dhcpjs.Protocol.DHCPMessageType.DHCPNAK;
        var bufNak = server.createPacket(nak_message);
        server.sendPacket(bufNak, {host: rinfo.address, port: rinfo.port}, function () {
            console.log("NAK sent");
        });
    }
});

server.on('dhcpRelease', function(m,rinfo) {
    console.log("--------------------------------------");
    console.log(getDate() + ' -> ' +  m.chaddr.address + " dhcpRelease");
    console.log(m);
});

server.on('dhcpDecline', function(m,rinfo) {
    console.log("--------------------------------------");
    console.log(getDate() + ' -> ' +  m.chaddr.address + " dhcpDecline");
    console.log(m);
});

server.on('dhcpInform', function(m,rinfo) {
    console.log("--------------------------------------");
    console.log(getDate() + ' -> ' +  m.chaddr.address + " dhcpInform");
    console.log(m);
    billing.getIP(m, function (client) {
        if (client) {
            var message = defaultPktReply(m,client);
            var bufAck = server.createPacket(message);
            server.sendPacket(bufAck, {host: rinfo.address, port: rinfo.port}, function () {
                console.log("ACK sent");
            });
        }
    });
});


// ------------------------------------------------------------------------------------------------

server.on('listening', function(address) {
    console.info(getDate() + ' DHCP Server listening on ' + address);
});
server.bind();
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





















