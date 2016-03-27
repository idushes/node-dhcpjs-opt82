var util = require('util');
var dhcpjs = require('./lib');
var server = dhcpjs.createServer();
var console = require('better-console');
var billing = require('./lib/billing');
var config = require('./config.json');





server.on('message', function(m,rinfo) {
    console.log(util.inspect(m, false, 3));
});

server.on('dhcpDiscover', function(m,rinfo) {
    console.log("--------------------------------------");
    console.log(getDate() + ' -> ' +  m.chaddr.address + ' dhcpDiscover');
    console.log(m);
    var opt82 = getOpt82(m);
    billing.getIP(opt82, function (client) {
        
    });
    
    
    sendPacket(m,rinfo,dhcpjs.Protocol.DHCPMessageType.DHCPOFFER);
    // var start = Date.now();
    // var msec = Date.now() - start;
    // console.log(msec + " msec");

});



server.on('dhcpRequest', function(m,rinfo) {
    console.log("--------------------------------------");
    console.log(getDate() + ' -> ' +  m.chaddr.address + ' dhcpRequest');
    console.log(m);
    sendPacket(m,rinfo,dhcpjs.Protocol.DHCPMessageType.DHCPACK);
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
    sendPacket(m,rinfo,dhcpjs.Protocol.DHCPMessageType.DHCPACK);
});


// ------------------------------------------------------------------------------------------------

server.on('listening', function(address) {
    console.info(getDate() + ' DHCP Server listening on ' + address);
});
server.bind();
// Or to specify the port: (usefull for testing)
//server.bind(null,1067);


function getDate() {
    var date = new Date().toISOString();
    return date;
}

// формируем пакет dhcp по умолчанию --------------------------------------------------------------
function dhcpPktReply(client_message) {
    return {
        op: 0x02,               // reply
        htype: 0x01,
        hlen: 0x06,
        hops: client_message.hops,
        xid: client_message.xid,              // Уникальный идентификатор транзакции, генерируемый клиентом в начале процесса получения адреса.
        secs: 0x0000,
        flags: 0x0000,
        chaddr: client_message.chaddr.address,           // Аппаратный адрес
        //ciaddr: '0.0.0.0',
        yiaddr: '0.0.0.0',      // Новый IP-адрес клиента, предложенный сервером.
        siaddr: '91.221.49.48',      // IP-адрес сервера. Возвращается в предложении DHCP
        giaddr: client_message.giaddr,
        options: {
            dhcpMessageType: dhcpjs.Protocol.DHCPMessageType.DHCPACK,
            domainName: "home-nadym.ru",
            subnetMask: "255.255.254.0",
            routerOption: "195.191.220.1",
            ipAddressLeaseTime: 60,
            domainNameServerOption: config.dns_servers,
            ntpServers: ["195.191.221.65"],
            serverIdentifier: "91.221.49.48"     // ?????
        }
    }
}


// Разбираем option 82 на компоненты --------------------------------------------------------------
function getOpt82(m) {
    if ( m && m.options && m.xid && m.options.relayAgentInformation && m.options.relayAgentInformation.agentCircuitId && m.options.relayAgentInformation.agentRemoteId && m.options.dhcpMessageType) {
        if (m.options.relayAgentInformation.agentRemoteId.length > 12) {
            m.options.relayAgentInformation.agentRemoteId = m.options.relayAgentInformation.agentRemoteId.substr(4);
        }
        var mac = m.options.relayAgentInformation.agentRemoteId.substr(0);
        var vlan = "";
        var port = "";
        if (m.options.relayAgentInformation.agentCircuitId.length > 12) {
            vlan = m.options.relayAgentInformation.agentCircuitId.substr(4,4);
            port = m.options.relayAgentInformation.agentCircuitId.substr(12,4);
        } else {
            vlan = m.options.relayAgentInformation.agentCircuitId.substr(4,4);
            port = m.options.relayAgentInformation.agentCircuitId.substr(10,2);
        }
        return {
            mac: mac.match( /.{1,2}/g ).join( ':' ),
            vlan: parseInt(vlan, 16),
            port: parseInt(port, 16),
            dhcpMessageType: m.options.dhcpMessageType.name,
            chaddr: m.chaddr.address,
            xid: m.xid
        }
    } else if ( m && m.options && m.options.dhcpMessageType && m.options.dhcpMessageType.value == 3 && m.chaddr && m.chaddr.address && m.ciaddr && m.xid) {
        return { chaddr: m.chaddr.address, ciaddr: m.ciaddr, xid: m.xid }
    } else {
        return { }
    }
}


// отправляем пакет клиенту
function sendPacket(m,rinfo,dhcpMessageType) {
    var start = Date.now();
    var opt82 = getOpt82(m);
    console.log(opt82);
    billing.getIP(opt82, function (client) {
        console.log(client);
        if (client) {
            var pkt = dhcpPktReply(m);
            pkt.yiaddr = client.ip;
            pkt.options.dhcpMessageType = dhcpMessageType;
            pkt.options.subnetMask = client.mask;
            pkt.options.routerOption = client.gw;
            pkt.options.ipAddressLeaseTime = client.leaseTime;
            var offer = server.createPacket(pkt);
            server.sendPacket(offer, {host: rinfo.address, port: rinfo.port}, function() {
                console.log("Packet type "+dhcpMessageType+" sent");
                var msec = Date.now() - start;
                console.log(msec + " msec");
            });
        }
    });
}























