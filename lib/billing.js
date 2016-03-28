// 2016 Andrew Boyko

var ip = require('ip');
var console = require('better-console');

var config = require('../config.json');

var mysql      = require('mysql');
var pool =  mysql.createPool({
    host     : config.mysql.host,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database
});

"use strict";

var billing = {};


billing.getIP = function (m, cb) {
    var query = "";
    if (m && m.opt82 && "mac" in m.opt82 && "vlan" in m.opt82 && "port" in m.opt82) {
        var segment = 'SELECT INET_NTOA(segment) FROM staff WHERE vg_id = ports.vg_id LIMIT 1';
        if (m.opt82.mac == config.snooping_host_mac) {
            // авторизация по vlan
            var vlan_id = 'SELECT record_id FROM vlans WHERE inner_vlan = '+m.opt82.vlan+' LIMIT 1';
            query = 'SELECT tmp_ip, ('+segment+') as ip FROM ports WHERE vlan_id = ('+vlan_id+') LIMIT 1;';
        } else {
            var shortMac = m.opt82.mac.replace(/:0/g,":");
            shortMac = shortMac.replace(/00/g,"0");
            // авторизация по связки vlan + порт + mac
            var device_id = 'SELECT device_id FROM devices_options WHERE name = "Agent-Remote-Id" AND ( value = "'+shortMac+'" OR value = "'+m.opt82.mac.toUpperCase()+'") LIMIT 1';
            var vlan_id_2 = 'SELECT record_id FROM vlans WHERE inner_vlan = '+m.opt82.vlan;
            query = 'SELECT tmp_ip,('+segment+') as ip FROM ports WHERE device_id = ('+device_id+') AND vlan_id = ('+vlan_id_2+') AND name = '+m.opt82.port+' LIMIT 1;';
        }
    } else if ("chaddr" in m && "address" in m.chaddr && ( "requestedIpAddress" in m.options || "ciaddr" in m)) {
        var client_ip = "1.1.1.1";
        if (m.ciaddr) {
            client_ip = m.ciaddr
        } else {
            client_ip = m.options.requestedIpAddress
        }
        // Продление аренды по  mac + ip адресу
        query = "SELECT INET_NTOA(segment) as ip, (NULL) as tmp_ip FROM staff WHERE last_mac = x'"+m.chaddr.address.replace(/:/g,"")+"' " +
            "AND segment = INET_ATON('"+client_ip+"') LIMIT 1";
    } else {
        console.error('option 82 is fail: ');
        console.error(m.opt82);
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
            client.leaseTime = 120;
            cb(client);
            if (m.options.dhcpMessageType == "DHCPDISCOVER" && "chaddr" in m) {
                billing.updateLastMac(client.ip,m.chaddr);
            }
        } else if (rows.length > 0 && rows[0].ip == null && rows[0].tmp_ip != null) {
            client.ip = String(rows[0].tmp_ip);
            client.mask = "255.255.240.0";
            client.gw = ip.subnet(client.ip, client.mask).firstAddress;
            client.leaseTime = 60;
            cb(client);
            if (m.dhcpMessageType == "DHCPDISCOVER" && "chaddr" in m) {
                billing.clearLastMac(m.chaddr);
            }
        } else {
            cb(null);
        }
    });
};

// обновление в mysql последний mac авторизированного устройства
billing.updateLastMac = function (ip,mac) {
    console.log('updateLastMac: '+mac+' ('+ip+')');
    var query = "UPDATE staff SET last_mac=NULL WHERE last_mac=x'"+mac.replace(/:/g,"")+"'; " +
        "UPDATE staff SET last_mac=x'"+mac.replace(/:/g,"")+"' WHERE segment = INET_ATON('"+ip+"') LIMIT 1;";
    pool.query(query);
};

// затираем старый мак при получении временного адреса
billing.clearLastMac = function (mac) {
    console.log('clearLastMac: '+mac);
    var query = "UPDATE staff SET last_mac=NULL WHERE last_mac=x'"+mac.replace(/:/g,"")+"'; ";
    pool.query(query);
};



module.exports = billing;