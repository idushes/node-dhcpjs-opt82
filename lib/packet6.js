"use strict";

var packet6 = {};

packet6.createPacket = function (pkt) {
    var p = new Buffer(1500);
    var i = 0;

    p.writeInt8(pkt.dhcpMessageType.value,0);
    p.write(pkt.xid, 1, 3, 'hex');
    i = i + 4;

    if (pkt.options && "clientIdentifierOption" in pkt.options) {
        var iBuf = pkt.options.clientIdentifierOption.buffer;
        iBuf.copy(p,i,0,iBuf.length);
        i = i + iBuf.length;
    }

    if (pkt.options && "serverIdentifierOption" in pkt.options && "linkLayerAddress" in pkt.options.serverIdentifierOption) {
        p.writeInt16BE(2,i); i += 2;   // option type
        var hw = new Buffer(pkt.options.serverIdentifierOption.linkLayerAddress.split(':').map(function(part) {
            return parseInt(part, 16);
        }));
        p.writeInt16BE(hw.length+4,i); i += 2; // option length
        p.writeInt16BE(3,i); i += 2;    // DUID_type
        p.writeInt16BE(1,i); i += 2;    // hardwareType
        hw.copy(p, i);                 i += hw.length; //  link Layer Address


        //var sBuf = pkt.options.clientIdentifierOption.buffer;
        // iBuf.copy(p,i,0,iBuf.length);
        // i = i + iBuf.length;
    }


    return p.slice(0, i);
};


packet6.createPacketRelayReply = function (pkt,buf) {
    var p = new Buffer(1500);
    var i = 0;
    p.writeInt8(13,i); i += 1; // Relay-reply Message
    if (pkt && pkt.hop_count) {
        p.writeInt8(pkt.hop_count,i); i += 1;
    } else {
        p.writeInt8(0,i); i += 1;
    }
    if (pkt && pkt.link_address && pkt.peer_address) {
        var link_address =  pkt.link_address.replace(/:/g,"");
        var peer_address =  pkt.peer_address.replace(/:/g,"");
        p.write(link_address, i, link_address.length/2, 'hex'); i += link_address.length/2;
        p.write(peer_address, i, peer_address.length/2, 'hex'); i += peer_address.length/2;
    } else {
        throw new Error('link_address or peer_address is empty');
    }
    if (pkt && pkt.options && pkt.options.interfaceID) {
        var interfaceBuf = pkt.options.interfaceID.buffer;
        p.writeInt16BE(18,i);  i += 2;                                // code interfaceID
        p.writeInt16BE(interfaceBuf.length,i); i += 2;               // len
        interfaceBuf.copy(p,i);       i += interfaceBuf.length;       
    }
    if (buf) {
        p.writeInt16BE(9,i);  i += 2;               // code OPTION_RELAY_MSG
        p.writeInt16BE(buf.length,i); i += 2;       // len
        buf.copy(p,i);       i += buf.length;       // Relay Message option
    } else {
        throw new Error('MUST include a "Relay Message option"');
    }

    return p.slice(0, i);
};


module.exports = packet6;


// Advertise Message
//
// Clients MUST discard any received Advertise messages that meet any of the following conditions:
//
// +  the message does not include a Server Identifier option.
// +  the message does not include a Client Identifier option.
// +  the contents of the Client Identifier option does not match the client's DUID.
// +  the "transaction-id" field value does not match the value the client used in its Solicit message.
//
// Servers and relay agents MUST discard any received Advertise messages.