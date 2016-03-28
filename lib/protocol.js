// Copyright (c) 2011 Andrew Paprocki

var createEnum = function(v, n) {
    function Enum(value, name) {
        this.value = value;
        this.name = name;
    }
    Enum.prototype.toString = function() { return this.name; };
    Enum.prototype.valueOf = function() { return this.value; };
    return Object.freeze(new Enum(v, n));
}

var createHardwareAddress = function(t, a) {
    return Object.freeze({ type: t, address: a });
}

module.exports = {
    createHardwareAddress: createHardwareAddress,

    BOOTPMessageType: Object.freeze({
        BOOTPREQUEST: createEnum(1, 'BOOTPREQUEST'),
        BOOTPREPLY: createEnum(2, 'BOOTPREPLY'),
        get: function(value) {
            for (key in this) {
                var obj = this[key];
                if (obj == value)
                    return obj;
            }
            return undefined;
        }
    }),

    // rfc1700 hardware types
    ARPHardwareType: Object.freeze({
        HW_ETHERNET: createEnum(1, 'HW_ETHERNET'),
        HW_EXPERIMENTAL_ETHERNET: createEnum(2, 'HW_EXPERIMENTAL_ETHERNET'),
        HW_AMATEUR_RADIO_AX_25: createEnum(3, 'HW_AMATEUR_RADIO_AX_25'),
        HW_PROTEON_TOKEN_RING: createEnum(4, 'HW_PROTEON_TOKEN_RING'),
        HW_CHAOS: createEnum(5, 'HW_CHAOS'),
        HW_IEEE_802_NETWORKS: createEnum(6, 'HW_IEEE_802_NETWORKS'),
        HW_ARCNET: createEnum(7, 'HW_ARCNET'),
        HW_HYPERCHANNEL: createEnum(8, 'HW_HYPERCHANNEL'),
        HW_LANSTAR: createEnum(9, 'HW_LANSTAR'),
        get: function(value) {
            for (key in this) {
                var obj = this[key];
                if (obj == value)
                    return obj;
            }
            return undefined;
        }
    }),

    // rfc1533 code 53 dhcpMessageType
    DHCPMessageType: Object.freeze({
        DHCPDISCOVER: createEnum(1, 'DHCPDISCOVER'),
        DHCPOFFER: createEnum(2, 'DHCPOFFER'),
        DHCPREQUEST: createEnum(3, 'DHCPREQUEST'),
        DHCPDECLINE: createEnum(4, 'DHCPDECLINE'),
        DHCPACK: createEnum(5, 'DHCPACK'),
        DHCPNAK: createEnum(6, 'DHCPNAK'),
        DHCPRELEASE: createEnum(7, 'DHCPRELEASE'),
        DHCPINFORM: createEnum(8, 'DHCPINFORM'),
        get: function(value) {
            for (key in this) {
                var obj = this[key];
                if (obj == value)
                    return obj;
            }
            return undefined;
        }
    }),

    // rfc3315 dhcpMessageType
    DHCPv6MessageType: Object.freeze({
        SOLICIT: createEnum(1, 'SOLICIT'),
        ADVERTISE: createEnum(2, 'ADVERTISE'),
        REQUEST: createEnum(3, 'REQUEST'),
        CONFIRM: createEnum(4, 'CONFIRM'),
        RENEW: createEnum(5, 'RENEW'),
        REBIND: createEnum(6, 'REBIND'),
        REPLY: createEnum(7, 'REPLY'),
        RELEASE: createEnum(8, 'RELEASE'),
        DECLINE: createEnum(9, 'DECLINE'),
        RECONFIGURE: createEnum(10, 'RECONFIGURE'),
        INFORMATION_REQUEST: createEnum(11, 'INFORMATION_REQUEST'),
        RELAY_FORW: createEnum(12, 'RELAY_FORW'),
        RELAY_REPL: createEnum(13, 'RELAY_REPL'),
        get: function(value) {
            for (key in this) {
                var obj = this[key];
                if (obj == value)
                    return obj;
            }
            return undefined;
        }
    }),

    // rfc3315
    DHCPv6OptionsCode: Object.freeze({
        CLIENTID: createEnum(1, 'CLIENTID'),
        SERVERID: createEnum(2, 'SERVERID'),
        IA_NA: createEnum(3, 'IA_NA'),
        IA_TA: createEnum(4, 'IA_TA'),
        IAADDR: createEnum(5, 'IAADDR'),
        ORO: createEnum(6, 'ORO'),
        PREFERENCE: createEnum(7, 'PREFERENCE'),
        ELAPSED_TIME: createEnum(8, 'ELAPSED_TIME'),
        RELAY_MSG: createEnum(9, 'RELAY_MSG'),
        AUTH: createEnum(11, 'AUTH'),
        UNICAST: createEnum(12, 'UNICAST'),
        STATUS_CODE: createEnum(13, 'STATUS_CODE'),
        RAPID_COMMIT: createEnum(14, 'RAPID_COMMIT'),
        USER_CLASS: createEnum(15, 'USER_CLASS'),
        VENDOR_CLASS: createEnum(16, 'VENDOR_CLASS'),
        VENDOR_OPTS: createEnum(17, 'VENDOR_OPTS'),
        INTERFACE_ID: createEnum(18, 'INTERFACE_ID'),
        RECONF_MSG: createEnum(19, 'RECONF_MSG'),
        RECONF_ACCEPT: createEnum(20, 'RECONF_ACCEPT'),
        SIP_SERVER_D: createEnum(21, 'SIP_SERVER_D'),
        SIP_SERVER_A: createEnum(22, 'SIP_SERVER_A'),
        DNS_SERVERS: createEnum(23, 'DNS_SERVERS'),
        DOMAIN_LIST: createEnum(24, 'DOMAIN_LIST'),
        IA_PD: createEnum(25, 'IA_PD'),
        IAPREFIX: createEnum(26, 'IAPREFIX'),
        NIS_SERVERS: createEnum(27, 'NIS_SERVERS'),
        NISP_SERVERS: createEnum(28, 'NISP_SERVERS'),
        NIS_DOMAIN_NAME: createEnum(29, 'NIS_DOMAIN_NAME'),
        NISP_DOMAIN_NAME: createEnum(30, 'NISP_DOMAIN_NAME'),
        SNTP_SERVERS: createEnum(31, 'SNTP_SERVERS'),
        INFORMATION_REFRESH_TIME: createEnum(32, 'INFORMATION_REFRESH_TIME'),
        BCMCS_SERVER_D: createEnum(33, 'BCMCS_SERVER_D'),
        BCMCS_SERVER_A: createEnum(34, 'BCMCS_SERVER_A'),
        GEOCONF_CIVIC: createEnum(36, 'GEOCONF_CIVIC'),
        REMOTE_ID: createEnum(37, 'REMOTE_ID'),
        SUBSCRIBER_ID: createEnum(38, 'SUBSCRIBER_ID'),
        CLIENT_FQDN: createEnum(39, 'CLIENT_FQDN'),
        PANA_AGENT: createEnum(40, 'PANA_AGENT'),
        NEW_POSIX_TIMEZONE: createEnum(41, 'NEW_POSIX_TIMEZONE'),
        NEW_TZDB_TIMEZONE: createEnum(42, 'NEW_TZDB_TIMEZONE'),
        ERO: createEnum(43, 'ERO'),
        LQ_QUERY: createEnum(44, 'LQ_QUERY'),
        CLIENT_DATA: createEnum(45, 'CLIENT_DATA'),
        CLT_TIME: createEnum(46, 'CLT_TIME'),
        LQ_RELAY_DATA: createEnum(47, 'LQ_RELAY_DATA'),
        LQ_CLIENT_LINK: createEnum(48, 'LQ_CLIENT_LINK'),
        MIP6_HNIDF: createEnum(49, 'MIP6_HNIDF'),
        MIP6_VDINF: createEnum(50, 'MIP6_VDINF'),
        V6_LOST: createEnum(51, 'V6_LOST'),
        CAPWAP_AC_V6: createEnum(52, 'CAPWAP_AC_V6'),
        RELAY_ID: createEnum(53, 'RELAY_ID'),
        IPv6AddressMoS: createEnum(54, 'IPv6AddressMoS'),
        IPv6FQDNMoS: createEnum(55, 'IPv6FQDNMoS'),
        NTP_SERVER: createEnum(56, 'NTP_SERVER'),
        V6_ACCESS_DOMAIN: createEnum(57, 'V6_ACCESS_DOMAIN'),
        SIP_UA_CS_LIST: createEnum(58, 'SIP_UA_CS_LIST'),
        BOOTFILE_URL: createEnum(59, 'BOOTFILE_URL'),

        CLIENT_LINKLAYER_ADDR: createEnum(79, 'CLIENT_LINKLAYER_ADDR'),

        get: function(value) {
            for (key in this) {
                var obj = this[key];
                if (obj == value)
                    return obj;
            }
            return undefined;
        }
    })

}
