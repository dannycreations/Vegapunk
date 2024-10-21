// https://stackoverflow.com/a/17871737
// https://gist.github.com/syzdek/6086792
export const IPv4Regex: RegExp = /(?:(?:25[0-5]|2[0-4]\d|1?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|1?\d\d?)/g
export const IPv6Regex: RegExp =
	/(?:[\da-f]{0,4}:){2,7}(?:(?<ipv4>(?:(?:25[0-5]|2[0-4]\d|1?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|1?\d\d?))|[\da-f]{0,4}|:)/gi
