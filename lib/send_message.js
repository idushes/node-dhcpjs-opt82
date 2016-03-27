var config = require('../config.json');
var Protocol = require('./protocol');


module.exports = function (client,m,server) {
    if (client && m && dhcpMessageType) {
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
};  


// формируем пакет dhcp по умолчанию --------------------------------------------------------------
function dhcpPktReply(m) {
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
        yiaddr: '0.0.0.0',      // Новый IP-адрес клиента, предложенный сервером.
        siaddr: '91.221.49.48',      // IP-адрес сервера. Возвращается в предложении DHCP
        giaddr: m.giaddr,
        options: {
            dhcpMessageType: Protocol.DHCPMessageType.DHCPACK,
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
