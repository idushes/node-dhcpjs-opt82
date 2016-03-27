var util = require('util');
var dhcpjs = require('./node-dhcpjs');
var server = dhcpjs.createServer();
var ip = require('ip');
var console = require('better-console');

var config = require('./config.json');

var mysql      = require('mysql');
var pool =  mysql.createPool({
    host     : config.mysql.host,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database
});





server.on('message', function(m,rinfo) {
    console.log(util.inspect(m, false, 3));
});

server.on('dhcpDiscover', function(m,rinfo) {
    console.log("--------------------------------------");
    console.log(getDate() + ' -> ' +  m.chaddr.address + ' dhcpDiscover');
    console.log(m);
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
    console.info('DHCP Server listening on ' + address);
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

// Получаем IP адресс -----------------------------------------------------------------------------
function getIP(opt82, cb) {
    var query = "";
    if ("mac" in opt82 && "vlan" in opt82 && "port" in opt82) {
        var segment = 'SELECT INET_NTOA(segment) FROM staff WHERE vg_id = ports.vg_id LIMIT 1';
        if (opt82.mac == config.snooping_host_mac) {
            // авторизация по vlan
            var vlan_id = 'SELECT record_id FROM vlans WHERE inner_vlan = '+opt82.vlan+' LIMIT 1';
            query = 'SELECT tmp_ip, ('+segment+') as ip FROM ports WHERE vlan_id = ('+vlan_id+') LIMIT 1;';
        } else {
            var shortMac = opt82.mac.replace(/:0/g,":");
            shortMac = shortMac.replace(/00/g,"0");
            // авторизация по связки vlan + порт + mac
            var device_id = 'SELECT device_id FROM devices_options WHERE name = "Agent-Remote-Id" AND ( value = "'+shortMac+'" OR value = "'+opt82.mac.toUpperCase()+'") LIMIT 1';
            var vlan_id_2 = 'SELECT record_id FROM vlans WHERE inner_vlan = '+opt82.vlan;
            query = 'SELECT tmp_ip,('+segment+') as ip FROM ports WHERE device_id = ('+device_id+') AND vlan_id = ('+vlan_id_2+') AND name = '+opt82.port+' LIMIT 1;';
        }
    } else if ("chaddr" in opt82 && "ciaddr" in opt82 && "xid" in opt82) {
        // Продление аренды по  mac + ip адресу
        query = "SELECT INET_NTOA(segment) as ip, (NULL) as tmp_ip FROM staff WHERE last_mac = x'"+opt82.chaddr.replace(/:/g,"")+"' " +
            "AND segment = INET_ATON('"+opt82.ciaddr+"') LIMIT 1";
    } else {
        console.error('option 82 is fail: ');
        console.error(opt82);
        cb(null);
        return;
    }
    var client = { ip: null, mask: null, gw: null, leaseTime: 0 };
    pool.query(query, function(err, rows, fields) {
        if (err) {
            cb(null);
            console.error('Error while performing Query. 12131');
        } else if (rows.length > 0 && rows[0].ip != null) {
            client.ip = String(rows[0].ip);
            client.mask = "255.255.254.0";
            client.gw = ip.subnet(client.ip, client.mask).firstAddress;
            client.leaseTime = 12000;
            cb(client);
            if (opt82.dhcpMessageType == "DHCPDISCOVER" && "chaddr" in opt82 && "xid" in opt82) {
                updateLastMac(client.ip,opt82.chaddr,opt82.xid);
            }
        } else if (rows.length > 0 && rows[0].ip == null && rows[0].tmp_ip != null) {
            client.ip = String(rows[0].tmp_ip);
            client.mask = "255.255.240.0";
            client.gw = ip.subnet(client.ip, client.mask).firstAddress;
            client.leaseTime = 60;
            cb(client);
            if (opt82.dhcpMessageType == "DHCPDISCOVER" && "chaddr" in opt82) {
                clearLastMac(opt82.chaddr);
            }
        } else {
            cb(null);
        }
    });
}


// отправляем пакет клиенту
function sendPacket(m,rinfo,dhcpMessageType) {
    var start = Date.now();
    var opt82 = getOpt82(m);
    console.log(opt82);
    getIP(opt82, function (client) {
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

// обновление в mysql последний mac авторизированного устройства
function updateLastMac(ip,mac,xid) {
    console.log('updateLastMac: '+mac+' ('+ip+')');
    var query = "UPDATE staff SET last_mac=NULL WHERE last_mac=x'"+mac.replace(/:/g,"")+"'; " +
        "UPDATE staff SET last_mac=x'"+mac.replace(/:/g,"")+"' WHERE segment = INET_ATON('"+ip+"') LIMIT 1;";
    pool.query(query);
}

// затираем старый мак при получении временного адреса
function clearLastMac(mac) {
    console.log('clearLastMac: '+mac);
    var query = "UPDATE staff SET last_mac=NULL WHERE last_mac=x'"+mac.replace(/:/g,"")+"'; ";
    pool.query(query);
}






















