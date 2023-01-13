const DeviceDetector = require("node-device-detector");

export const getIdentifier = (headers, userId) => {
  const detector = new DeviceDetector({
    clientIndexes: true,
    deviceIndexes: true,
    deviceAliasCode: false,
  });
  const { os, device, client } = detector.detect(headers["user-agent"]);
  return {
    identifier: `${userId}${device?.type || ""}${device?.brand || ""}${
      os?.name || ""
    }${client.name} || ""`,
    os_name: os?.name || "",
    device_type: device?.type || "",
    browser: client.name,
    location: headers["x-coords"],
  };
};
